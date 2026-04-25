/**
 * Unit tests for ActionConnect.
 *
 * Uses mock transports and real domain/handler instances to verify:
 *  - dispatch → transport.send → onMessage response → correlation resolves
 *  - Request timeout
 *  - HTTP fallback when WS transport is absent/disconnected
 *  - No transport → reject immediately
 *  - disconnect() clears pending requests
 *  - onMessage: primed action routed to forAction handler, reply via replyTransport
 *  - onMessage: primed action routed to forAction handler (reverse direction)
 *  - proxyDomain: all domain actions forwarded via transport
 *  - Targeted transport routing via transportKey
 *  - Edge cases: malformed JSON, unknown cuid, unknown message type
 */

import * as v from "valibot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
import { action } from "../../ActionSchema/action";
import { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { ActionConnect } from "./ActionConnect";

// ---------------------------------------------------------------------------
// Shared test domain
// ---------------------------------------------------------------------------

function makeTestDomain() {
  const root = createActionRootDomain({ domain: "test_root" });
  return root.createChildDomain({
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

    const ac = new ActionConnect().attachTransport(transport);
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

    const ac = new ActionConnect().attachTransport(transport);
    const dispatchPromise = ac.dispatch(primed);

    await ac.onMessage(primed.setResponse({ echoed: "world" }).toJsonString());

    const response = await dispatchPromise;
    expect(response.result).toEqual({ ok: true, output: { echoed: "world" } });
  });

  it("multiple concurrent dispatches resolve independently by cuid", async () => {
    const dom = makeTestDomain();
    const a = new NiceActionPrimed(dom.action("echo"), { text: "a" });
    const b = new NiceActionPrimed(dom.action("echo"), { text: "b" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport);
    const pa = ac.dispatch(a);
    const pb = ac.dispatch(b);

    // Resolve in reverse order to verify independence
    await ac.onMessage(b.setResponse({ echoed: "b" }).toJsonString());
    await ac.onMessage(a.setResponse({ echoed: "a" }).toJsonString());

    expect((await pa).result).toEqual({ ok: true, output: { echoed: "a" } });
    expect((await pb).result).toEqual({ ok: true, output: { echoed: "b" } });
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

    const ac = new ActionConnect({ requestTimeout: 5_000 }).attachTransport(transport);
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
    const responseWire = primed.setResponse({ echoed: "fetched" }).toJsonObject();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => responseWire }));

    const ac = new ActionConnect({
      httpFallbackUrl: "http://test.local/api",
      enableHttpFallback: true,
    });

    const response = await ac.dispatch(primed);
    expect(response.result).toEqual({ ok: true, output: { echoed: "fetched" } });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test.local/api");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("rejects when no transport and no HTTP fallback configured", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });

    const ac = new ActionConnect({ enableHttpFallback: false });

    await expect(ac.dispatch(primed)).rejects.toThrow(/no connected transport/i);
  });

  it("rejects immediately when no transport and HTTP fallback not configured", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });

    const ac = new ActionConnect();
    await expect(ac.dispatch(primed)).rejects.toThrow(/no connected transport/i);
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

    const ac = new ActionConnect().attachTransport(transport);
    const p = ac.dispatch(primed);

    ac.disconnect();
    await expect(p).rejects.toThrow(/disconnected/i);
  });
});

// ---------------------------------------------------------------------------
// 5. onMessage — forAction handler dispatch (server-side execution)
// ---------------------------------------------------------------------------

describe("onMessage — forAction handler dispatch", () => {
  it("routes primed action to registered handler and sends reply via replyTransport", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect()
      .forAction(dom, "echo", {
        execution: (primed) => primed.setResponse({ echoed: primed.input.text }),
      })
      .forAction(dom, "boom", {
        execution: () => {
          throw new Error("boom");
        },
      });

    const replyTransport = makeMockTransport();

    const primed = new NiceActionPrimed(dom.action("echo"), { text: "ping" });
    await ac.onMessage(JSON.stringify(primed.toJsonObject()), { replyTransport });

    expect(replyTransport.send).toHaveBeenCalledOnce();
    const reply = JSON.parse(replyTransport.send.mock.calls[0][0] as string);
    expect(reply.ok).toBe(true);
    expect(reply.output).toEqual({ echoed: "ping" });
  });

  it("sends ok:false reply when handler throws", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect()
      .forAction(dom, "echo", {
        execution: (primed) => primed.setResponse({ echoed: primed.input.text }),
      })
      .forAction(dom, "boom", {
        execution: () => {
          throw new Error("something broke");
        },
      });

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
    const ac = new ActionConnect().attachTransport(defaultTransport).forAction(dom, "echo", {
      execution: (primed) => primed.setResponse({ echoed: primed.input.text }),
    });

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

describe("onMessage — forAction handler dispatch (client-side)", () => {
  it("routes primed action to registered forAction handler and sends reply", async () => {
    const dom = makeTestDomain();

    const ac = new ActionConnect().forAction(dom, "echo", {
      execution: (primed) => primed.setResponse({ echoed: `client:${primed.input.text}` }),
    });

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
// 7. proxyDomain — forwards all domain actions via transport
// ---------------------------------------------------------------------------

describe("proxyDomain", () => {
  it("forwards all domain actions to transport when no local handler matches", async () => {
    const dom = makeTestDomain();
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).proxyDomain(dom);

    const primed = new NiceActionPrimed(dom.action("echo"), { text: "proxy" });
    void ac.dispatchAction(primed);

    expect(transport.send).toHaveBeenCalledOnce();
    const wire = JSON.parse(transport.send.mock.calls[0][0] as string);
    expect(wire.id).toBe("echo");
  });
});

// ---------------------------------------------------------------------------
// 8. Targeted transport routing via transportKey
// ---------------------------------------------------------------------------

describe("dispatch — targeted transport routing", () => {
  it("routes to the named transport when transportKey is provided", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "env" });

    const defaultTransport = makeMockTransport(true);
    const edgeTransport = makeMockTransport(true);

    const ac = new ActionConnect()
      .attachTransport(defaultTransport)
      .attachTransport(edgeTransport, { key: "edge" });

    void ac.dispatch(primed, { transportKey: "edge" });

    expect(edgeTransport.send).toHaveBeenCalledOnce();
    expect(defaultTransport.send).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 9. Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("silently ignores malformed JSON in onMessage", async () => {
    const ac = new ActionConnect();
    await expect(ac.onMessage("not json at all {{{")).resolves.toBeUndefined();
  });

  it("silently ignores a response for an unknown cuid", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const responseWire = {
      ...primed.setResponse({ echoed: "x" }).toJsonObject(),
      cuid: "ghost-cuid",
    };

    const ac = new ActionConnect();
    await expect(ac.onMessage(JSON.stringify(responseWire))).resolves.toBeUndefined();
  });

  it("silently ignores a message that is neither primed nor response", async () => {
    const ac = new ActionConnect();
    await expect(ac.onMessage(JSON.stringify({ random: "data" }))).resolves.toBeUndefined();
  });
});
