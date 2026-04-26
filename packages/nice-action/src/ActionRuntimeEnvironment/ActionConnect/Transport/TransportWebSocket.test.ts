import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../../../ActionDomain/helpers/createRootActionDomain";
import { action } from "../../../ActionSchema/action";
import { ETransportStatus, ETransportType } from "./Transport.types";
import { TransportWebSocket } from "./TransportWebSocket";

let _n = 0;
function makeDomain() {
  const n = ++_n;
  const root = createActionRootDomain({ domain: `ws_root_${n}` });
  const domain = root.createChildDomain({
    domain: `ws_dom_${n}`,
    actions: {
      run: action()
        .input({ schema: v.object({ x: v.number() }) })
        .output({ schema: v.object({ result: v.number() }) }),
    },
  });
  return { domain };
}

function makeMockWs() {
  const _ls: Record<string, ((...a: any[]) => void)[]> = {};
  return {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener(ev: string, h: (...a: any[]) => void) {
      if (_ls[ev] == null) _ls[ev] = [];
      _ls[ev].push(h);
    },
    $open: () => {
      _ls["open"]?.forEach((h) => {
        h({});
      });
    },
    $message: (data: string) => {
      _ls["message"]?.forEach((h) => {
        h({ data });
      });
    },
    $error: (e: object = {}) => {
      _ls["error"]?.forEach((h) => {
        h(e);
      });
    },
    $close: (e: object = {}) => {
      _ls["close"]?.forEach((h) => {
        h(e);
      });
    },
  };
}

describe("TransportWebSocket", () => {
  it("starts uninitialized; checkAndPrepare transitions to initializing and calls createWebSocket once", () => {
    const createWebSocket = vi.fn().mockReturnValue(new Promise(() => {}));
    const t = new TransportWebSocket({ type: ETransportType.ws, createWebSocket });

    expect(t.status.status).toBe(ETransportStatus.uninitialized);

    expect(t.checkAndPrepare().status).toBe(ETransportStatus.initializing);
    expect(createWebSocket).toHaveBeenCalledOnce();

    // Subsequent calls return the same initializing status without re-creating
    t.checkAndPrepare();
    expect(createWebSocket).toHaveBeenCalledOnce();
  });

  it("waitForInitialization resolves with ready when WebSocket opens", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing) throw new Error("expected initializing");

    await Promise.resolve(); // createWebSocket resolves, listeners attach
    ws.$open();

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.ready);
    expect(t.status.status).toBe(ETransportStatus.ready);
  });

  it("waitForInitialization resolves with failed when createWebSocket rejects", async () => {
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.reject(new Error("refused")),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing) throw new Error("expected initializing");

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.failed);
    expect(t.status.status).toBe(ETransportStatus.failed);
  });

  it("waitForInitialization resolves with failed when WebSocket errors before opening", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing) throw new Error("expected initializing");

    await Promise.resolve(); // listeners attach
    ws.$error();

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.failed);
  });

  it("unexpected close after ready sets status to failed", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();
    expect(t.status.status).toBe(ETransportStatus.ready);

    ws.$close();
    expect(t.status.status).toBe(ETransportStatus.failed);
  });

  it("disconnect sets status to uninitialized, rejects pending requests, and closes the socket", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    const p = t.makeRequest(primed, 5_000);
    t.disconnect();

    expect(t.status.status).toBe(ETransportStatus.uninitialized);
    expect(ws.close).toHaveBeenCalledOnce();
    await expect(p).rejects.toThrow(/websocket/i);
  });

  it("close event after disconnect does not change status from uninitialized", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    t.disconnect();
    ws.$close(); // fires after ws.close() in real environments

    expect(t.status.status).toBe(ETransportStatus.uninitialized);
  });

  it("incoming message with matching cuid resolves the pending makeRequest", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 7 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    const p = t.makeRequest(primed, 5_000);
    await Promise.resolve(); // let send() execute

    ws.$message(
      JSON.stringify({
        ...primed.toJsonObject(),
        type: "resolved",
        ok: true,
        output: { result: 21 },
        timeResponded: Date.now(),
      }),
    );

    const response = await p;
    expect(response.result.ok).toBe(true);
    if (response.result.ok) expect(response.result.output).toEqual({ result: 21 });
  });

  it("send forwards the primed JSON string to the WebSocket", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 3 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    t.makeRequest(primed, 5_000).catch(() => {});
    await Promise.resolve();

    expect(ws.send).toHaveBeenCalledWith(primed.toJsonString());
  });
});
