import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";

// ---------------------------------------------------------------------------
// 1. Basic domain creation and action execution
// ---------------------------------------------------------------------------

describe("NiceAction — basic domain", () => {
  it("creates a domain, registers a handler, executes an action", async () => {
    const mockFn = vi.fn();

    const domain = createActionDomain({
      domain: "basic",
      schema: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    domain.setActionHandler().forDomain(domain, (act) => {
      const ping = domain.matchAction(act, "ping");
      if (ping) mockFn(ping.input.msg);
    });

    await domain.action("ping").execute({ msg: "hello" });

    expect(mockFn).toHaveBeenCalledWith("hello");
  });

  it("returns a value from the handler via output schema", async () => {
    const greetDomain = createActionDomain({
      domain: "greet",
      schema: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    greetDomain.setActionHandler().forDomain(greetDomain, (act) => {
      const greet = greetDomain.matchAction(act, "greet");
      if (greet) return { greeting: `Hello, ${greet.input.name}!` };
    });

    const result = await greetDomain.action("greet").execute({ name: "World" });
    expect(result).toEqual({ greeting: "Hello, World!" });
  });
});

// ---------------------------------------------------------------------------
// 2. Serialization / deserialization round-trip
// ---------------------------------------------------------------------------

describe("NiceAction — serialization", () => {
  it("uses serialize/deserialize hooks for non-JSON-native input (Date)", async () => {
    const received = vi.fn();

    const dateDomain = createActionDomain({
      domain: "date_domain",
      schema: {
        schedule: action().input({
          schema: v.object({ timeStart: v.date() }),
          serialization: {
            serialize: ({ timeStart }) => ({ iso: timeStart.toISOString() }),
            deserialize: (ser) => ({ timeStart: new Date(ser.iso) }),
          },
        }),
      },
    });

    dateDomain.setActionHandler().forDomain(dateDomain, (act) => {
      const schedule = dateDomain.matchAction(act, "schedule");
      if (schedule) received(schedule.input.timeStart);
    });

    const ts = new Date("2024-06-15T12:00:00Z");
    await dateDomain.action("schedule").execute({ timeStart: ts });

    expect(received).toHaveBeenCalledWith(ts);
  });

  it("action schema input is typed correctly after matchAction narrowing", async () => {
    const domain = createActionDomain({
      domain: "typed",
      schema: {
        send: action().input({ schema: v.object({ count: v.number(), label: v.string() }) }),
      },
    });

    let capturedCount: number | undefined;
    let capturedLabel: string | undefined;

    domain.setActionHandler().forDomain(domain, (act) => {
      const send = domain.matchAction(act, "send");
      if (send) {
        // TypeScript compile error here if input types are wrong
        capturedCount = send.input.count;
        capturedLabel = send.input.label;
      }
    });

    await domain.action("send").execute({ count: 42, label: "items" });

    expect(capturedCount).toBe(42);
    expect(capturedLabel).toBe("items");
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple actions in one domain
// ---------------------------------------------------------------------------

describe("NiceAction — multiple actions per domain", () => {
  it("dispatches to the correct branch per action id", async () => {
    const multiDomain = createActionDomain({
      domain: "multi",
      schema: {
        increment: action().input({ schema: v.object({ by: v.number() }) }),
        reset: action().input({ schema: v.object({ to: v.number() }) }),
      },
    });

    const log = vi.fn();

    // matchAction returns a narrowed value — no sequential narrowing pitfall
    multiDomain.setActionHandler().forDomain(multiDomain, (act) => {
      const increment = multiDomain.matchAction(act, "increment");
      if (increment) {
        log(`increment:${increment.input.by}`);
        return;
      }

      const reset = multiDomain.matchAction(act, "reset");
      if (reset) log(`reset:${reset.input.to}`);
    });

    await multiDomain.action("increment").execute({ by: 5 });
    await multiDomain.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment:5"], ["reset:0"]]);
  });
});

// ---------------------------------------------------------------------------
// 4. Child domain (namespace nesting)
// ---------------------------------------------------------------------------

describe("NiceAction — child domains", () => {
  it("child domain actions route through child handler", async () => {
    const root = createActionDomain({
      domain: "root",
      schema: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = root.createChildDomain({
      domain: "child",
      schema: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const childLog = vi.fn();

    child.setActionHandler().forDomain(child, (act) => {
      const pong = child.matchAction(act, "pong");
      if (pong) childLog(pong.input.v);
    });

    await child.action("pong").execute({ v: "response" });
    expect(childLog).toHaveBeenCalledWith("response");
  });
});

// ---------------------------------------------------------------------------
// 5. Error cases
// ---------------------------------------------------------------------------

describe("NiceAction — error handling", () => {
  it("throws when execute is called with no handler registered", async () => {
    const bare = createActionDomain({
      domain: "bare",
      schema: { noop: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    await expect(bare.action("noop").execute({ x: 1 })).rejects.toThrow(/no action handler/i);
  });

  it("throws when setActionHandler is called twice", () => {
    const conflict = createActionDomain({
      domain: "conflict",
      schema: { a: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    conflict.setActionHandler();

    expect(() => conflict.setActionHandler()).toThrow(/already has a handler/i);
  });

  it("throws when action id does not exist in domain", () => {
    const dom = createActionDomain({
      domain: "dom",
      schema: { known: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    expect(() => dom.action("unknown" as "known")).toThrow(/does not exist in domain/i);
  });
});

// ---------------------------------------------------------------------------
// 6. NiceActionPrimed — re-execute a stored primed action
// ---------------------------------------------------------------------------

describe("NiceActionPrimed — primed re-execution", () => {
  it("execute() on NiceActionPrimed dispatches with stored input", async () => {
    const calls = vi.fn();

    const dom = createActionDomain({
      domain: "primed_test",
      schema: { fire: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    dom.setActionHandler().forDomain(dom, (act) => {
      const fire = dom.matchAction(act, "fire");
      if (fire) calls(fire.input.n);
    });

    const coreAction = dom.action("fire");
    const { NiceActionPrimed } = await import("../NiceAction/NiceActionPrimed");
    const primed = new NiceActionPrimed(coreAction, { n: 99 });

    await primed.execute();

    expect(calls).toHaveBeenCalledWith(99);
  });
});

// ---------------------------------------------------------------------------
// 7. Async handler
// ---------------------------------------------------------------------------

describe("NiceAction — async handler", () => {
  it("supports async handler returning a Promise", async () => {
    const dom = createActionDomain({
      domain: "async_dom",
      schema: {
        fetch: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    dom.setActionHandler().forDomain(dom, async (act) => {
      const fetch = dom.matchAction(act, "fetch");
      if (fetch) {
        await Promise.resolve(); // simulate async work
        return { greeting: `Hi, ${fetch.input.name}` };
      }
    });

    const result = await dom.action("fetch").execute({ name: "Alice" });
    expect(result).toEqual({ greeting: "Hi, Alice" });
  });
});
