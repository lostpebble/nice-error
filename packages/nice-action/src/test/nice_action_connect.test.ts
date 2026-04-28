import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { echoFetch, makeMockWs } from "#test/helpers/transport";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionConnect } from "../ActionRuntimeEnvironment/ActionConnect/ActionConnect";
import { ConnectionConfig } from "../ActionRuntimeEnvironment/ActionConnect/ConnectionConfig/ConnectionConfig";
import {
  ETransportStatus,
  ETransportType,
} from "../ActionRuntimeEnvironment/ActionConnect/Transport/Transport.types";
import { TransportHttp } from "../ActionRuntimeEnvironment/ActionConnect/Transport/TransportHttp";
import { TransportWebSocket } from "../ActionRuntimeEnvironment/ActionConnect/Transport/TransportWebSocket";
import { createActionRuntime } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../ActionSchema/action";

// ── helpers ───────────────────────────────────────────────────────────────────

let _n = 0;

function makeDomain() {
  const n = ++_n;
  const root = createActionRootDomain({ domain: `con_root_${n}` });
  const domain = root.createChildDomain({
    domain: `con_dom_${n}`,
    actions: {
      run: action()
        .input({ schema: v.object({ x: v.number() }) })
        .output({ schema: v.object({ result: v.number() }) }),
    },
  });
  return { root, domain };
}

// ── TransportHttp ─────────────────────────────────────────────────────────────

describe("TransportHttp", () => {
  it("starts with ready status", () => {
    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    expect(t.status.status).toBe(ETransportStatus.ready);
  });

  it("checkAndPrepare returns ready", () => {
    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    expect(t.checkAndPrepare().status).toBe(ETransportStatus.ready);
  });

  it("makeRequest sends POST with Content-Type header to the configured URL", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const fetchMock = echoFetch((input) => ({ result: input.x }));
    vi.stubGlobal("fetch", fetchMock);

    const t = new TransportHttp({ type: ETransportType.http, url: "http://api/actions" });
    await t.makeRequest(primed, 5_000);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api/actions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      }),
    );
  });

  it("makeRequest resolves with the success output from the server", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    vi.stubGlobal(
      "fetch",
      echoFetch((input) => ({ result: input.x * 2 })),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    const response = await t.makeRequest(primed, 5_000);

    expect(response.result.ok).toBe(true);
    if (response.result.ok) {
      expect(response.result.output).toEqual({ result: 10 });
    }
  });

  it("makeRequest rejects with transport_send_failed when non-ok HTTP body is unparseable", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("bad json")),
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    await expect(t.makeRequest(primed, 5_000)).rejects.toThrow(/failed to send/i);
  });

  it("makeRequest rejects with transport_invalid_action_response when response shape is wrong", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ unexpected: "shape" }),
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    await expect(t.makeRequest(primed, 5_000)).rejects.toThrow(/invalid action response/i);
  });

  it("makeRequest rejects with transport_timeout when the timeout expires", async () => {
    vi.useFakeTimers();
    try {
      const { domain } = makeDomain();
      const primed = domain.action("run").prime({ x: 5 });

      vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

      const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
      const p = t.makeRequest(primed, 1_000);

      vi.advanceTimersByTime(1_001);
      await expect(p).rejects.toThrow(/timed out/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("disconnect aborts the in-flight fetch via its AbortController", () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedSignal = init.signal as AbortSignal;
        return new Promise(() => {});
      }),
    );

    const t = new TransportHttp({ type: ETransportType.http, url: "http://test" });
    const p = t.makeRequest(primed, 5_000);
    p.catch(() => {});

    t.disconnect();

    expect(capturedSignal?.aborted).toBe(true);
  });
});

// ── TransportWebSocket ────────────────────────────────────────────────────────

