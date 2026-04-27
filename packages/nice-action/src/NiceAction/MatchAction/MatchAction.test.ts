import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
import { action } from "../../ActionSchema/action";
import { NiceAction } from "../NiceAction";
import type { INiceAction } from "../NiceAction.types";
import { NiceActionPrimed } from "../NiceActionPrimed";
import { NiceActionResponse } from "../NiceActionResponse";
import { matchAction } from "./MatchAction";

// ---------------------------------------------------------------------------
// Shared domain setup
// ---------------------------------------------------------------------------

const makeSetup = () => {
  const root = createActionRootDomain({ domain: "match_root" });

  const domA = root.createChildDomain({
    domain: "domA",
    actions: {
      foo: action()
        .input({ schema: v.object({ x: v.number() }) })
        .output({ schema: v.object({ result: v.string() }) }),
      bar: action().input({ schema: v.object({ y: v.string() }) }),
    },
  });

  const domB = root.createChildDomain({
    domain: "domB",
    actions: {
      baz: action().input({ schema: v.object({ z: v.boolean() }) }),
    },
  });

  return { root, domA, domB };
};

// ---------------------------------------------------------------------------
// 1. Domain-only matching
// ---------------------------------------------------------------------------

describe("matchAction — domain-only matching", () => {
  it("calls handler when action domain matches", async () => {
    const { domA } = makeSetup();
    const handler = vi.fn();
    const primed = domA.action("foo").prime({ x: 1 });

    const matched = matchAction(primed)
      .with({ domain: domA, handler: async (a) => handler(a) })
      .run();

    expect(matched).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(primed);
  });

  it("matches any action id within the domain", async () => {
    const { domA } = makeSetup();
    const handlerFoo = vi.fn();
    const handlerBar = vi.fn();
    const primedFoo = domA.action("foo").prime({ x: 42 });
    const primedBar = domA.action("bar").prime({ y: "hi" });

    await matchAction(primedFoo)
      .with({ domain: domA, handler: async () => handlerFoo() })
      .run();

    await matchAction(primedBar)
      .with({ domain: domA, handler: async () => handlerBar() })
      .run();

    expect(handlerFoo).toHaveBeenCalledOnce();
    expect(handlerBar).toHaveBeenCalledOnce();
  });

  it("does not call handler when domain does not match", async () => {
    const { domA, domB } = makeSetup();
    const handler = vi.fn();
    const primed = domB.action("baz").prime({ z: true });

    const matched = await matchAction(primed)
      .with({ domain: domA, handler: async () => handler() })
      .run();

    expect(matched).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Domain + ID matching
// ---------------------------------------------------------------------------

describe("matchAction — domain + id matching", () => {
  it("calls handler when both domain and id match", async () => {
    const { domA } = makeSetup();
    const handler = vi.fn();
    const primed = domA.action("foo").prime({ x: 7 });

    const matched = await matchAction(primed)
      .with({ domain: domA, id: "foo", handler: async (a) => handler(a) })
      .run();

    expect(matched).toBe(true);
    expect(handler).toHaveBeenCalledWith(primed);
  });

  it("does not call handler when domain matches but id does not", async () => {
    const { domA } = makeSetup();
    const handler = vi.fn();
    const primed = domA.action("bar").prime({ y: "test" });

    const matched = await matchAction(primed)
      .with({ domain: domA, id: "foo", handler: async () => handler() })
      .run();

    expect(matched).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not call handler when id matches but domain does not", async () => {
    const { domA, domB } = makeSetup();
    const handler = vi.fn();
    const primed = domB.action("baz").prime({ z: false });

    const matched = await matchAction(primed)
      .with({ domain: domA, id: "foo", handler: async () => handler() })
      .run();

    expect(matched).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. First-match-wins ordering
// ---------------------------------------------------------------------------

describe("matchAction — first-match-wins", () => {
  it("calls the first matching handler and skips the rest", async () => {
    const { domA } = makeSetup();
    const first = vi.fn();
    const second = vi.fn();
    const primed = domA.action("foo").prime({ x: 1 });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => first() })
      .with({ domain: domA, handler: async () => second() })
      .run();

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });

  it("domain+id handler wins over domain-only when registered first", async () => {
    const { domA } = makeSetup();
    const specific = vi.fn();
    const catchAll = vi.fn();
    const primed = domA.action("foo").prime({ x: 1 });

    await matchAction(primed)
      .with({ domain: domA, id: "foo", handler: async () => specific() })
      .with({ domain: domA, handler: async () => catchAll() })
      .run();

    expect(specific).toHaveBeenCalledOnce();
    expect(catchAll).not.toHaveBeenCalled();
  });

  it("domain-only handler wins over domain+id when registered first (first-match, not best-match)", async () => {
    const { domA } = makeSetup();
    const catchAll = vi.fn();
    const specific = vi.fn();
    const primed = domA.action("foo").prime({ x: 1 });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => catchAll() })
      .with({ domain: domA, id: "foo", handler: async () => specific() })
      .run();

    expect(catchAll).toHaveBeenCalledOnce();
    expect(specific).not.toHaveBeenCalled();
  });

  it("skips non-matching entries to find the first match", async () => {
    const { domA, domB } = makeSetup();
    const wrongDomain = vi.fn();
    const wrongId = vi.fn();
    const correct = vi.fn();
    const primed = domA.action("foo").prime({ x: 5 });

    await matchAction(primed)
      .with({ domain: domB, handler: async () => wrongDomain() })
      .with({ domain: domA, id: "bar", handler: async () => wrongId() })
      .with({ domain: domA, id: "foo", handler: async () => correct() })
      .run();

    expect(wrongDomain).not.toHaveBeenCalled();
    expect(wrongId).not.toHaveBeenCalled();
    expect(correct).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 4. Return value
// ---------------------------------------------------------------------------

describe("matchAction — run() return value", () => {
  it("returns true when a handler matched", async () => {
    const { domA } = makeSetup();
    const primed = domA.action("foo").prime({ x: 1 });

    const result = await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .run();

    expect(result).toBe(true);
  });

  it("returns false when no handler matched", async () => {
    const { domA, domB } = makeSetup();
    const primed = domB.action("baz").prime({ z: true });

    const result = await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .run();

    expect(result).toBe(false);
  });

  it("returns false when there are no handlers at all", async () => {
    const { domA } = makeSetup();
    const primed = domA.action("foo").prime({ x: 1 });

    const result = await matchAction(primed).run();

    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. .otherwise()
// ---------------------------------------------------------------------------

describe("matchAction — .otherwise()", () => {
  it("calls otherwise when no handler matched", async () => {
    const { domA, domB } = makeSetup();
    const fallback = vi.fn();
    const primed = domB.action("baz").prime({ z: false });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .otherwise(async (a) => fallback(a))
      .run();

    expect(fallback).toHaveBeenCalledOnce();
    expect(fallback).toHaveBeenCalledWith(primed);
  });

  it("does not call otherwise when a handler matched", async () => {
    const { domA } = makeSetup();
    const fallback = vi.fn();
    const primed = domA.action("foo").prime({ x: 1 });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .otherwise(async () => fallback())
      .run();

    expect(fallback).not.toHaveBeenCalled();
  });

  it("otherwise receives the original action", async () => {
    const { domA, domB } = makeSetup();
    let received: unknown;
    const primed = domB.action("baz").prime({ z: true });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .otherwise(async (a) => {
        received = a;
      })
      .run();

    expect(received).toBe(primed);
  });
});

// ---------------------------------------------------------------------------
// 6. Action state — NiceAction / NiceActionPrimed / NiceActionResponse
// ---------------------------------------------------------------------------

describe("matchAction — action state narrowing in handler", () => {
  it("handler receives a NiceAction (empty state)", async () => {
    const { domA } = makeSetup();
    let received: unknown;
    const coreAction = domA.action("foo");

    await matchAction(coreAction)
      .with({
        domain: domA,
        handler: async (a) => {
          received = a;
        },
      })
      .run();

    expect(received).toBeInstanceOf(NiceAction);
  });

  it("handler receives a NiceActionPrimed with accessible input", async () => {
    const { domA } = makeSetup();
    let receivedInput: unknown;
    const primed = domA.action("foo").prime({ x: 99 });

    await matchAction(primed)
      .with({
        domain: domA,
        id: "foo",
        handler: async (a) => {
          if (a instanceof NiceActionPrimed) receivedInput = a.input;
        },
      })
      .run();

    expect(receivedInput).toEqual({ x: 99 });
  });

  it("handler receives a NiceActionResponse with accessible result", async () => {
    const { domA } = makeSetup();
    let receivedResult: unknown;
    const primed = domA.action("foo").prime({ x: 3 });
    const response = new NiceActionResponse(primed, { ok: true, output: { result: "done" } });

    await matchAction(response)
      .with({
        domain: domA,
        id: "foo",
        handler: async (a) => {
          if (a instanceof NiceActionResponse) receivedResult = a.result;
        },
      })
      .run();

    expect(receivedResult).toEqual({ ok: true, output: { result: "done" } });
  });

  it("instanceof checks let the handler branch on state", async () => {
    const { domA } = makeSetup();
    const states: string[] = [];

    const coreAction = domA.action("foo");
    const primed = coreAction.prime({ x: 1 });
    const response = new NiceActionResponse(primed, { ok: false, error: new Error("boom") as any });

    const check = async (a: unknown) => {
      if (a instanceof NiceActionResponse) states.push("response");
      else if (a instanceof NiceActionPrimed) states.push("primed");
      else if (a instanceof NiceAction) states.push("empty");
    };

    await matchAction(coreAction).with({ domain: domA, handler: check }).run();
    await matchAction(primed).with({ domain: domA, handler: check }).run();
    await matchAction(response).with({ domain: domA, handler: check }).run();

    expect(states).toEqual(["empty", "primed", "response"]);
  });
});

// ---------------------------------------------------------------------------
// 7. Async handlers
// ---------------------------------------------------------------------------

describe("matchAction — async handlers", () => {
  it("awaits async handlers before run() resolves", async () => {
    const { domA } = makeSetup();
    const order: string[] = [];
    const primed = domA.action("foo").prime({ x: 1 });

    await matchAction(primed)
      .with({
        domain: domA,
        handler: async () => {
          await Promise.resolve();
          order.push("handler");
        },
      })
      .run();

    order.push("after run");
    expect(order).toEqual(["handler", "after run"]);
  });

  it("awaits async otherwise before run() resolves", async () => {
    const { domA, domB } = makeSetup();
    const order: string[] = [];
    const primed = domB.action("baz").prime({ z: true });

    await matchAction(primed)
      .with({ domain: domA, handler: async () => {} })
      .otherwise(async () => {
        await Promise.resolve();
        order.push("otherwise");
      })
      .run();

    order.push("after run");
    expect(order).toEqual(["otherwise", "after run"]);
  });
});

// ---------------------------------------------------------------------------
// 8. Multiple domains — routing
// ---------------------------------------------------------------------------

describe("matchAction — multi-domain routing", () => {
  it("routes to the correct domain handler when multiple domains are registered", async () => {
    const { domA, domB } = makeSetup();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const primedA = domA.action("foo").prime({ x: 1 });
    const primedB = domB.action("baz").prime({ z: true });

    const runWith = <ACT extends INiceAction<any>>(act: ACT) =>
      matchAction(act)
        .with({ domain: domA, handler: async () => handlerA() })
        .with({ domain: domB, handler: async () => handlerB() })
        .run();

    await runWith(primedA);
    await runWith(primedB);

    expect(handlerA).toHaveBeenCalledOnce();
    expect(handlerB).toHaveBeenCalledOnce();
  });

  it("routes two different action ids to separate domain+id handlers", async () => {
    const { domA } = makeSetup();
    const fooHandler = vi.fn();
    const barHandler = vi.fn();

    await matchAction(domA.action("foo").prime({ x: 1 }))
      .with({ domain: domA, id: "foo", handler: async () => fooHandler() })
      .with({ domain: domA, id: "bar", handler: async () => barHandler() })
      .run();

    await matchAction(domA.action("bar").prime({ y: "hi" }))
      .with({ domain: domA, id: "foo", handler: async () => fooHandler() })
      .with({ domain: domA, id: "bar", handler: async () => barHandler() })
      .run();

    expect(fooHandler).toHaveBeenCalledOnce();
    expect(barHandler).toHaveBeenCalledOnce();
  });
});
