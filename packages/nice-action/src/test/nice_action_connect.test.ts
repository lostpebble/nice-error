import * as v from "valibot";
import { afterEach, describe, expect, it, vi } from "vitest";
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

// Echoes back the request body with a transformed output — cuid always matches
function echoFetch(transform: (input: any) => any) {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return {
      ok: true,
      json: () =>
        Promise.resolve({
          ...body,
          type: "resolved",
          ok: true,
          output: transform(body.input),
          timeResponded: Date.now(),
        }),
    };
  });
}

// ── TransportHttp ─────────────────────────────────────────────────────────────

describe("TransportHttp", () => {
  afterEach(() => vi.unstubAllGlobals());

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
      createWebSocket: () => new Promise(() => {}),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
      createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
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
});

// ── ConnectionConfig ──────────────────────────────────────────────────────────

describe("ConnectionConfig — transport selection", () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it("dispatch throws transport_not_found when no transport is ready", () => {
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 5 });

    const cfg = new ConnectionConfig({
      transports: [{ type: ETransportType.ws, createWebSocket: () => new Promise(() => {}) }],
    });

    expect(() => cfg.dispatch(primed, 5_000)).toThrow(/transport/i);
  });

  it("disconnect closes established WebSocket connections", async () => {
    const ws = makeMockWs();
    const { domain } = makeDomain();
    const primed = domain.action("run").prime({ x: 1 });

    const cfg = new ConnectionConfig({
      transports: [
        {
          type: ETransportType.ws,
          createWebSocket: () => Promise.resolve(ws as unknown as WebSocket),
        },
      ],
    });

    // Trigger WS init; throws transport_not_found (WS is still initializing), that's expected
    try {
      cfg.dispatch(primed, 5_000);
    } catch (_) {
      // ignore
    }
    await Promise.resolve();
    ws.$open(); // WS becomes ready

    cfg.disconnect();
    expect(ws.close).toHaveBeenCalledOnce();
  });
});

// ── ActionConnect — routing and dispatch ──────────────────────────────────────

describe("ActionConnect", () => {
  afterEach(() => vi.unstubAllGlobals());

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

    const createWebSocket = vi.fn().mockResolvedValue(ws as unknown as WebSocket);
    const conn = new ActionConnect(
      [new ConnectionConfig({ transports: [{ type: ETransportType.ws, createWebSocket }] })],
      { tag: "remote" },
    );
    conn.routeDomain(domain);
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test_ws" }).addHandlers([conn]));

    // First dispatch: WS initializes in background but isn't ready yet → fails
    const firstResult = await domain.action("run").executeSafe({ x: 1 }, { tag: "remote" });
    expect(firstResult.ok).toBe(false); // transport_not_found

    // By now createWebSocket has resolved (multiple async ticks have passed)
    ws.$open(); // WS becomes ready

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

    const secondResult = await domain.action("run").executeSafe({ x: 5 }, { tag: "remote" });
    expect(secondResult.ok).toBe(true);
    if (secondResult.ok) {
      expect(secondResult.output).toEqual({ result: 10 });
    }
  });
});
