/**
 * Unit tests for ActionConnect.
 *
 * Uses mock transports and real domain/handler instances to verify:
 *  - Dispatch → transport.send → onMessage response → correlation resolves
 *  - Request timeout
 *  - HTTP fallback when WS transport is absent/disconnected
 *  - Server role rejection when no transport available
 *  - Disconnect clears pending requests
 *  - onMessage: primed action routed to resolver (reply via replyTransport)
 *  - onMessage: primed action routed via forAction handler (reverse direction)
 *  - Environment routing via ncEnv wire field (transport only)
 *  - Edge cases: malformed JSON, unknown cuid, unknown message type
 */

import { action, createActionDomain, NiceActionPrimed } from "@nice-code/action";
import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionConnect } from "../ActionConnect/ActionConnect";
import { EActionConnectRole } from "../ActionConnect/ActionConnect.types";

// ---------------------------------------------------------------------------
// Shared test domain
// ---------------------------------------------------------------------------

function makeTestDomain() {
  return createActionDomain({
    domain: "test_domain",
    actions: {
      echo: action()
        .input({ schema: v.object({ text: v.string() }) })
        .output({ schema: v.object({ echoed: v.string() }) }),
      boom: action()
        .input({ schema: v.object({ msg: v.string() }) })
        .output({ schema: v.object({ never: v.string() }) }),
    },
  });
}

// ---------------------------------------------------------------------------
// Mock transport factory
// ---------------------------------------------------------------------------

function makeMockTransport(connected = true) {
  return { send: vi.fn<(data: string) => void>(), connected };
}

// ---------------------------------------------------------------------------
// 1. Dispatch — correlation over mock transport
// ---------------------------------------------------------------------------

describe("dispatch — response correlation over mock transport", () => {
  it("sends serialized primed wire to transport.send", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "hello" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client }).setTransport(transport);
    void ac.dispatch(primed);

    expect(transport.send).toHaveBeenCalledOnce();
    const sentWire = JSON.parse(transport.send.mock.calls[0][0] as string);
    expect(sentWire.id).toBe("echo");
    expect(sentWire.domain).toBe("test_domain");
  });

  it("resolves with processed output when matching response arrives via onMessage", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "world" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client }).setTransport(transport);
    const dispatchPromise = ac.dispatch(primed);

    const responseWire = primed.setOutput({ echoed: "world" }).toJsonObject();
    await ac.onMessage(JSON.stringify(responseWire));

    const output = await dispatchPromise;
    expect(output).toEqual({ echoed: "world" });
  });

  it("multiple concurrent dispatches resolve independently by cuid", async () => {
    const dom = makeTestDomain();
    const a = new NiceActionPrimed(dom.action("echo"), { text: "a" });
    const b = new NiceActionPrimed(dom.action("echo"), { text: "b" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client }).setTransport(transport);
    const pa = ac.dispatch(a);
    const pb = ac.dispatch(b);

    // Resolve in reverse order to verify independence
    await ac.onMessage(JSON.stringify(b.setOutput({ echoed: "b" }).toJsonObject()));
    await ac.onMessage(JSON.stringify(a.setOutput({ echoed: "a" }).toJsonObject()));

    expect(await pa).toEqual({ echoed: "a" });
    expect(await pb).toEqual({ echoed: "b" });
  });
});

// ---------------------------------------------------------------------------
// 2. Dispatch — timeout
// ---------------------------------------------------------------------------

describe("dispatch — timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects with a timeout error when no response arrives within requestTimeout", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client, requestTimeout: 5_000 }).setTransport(transport);
    const p = ac.dispatch(primed);

    vi.runAllTimers();
    await expect(p).rejects.toThrow(/timed out after 5000ms/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Dispatch — HTTP fallback
// ---------------------------------------------------------------------------

describe("dispatch — HTTP fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch POST when no connected transport is available", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "fetched" });
    const responseWire = primed.setOutput({ echoed: "fetched" }).toJsonObject();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => responseWire }));

    const ac = new ActionConnect({
      role: EActionConnectRole.client,
      httpFallbackUrl: "http://test.local/api",
      enableHttpFallback: true,
    });

    const output = await ac.dispatch(primed);
    expect(output).toEqual({ echoed: "fetched" });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("rejects when no transport and no HTTP fallback configured", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });

    const ac = new ActionConnect({
      role: EActionConnectRole.client,
      enableHttpFallback: false,
    });

    await expect(ac.dispatch(primed)).rejects.toThrow(/no connected transport/i);
  });

  it("rejects immediately for server role with no transport (no HTTP fallback allowed)", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });

    const ac = new ActionConnect({ role: EActionConnectRole.server });
    await expect(ac.dispatch(primed)).rejects.toThrow(
      /server instances do not support HTTP fallback/i,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Disconnect
// ---------------------------------------------------------------------------

describe("disconnect", () => {
  it("rejects all pending dispatches when disconnect() is called", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client }).setTransport(transport);
    const p = ac.dispatch(primed);

    ac.disconnect();
    await expect(p).rejects.toThrow(/disconnected/i);
  });
});