describe("TransportWebSocket", () => {
  it("starts with uninitialized status", () => {
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () =>
        new Promise(() => ({
          ws: {},
        })),
    });
    expect(t.status.status).toBe(ETransportStatus.uninitialized);
  });

  it("checkAndPrepare returns initializing on first call and triggers createWebSocket", () => {
    const createWebSocket = vi.fn().mockReturnValue(new Promise(() => {}));
    const t = new TransportWebSocket({ type: ETransportType.ws, createWebSocket });

    expect(t.checkAndPrepare().status).toBe(ETransportStatus.initializing);
    expect(createWebSocket).toHaveBeenCalledOnce();
  });

  it("subsequent checkAndPrepare calls do not re-trigger createWebSocket", async () => {
    const createWebSocket = vi.fn().mockReturnValue(new Promise(() => {}));
    const t = new TransportWebSocket({ type: ETransportType.ws, createWebSocket });

    t.checkAndPrepare();
    t.checkAndPrepare();
    await Promise.resolve();

    expect(createWebSocket).toHaveBeenCalledOnce();
  });

  it("status becomes ready when WebSocket open event fires", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();

    ws.$open();
    expect(t.status.status).toBe(ETransportStatus.ready);
  });

  it("status becomes failed when WebSocket emits error", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();
    ws.$error();

    expect(t.status.status).toBe(ETransportStatus.failed);
  });

  it("unexpected close sets status to failed", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();
    ws.$close();

    expect(t.status.status).toBe(ETransportStatus.failed);
  });

  it("disconnect sets status to uninitialized and prevents close event from overriding it", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    t.disconnect();
    expect(t.status.status).toBe(ETransportStatus.uninitialized);

    // close event fires asynchronously after ws.close() — must not flip status to failed
    ws.$close();
    expect(t.status.status).toBe(ETransportStatus.uninitialized);
  });

  it("error event rejects all pending requests", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    const p = t.makeRequest(primed, 5_000);
    ws.$error();

    await expect(p).rejects.toThrow(/websocket/i);
  });

  it("incoming message with matching cuid resolves the pending request", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
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
        output: { result: 99 },
        timeResponded: Date.now(),
      }),
    );

    const response = await p;
    expect(response.result.ok).toBe(true);
    if (response.result.ok) {
      expect(response.result.output).toEqual({ result: 99 });
    }
  });

  it("send forwards the primed action JSON string to the WebSocket", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    ws.$open();

    const p = t.makeRequest(primed, 5_000);
    p.catch(() => {});
    await Promise.resolve();

    expect(ws.send).toHaveBeenCalledWith(primed.toJsonString());
  });

  it("status becomes failed when createWebSocket rejects", async () => {
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.reject(new Error("network error")),
    });

    t.checkAndPrepare();
    await Promise.resolve();
    await Promise.resolve();

    expect(t.status.status).toBe(ETransportStatus.failed);
  });

  it("waitForInitialization resolves with ready status when WebSocket opens", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing)
      throw new Error("expected initializing");

    await Promise.resolve(); // createWebSocket resolves, event listeners attach
    ws.$open();

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.ready);
    expect(info.transport).toBe(t);
  });

  it("waitForInitialization resolves with failed status when createWebSocket rejects", async () => {
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.reject(new Error("connection refused")),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing)
      throw new Error("expected initializing");

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.failed);
  });

  it("waitForInitialization resolves with failed status when WebSocket errors before opening", async () => {
    const ws = makeMockWs();
    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    const statusInfo = t.checkAndPrepare();
    if (statusInfo.status !== ETransportStatus.initializing)
      throw new Error("expected initializing");

    await Promise.resolve(); // event listeners attach
    ws.$error();

    const info = await statusInfo.waitForInitialization;
    expect(info.newStatus.status).toBe(ETransportStatus.failed);
  });

  it("disconnect rejects all pending requests immediately", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const t = new TransportWebSocket({
      type: ETransportType.ws,
      createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
    });

    t.checkAndPrepare();
    await Promise.resolve(); // event listeners attach
    ws.$open();

    const p = t.makeRequest(primed, 5_000);
    t.disconnect();

    await expect(p).rejects.toThrow(/websocket/i);
  });
});

// ── ConnectionConfig ──────────────────────────────────────────────────────────

