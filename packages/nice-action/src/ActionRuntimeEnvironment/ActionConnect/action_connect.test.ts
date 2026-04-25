/**
 * Unit tests for ActionConnect.
 *
 * ActionConnect is a pure transport router — it has no local execution.
 * Tests verify:
 *  - dispatch → transport.send → onMessage response → correlation resolves
 *  - Request timeout
 *  - HTTP fallback when WS transport is absent/disconnected
 *  - No transport → reject immediately
 *  - disconnect() clears pending requests
 *  - routeDomain: all domain actions forwarded via transport
 *  - routeAction: specific action overrides domain-wide route with a different transport
 *  - routeActionIds: multiple actions share a route
 *  - onMessage only processes response wires (primed wires ignored)
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
      ping: action()
        .input({ schema: v.object({ n: v.number() }) })
        .output({ schema: v.object({ pong: v.number() }) }),
    },
  });
}

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

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);
    void ac.dispatchAction(primed);

    expect(transport.send).toHaveBeenCalledOnce();
    const wire = JSON.parse(transport.send.mock.calls[0][0] as string);
    expect(wire.id).toBe("echo");
    expect(wire.domain).toBe("test_domain");
  });

  it("resolves with output when matching response arrives via onMessage", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "world" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);
    const dispatchPromise = ac.dispatchAction(primed);

    await ac.onMessage(primed.setResponse({ echoed: "world" }).toJsonString());

    const response = await dispatchPromise;
    expect(response.result).toEqual({ ok: true, output: { echoed: "world" } });
  });

  it("multiple concurrent dispatches resolve independently by cuid", async () => {
    const dom = makeTestDomain();
    const a = new NiceActionPrimed(dom.action("echo"), { text: "a" });
    const b = new NiceActionPrimed(dom.action("echo"), { text: "b" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);
    const pa = ac.dispatchAction(a);
    const pb = ac.dispatchAction(b);

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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("rejects with a timeout error when no response arrives within requestTimeout", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect({ requestTimeout: 5_000 })
      .attachTransport(transport)
      .routeDomain(dom);
    const p = ac.dispatchAction(primed);

    vi.runAllTimers();
    await expect(p).rejects.toThrow(/timed out after 5000ms/i);
  });
});

// ---------------------------------------------------------------------------
// 3. HTTP transport (fallback when no WS connected)
// ---------------------------------------------------------------------------

describe("dispatch — HTTP transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls fetch POST when attached HTTP transport and no connected WS", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "fetched" });
    const responseWire = primed.setResponse({ echoed: "fetched" }).toJsonObject();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => responseWire }));

    const ac = new ActionConnect()
      .attachTransport({ url: "http://test.local/api" })
      .routeDomain(dom);

    const response = await ac.dispatchAction(primed);
    expect(response.result).toEqual({ ok: true, output: { echoed: "fetched" } });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://test.local/api");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("rejects when no transport attached", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });

    const ac = new ActionConnect().routeDomain(dom);
    await expect(ac.dispatchAction(primed)).rejects.toThrow(/no connected transport/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Disconnect
// ---------------------------------------------------------------------------

describe("disconnect", () => {
  it("rejects all pending dispatches", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);
    const p = ac.dispatchAction(primed);

    ac.disconnect();
    await expect(p).rejects.toThrow(/disconnected/i);
  });
});

// ---------------------------------------------------------------------------
// 5. routeDomain — all actions in a domain go via the default transport
// ---------------------------------------------------------------------------

describe("routeDomain", () => {
  it("registers all domain actions to the default transport", async () => {
    const dom = makeTestDomain();
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);

    const echoKeys = ac.allHandlerKeys.filter((k) => k.includes("test_domain"));
    expect(echoKeys).toContain("_::test_domain::_");

    void ac.dispatchAction(new NiceActionPrimed(dom.action("echo"), { text: "a" }));
    void ac.dispatchAction(new NiceActionPrimed(dom.action("ping"), { n: 1 }));

    expect(transport.send).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 6. routeAction — specific action overrides domain-wide route
// ---------------------------------------------------------------------------

describe("routeAction — per-action transport override", () => {
  it("routes the specific action to the named transport, others use domain default", async () => {
    const dom = makeTestDomain();
    const defaultTransport = makeMockTransport(true);
    const edgeTransport = makeMockTransport(true);

    const ac = new ActionConnect()
      .attachTransport(defaultTransport)
      .attachTransport(edgeTransport, { key: "edge" })
      .routeDomain(dom)
      .routeAction(dom, "ping", { transportKey: "edge" });

    void ac.dispatchAction(new NiceActionPrimed(dom.action("echo"), { text: "x" }));
    void ac.dispatchAction(new NiceActionPrimed(dom.action("ping"), { n: 42 }));

    expect(defaultTransport.send).toHaveBeenCalledOnce();
    expect(edgeTransport.send).toHaveBeenCalledOnce();

    const pingWire = JSON.parse(edgeTransport.send.mock.calls[0][0] as string);
    expect(pingWire.id).toBe("ping");
  });
});

// ---------------------------------------------------------------------------
// 7. routeActionIds — multiple actions share a route
// ---------------------------------------------------------------------------

describe("routeActionIds", () => {
  it("registers all listed actions to the named transport", async () => {
    const dom = makeTestDomain();
    const defaultTransport = makeMockTransport(true);
    const edgeTransport = makeMockTransport(true);

    const ac = new ActionConnect()
      .attachTransport(defaultTransport)
      .attachTransport(edgeTransport, { key: "edge" })
      .routeActionIds(dom, ["echo", "ping"], { transportKey: "edge" });

    void ac.dispatchAction(new NiceActionPrimed(dom.action("echo"), { text: "a" }));
    void ac.dispatchAction(new NiceActionPrimed(dom.action("ping"), { n: 1 }));

    expect(edgeTransport.send).toHaveBeenCalledTimes(2);
    expect(defaultTransport.send).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. onMessage — only processes response wires
// ---------------------------------------------------------------------------

describe("onMessage — only handles response wires", () => {
  it("resolves a pending dispatch from a response wire", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "hi" });
    const transport = makeMockTransport(true);

    const ac = new ActionConnect().attachTransport(transport).routeDomain(dom);
    const p = ac.dispatchAction(primed);

    await ac.onMessage(primed.setResponse({ echoed: "hi" }).toJsonString());
    expect((await p).result).toEqual({ ok: true, output: { echoed: "hi" } });
  });

  it("silently ignores a primed action wire", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "ignored" });

    const ac = new ActionConnect();
    await expect(ac.onMessage(primed.toJsonString())).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("silently ignores malformed JSON", async () => {
    const ac = new ActionConnect();
    await expect(ac.onMessage("not json {{{")).resolves.toBeUndefined();
  });

  it("silently ignores a response for an unknown cuid", async () => {
    const dom = makeTestDomain();
    const primed = new NiceActionPrimed(dom.action("echo"), { text: "x" });
    const responseWire = { ...primed.setResponse({ echoed: "x" }).toJsonObject(), cuid: "ghost" };

    const ac = new ActionConnect();
    await expect(ac.onMessage(JSON.stringify(responseWire))).resolves.toBeUndefined();
  });

  it("silently ignores unrecognised message shapes", async () => {
    const ac = new ActionConnect();
    await expect(ac.onMessage(JSON.stringify({ random: "data" }))).resolves.toBeUndefined();
  });
});
