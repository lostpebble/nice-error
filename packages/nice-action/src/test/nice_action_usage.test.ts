import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// 1. Basic domain creation and action execution
// ---------------------------------------------------------------------------

describe("NiceAction — basic domain", () => {
  it("creates a domain, registers a handler, executes an action", async () => {
    const mockFn = vi.fn();

    const domain = createActionRootDomain({
      domain: "test_domain",
    }).createChildDomain({
      domain: "basic",
      actions: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    domain.setHandler(
      new ActionHandler().forDomain(domain, {
        execution: (act) => {
          const ping = domain.matchAction(act, "ping");
          if (ping) mockFn(ping.input.msg);
        },
      }),
    );

    await domain.action("ping").execute({ msg: "hello" });

    expect(mockFn).toHaveBeenCalledWith("hello");
  });

  it("returns a value from the handler via output schema", async () => {
    const greetDomain = createActionRootDomain({
      domain: "greet_root",
    }).createChildDomain({
      domain: "greet",
      actions: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    greetDomain.setHandler(
      new ActionHandler().forDomain(greetDomain, {
        execution: (act) => {
          const greet = greetDomain.matchAction(act, "greet");
          if (greet) return act.setResponse({ greeting: `Hello, ${greet.input.name}!` });
        },
      }),
    );

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

    const dateDomain = createActionRootDomain({
      domain: "date_root",
    }).createChildDomain({
      domain: "date_domain",
      actions: {
        schedule: action().input({
          schema: v.object({ timeStart: v.date() }),
          serialization: {
            serialize: ({ timeStart }) => ({ iso: timeStart.toISOString() }),
            deserialize: (ser) => ({ timeStart: new Date(ser.iso) }),
          },
        }),
      },
    });

    dateDomain.setHandler(
      new ActionHandler().forDomain(dateDomain, {
        execution: (act) => {
          const schedule = dateDomain.matchAction(act, "schedule");
          if (schedule) received(schedule.input.timeStart);
        },
      }),
    );

    const ts = new Date("2024-06-15T12:00:00Z");
    await dateDomain.action("schedule").execute({ timeStart: ts });

    expect(received).toHaveBeenCalledWith(ts);
  });

  it("action schema input is typed correctly after matchAction narrowing", async () => {
    const domain = createActionRootDomain({
      domain: "match_test_root",
    }).createChildDomain({
      domain: "typed",
      actions: {
        send: action().input({ schema: v.object({ count: v.number(), label: v.string() }) }),
      },
    });

    let capturedCount: number | undefined;
    let capturedLabel: string | undefined;

    domain.setHandler(
      new ActionHandler().forDomain(domain, {
        execution: (act) => {
          const send = domain.matchAction(act, "send");
          if (send) {
            capturedCount = send.input.count;
            capturedLabel = send.input.label;
          }
        },
      }),
    );

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
    const multiDomain = createActionRootDomain({
      domain: "multi_root",
    }).createChildDomain({
      domain: "multi",
      actions: {
        increment: action().input({ schema: v.object({ by: v.number() }) }),
        reset: action().input({ schema: v.object({ to: v.number() }) }),
      },
    });

    const log = vi.fn();

    multiDomain.setHandler(
      new ActionHandler().forDomain(multiDomain, {
        execution: (act) => {
          const increment = multiDomain.matchAction(act, "increment");
          if (increment) {
            log(`increment:${increment.input.by}`);
            return;
          }

          const reset = multiDomain.matchAction(act, "reset");
          if (reset) log(`reset:${reset.input.to}`);
        },
      }),
    );

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
    const root = createActionRootDomain({
      domain: "root",
    });

    const child = root.createChildDomain({
      domain: "child",
      actions: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const childLog = vi.fn();

    child.setHandler(
      new ActionHandler().forDomain(child, {
        execution: (act) => {
          const pong = child.matchAction(act, "pong");
          if (pong) childLog(pong.input.v);
        },
      }),
    );

    await child.action("pong").execute({ v: "response" });
    expect(childLog).toHaveBeenCalledWith("response");
  });
});

// ---------------------------------------------------------------------------
// 5. Error cases
// ---------------------------------------------------------------------------

describe("NiceAction — error handling", () => {
  it("throws when execute is called with no handler registered", async () => {
    const bare = createActionRootDomain({
      domain: "bare_root",
    }).createChildDomain({
      domain: "bare",
      actions: { noop: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    await expect(bare.action("noop").execute({ x: 1 })).rejects.toThrow(/no action handler/i);
  });

  it("throws when setHandler is called twice for the same default slot", () => {
    const conflict = createActionRootDomain({
      domain: "conflict_root",
    }).createChildDomain({
      domain: "conflict",
      actions: { a: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    conflict.setHandler(new ActionHandler());

    expect(() => conflict.setHandler(new ActionHandler())).toThrow(/already has a handler/i);
  });

  it("throws when action id does not exist in domain", () => {
    const dom = createActionRootDomain({
      domain: "dom_root",
    }).createChildDomain({
      domain: "dom",
      actions: { known: action().input({ schema: v.object({ x: v.number() }) }) },
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

    const dom = createActionRootDomain({
      domain: "primed_root",
    }).createChildDomain({
      domain: "primed_test",
      actions: { fire: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    dom.setHandler(
      new ActionHandler().forDomain(dom, {
        execution: (act) => {
          const fire = dom.matchAction(act, "fire");
          if (fire) calls(fire.input.n);
        },
      }),
    );

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
    const dom = createActionRootDomain({
      domain: "async_root",
    }).createChildDomain({
      domain: "async_dom",
      actions: {
        fetch: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    dom.setHandler(
      new ActionHandler().forDomain(dom, {
        execution: async (act) => {
          const fetch = dom.matchAction(act, "fetch");
          if (fetch) {
            await Promise.resolve();
            return act.setResponse({ greeting: `Hi, ${fetch.input.name}` });
          }
        },
      }),
    );

    const result = await dom.action("fetch").execute({ name: "Alice" });
    expect(result).toEqual({ greeting: "Hi, Alice" });
  });
});