describe("ConnectionConfig — transport selection", () => {
  it("connected is false when only WS transports are present and uninitialized", () => {
    const cfg = new ConnectionConfig({
      transports: [{ type: ETransportType.ws, createWebSocket: () => new Promise(() => {}) }],
    });
    expect(cfg.connected).toBe(false);
  });

  it("connected is true when an HTTP transport is present", () => {
    const cfg = new ConnectionConfig({
      transports: [{ type: ETransportType.http, url: "http://test" }],
    });
    expect(cfg.connected).toBe(true);
  });

  it("dispatch uses the first ready transport in declaration order", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const fetchMock = echoFetch((i) => ({ result: i.x }));
    vi.stubGlobal("fetch", fetchMock);

    const cfg = new ConnectionConfig({
      transports: [
        { type: ETransportType.http, url: "http://first" },
        { type: ETransportType.http, url: "http://second" },
      ],
    });

    await cfg.dispatch(primed, 5_000);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("http://first", expect.anything());
  });

  it("dispatch self-initializes uninitialized WS and falls through to the next ready transport", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const createWebSocket = vi.fn().mockReturnValue(new Promise(() => {})); // WS never opens
    const fetchMock = echoFetch((i) => ({ result: i.x }));
    vi.stubGlobal("fetch", fetchMock);

    const cfg = new ConnectionConfig({
      transports: [
        { type: ETransportType.ws, createWebSocket }, // first: triggers init, skipped (initializing)
        { type: ETransportType.http, url: "http://fallback" }, // second: used
      ],
    });

    await cfg.dispatch(primed, 5_000);

    expect(createWebSocket).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith("http://fallback", expect.anything());
  });

  it("dispatch uses the first initializing transport to become ready (first-ready-wins)", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const ws1 = makeMockWs(); // opens second — should NOT be used
    const ws2 = makeMockWs(); // opens first — should be used

    ws2.send.mockImplementation((data: string) => {
      const body = JSON.parse(data);
      Promise.resolve().then(() => {
        ws2.$message(
          JSON.stringify({
            ...body,
            type: "resolved",
            ok: true,
            output: { result: body.input.x },
            timeResponded: Date.now(),
          }),
        );
      });
    });

    const cfg = new ConnectionConfig({
      transports: [
        {
          type: ETransportType.ws,
          createWebSocket: () => Promise.resolve({ ws: ws1 as unknown as WebSocket }),
        },
        {
          type: ETransportType.ws,
          createWebSocket: () => Promise.resolve({ ws: ws2 as unknown as WebSocket }),
        },
      ],
    });

    const dispatchPromise = cfg.dispatch(primed, 5_000);
    await Promise.resolve(); // both WS listeners attach
    ws2.$open(); // second WS opens first

    await dispatchPromise;

    expect(ws2.send).toHaveBeenCalledOnce();
    expect(ws1.send).not.toHaveBeenCalled();
  });

  it("dispatch awaits initializing transports and throws when all fail", async () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const cfg = new ConnectionConfig({
      transports: [
        { type: ETransportType.ws, createWebSocket: () => Promise.reject(new Error("failed")) },
      ],
    });

    await expect(cfg.dispatch(primed, 5_000)).rejects.toThrow(/transport/i);
  });

  it("disconnect closes established WebSocket connections", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });

    const cfg = new ConnectionConfig({
      transports: [
        {
          type: ETransportType.ws,
          createWebSocket: () => Promise.resolve({ ws: ws as unknown as WebSocket }),
        },
      ],
    });

    // Trigger WS init — dispatch awaits initialization then makeRequest
    cfg.dispatch(primed, 5_000).catch(() => {});
    await Promise.resolve(); // createWebSocket resolves, event listeners attach
    ws.$open(); // WS becomes ready → waitForInitialization resolves
    await Promise.resolve(); // dispatch resumes, makeRequest starts

    cfg.disconnect();
    expect(ws.close).toHaveBeenCalledOnce();
  });
});

// ── ActionConnect — routing and dispatch ──────────────────────────────────────