// ---------------------------------------------------------------------------
// 5. onMessage — resolver dispatch
// ---------------------------------------------------------------------------

describe("onMessage — resolver dispatch", () => {
  it("routes primed action to registered resolver and sends reply via replyTransport", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect({ role: EActionConnectRole.server })
      .resolve(dom, "echo", ({ text }) => ({ echoed: text }))
      .resolve(dom, "boom", () => { throw new Error("boom"); });

    const replyTransport = makeMockTransport();

    const primed = new NiceActionPrimed(dom.action("echo"), { text: "ping" });
    await ac.onMessage(JSON.stringify(primed.toJsonObject()), { replyTransport });

    expect(replyTransport.send).toHaveBeenCalledOnce();
    const reply = JSON.parse(replyTransport.send.mock.calls[0][0] as string);
    expect(reply.ok).toBe(true);
    expect(reply.output).toEqual({ echoed: "ping" });
  });

  it("sends ok:false reply when resolver throws", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect({ role: EActionConnectRole.server })
      .resolve(dom, "echo", ({ text }) => ({ echoed: text }))
      .resolve(dom, "boom", () => { throw new Error("something broke"); });

    const replyTransport = makeMockTransport();

    const primed = new NiceActionPrimed(dom.action("boom"), { msg: "x" });
    await ac.onMessage(JSON.stringify(primed.toJsonObject()), { replyTransport });

    expect(replyTransport.send).toHaveBeenCalledOnce();
    const reply = JSON.parse(replyTransport.send.mock.calls[0][0] as string);
    expect(reply.ok).toBe(false);
  });

  it("falls back to default transport for reply when no replyTransport provided", async () => {
    const dom = makeTestDomain();

    const defaultTransport = makeMockTransport();
    const ac = new ActionConnect({ role: EActionConnectRole.server })
      .setTransport(defaultTransport)
      .resolve(dom, "echo", ({ text }) => ({ echoed: text }))
      .resolve(dom, "boom", () => { throw new Error("boom"); });

    const primed = new NiceActionPrimed(dom.action("echo"), { text: "via-default" });
    await ac.onMessage(JSON.stringify(primed.toJsonObject()));

    expect(defaultTransport.send).toHaveBeenCalledOnce();
    const reply = JSON.parse(defaultTransport.send.mock.calls[0][0] as string);
    expect(reply.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. onMessage — forAction handler dispatch (reverse direction: server → client)
// ---------------------------------------------------------------------------

describe("onMessage — forAction handler dispatch", () => {
  it("routes primed action to registered forAction handler and sends reply", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect({ role: EActionConnectRole.client })
      .forAction(dom, "echo", (act) => ({ echoed: `client:${act.input.text}` }));

    const replyTransport = makeMockTransport();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "hi" });
    await ac.onMessage(JSON.stringify(primed.toJsonObject()), { replyTransport });

    expect(replyTransport.send).toHaveBeenCalledOnce();
    const reply = JSON.parse(replyTransport.send.mock.calls[0][0] as string);
    expect(reply.ok).toBe(true);
    expect(reply.output).toEqual({ echoed: "client:hi" });
  });
});

// ---------------------------------------------------------------------------
// 7. Environment routing via ncEnv (transport selection)
// ---------------------------------------------------------------------------

describe("onMessage — environment routing", () => {
  it("dispatch routes to env-specific transport when environment option provided", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "env" });

    const defaultTransport = makeMockTransport(true);
    const edgeTransport = makeMockTransport(true);

    const ac = new ActionConnect({ role: EActionConnectRole.client })
      .setTransport(defaultTransport)
      .setTransport(edgeTransport, { environment: "edge" });

    void ac.dispatch(primed, { environment: "edge" });

    expect(edgeTransport.send).toHaveBeenCalledOnce();
    expect(defaultTransport.send).not.toHaveBeenCalled();

    const wire = JSON.parse(edgeTransport.send.mock.calls[0][0] as string);
    expect(wire.ncEnv).toBe("edge");
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("silently ignores malformed JSON in onMessage", async () => {
    const ac = new ActionConnect({ role: EActionConnectRole.server });
    await expect(ac.onMessage("not json at all {{{")).resolves.toBeUndefined();
  });

  it("silently ignores a response for an unknown cuid", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const responseWire = {
      ...primed.setOutput({ echoed: "x" }).toJsonObject(),
      cuid: "ghost-cuid",
    };

    const ac = new ActionConnect({ role: EActionConnectRole.client });
    await expect(ac.onMessage(JSON.stringify(responseWire))).resolves.toBeUndefined();
  });

  it("silently ignores a message that is neither primed nor response", async () => {
    const ac = new ActionConnect({ role: EActionConnectRole.server });
    await expect(ac.onMessage(JSON.stringify({ random: "data" }))).resolves.toBeUndefined();
  });
});