describe("ActionConnect", () => {
  it("allHandlerKeys includes tag::domain::_ after routeDomain", () => {
    const { domain } = makeDomain();
    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.http, url: "http://test" }] })],
      { tag: "remote" },
    );
    conn.routeDomain(domain);
    expect(conn.allHandlerKeys).toContain(`remote::${domain.domain}::_`);
  });

  it("allHandlerKeys includes tag::domain::id after routeAction", () => {
    const { domain } = makeDomain();
    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.http, url: "http://test" }] })],
      { tag: "remote" },
    );
    conn.routeAction(domain, "run");
    expect(conn.allHandlerKeys).toContain(`remote::${domain.domain}::run`);
  });

  it("dispatches an action via the HTTP transport and resolves the output", async () => {
    const { root, domain } = makeDomain();

    vi.stubGlobal(
      "fetch",
      echoFetch((i) => ({ result: i.x * 2 })),
    );

    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.http, url: "http://api" }] })],
      { tag: "remote" },
    );
    conn.routeDomain(domain);
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test_connect" }).addHandlers([conn]));

    const result = await domain.action("run").execute({ x: 7 }, { tag: "remote" });
    expect(result).toEqual({ result: 14 });
  });

  it("onResponse callback fires with the resolved response", async () => {
    const { root, domain } = makeDomain();

    vi.stubGlobal(
      "fetch",
      echoFetch((i) => ({ result: i.x })),
    );

    const onResponse = vi.fn();
    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.http, url: "http://api" }] })],
      { tag: "remote" },
    );
    conn.routeDomain(domain, { onResponse });
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test_on_response" }).addHandlers([conn]),
    );

    await domain.action("run").execute({ x: 3 }, { tag: "remote" });

    expect(onResponse).toHaveBeenCalledOnce();
    const [response] = onResponse.mock.calls[0];
    expect(response.result.ok).toBe(true);
  });

  it("routeAction dispatches only the registered action", async () => {
    const n = ++_n;
    const root = createActionRootDomain({ domain: `con_root_${n}` });
    const domain = root.createChildDomain({
      domain: `con_dom_${n}`,
      actions: {
        run: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ result: v.number() }) }),
        other: action()
          .input({ schema: v.object({ y: v.number() }) })
          .output({ schema: v.object({ result: v.number() }) }),
      },
    });

    vi.stubGlobal(
      "fetch",
      echoFetch((i) => ({ result: (i.x ?? i.y) * 3 })),
    );

    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.http, url: "http://api" }] })],
      { tag: "remote" },
    );
    conn.routeAction(domain, "run");
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test_route_action" }).addHandlers([conn]),
    );

    const result = await domain.action("run").execute({ x: 4 }, { tag: "remote" });
    expect(result).toEqual({ result: 12 });
  });

  it("dispatches via WebSocket once it becomes ready", async () => {
    const ws = makeMockWs();
    const { root, domain } = makeDomain();

    const createWebSocket = vi.fn().mockResolvedValue({ ws: ws as unknown as WebSocket });
    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.ws, createWebSocket }] })],
      { tag: "remote" },
    );
    conn.routeDomain(domain);
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test_ws" }).addHandlers([conn]));

    // Auto-respond to outgoing WS messages by echoing back the request with doubled output
    ws.send.mockImplementation((data: string) => {
      const body = JSON.parse(data);
      Promise.resolve().then(() => {
        ws.$message(
          JSON.stringify({
            ...body,
            type: "resolved",
            ok: true,
            output: { result: body.input.x * 2 },
            timeResponded: Date.now(),
          }),
        );
      });
    });

    // Dispatch awaits WS initialization — start it, then open the socket
    const dispatchPromise = domain.action("run").executeSafe({ x: 5 }, { tag: "remote" });
    await Promise.resolve(); // createWebSocket resolves, event listeners attach
    ws.$open(); // WS becomes ready → waitForInitialization resolves → dispatch proceeds

    const result = await dispatchPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output).toEqual({ result: 10 });
    }
  });
});
