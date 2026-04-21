/**
 * Tests for the extended features:
 *   - NiceActionHandler.forActionId / forActionIds
 *   - NiceActionHandler standalone creation + setDefaultHandler
 *   - NiceActionDomain.addActionListener (with unsubscribe)
 *   - NiceActionPrimed.toJsonObject  (serialization)
 *   - NiceActionDomain.hydrateAction (deserialization / hydration)
 *   - NiceAction.toJsonObject
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import { NiceActionRequester } from "../ActionRequestResponse/ActionRequester/NiceActionRequester";
import { action } from "../ActionSchema/action";
import { EActionState } from "../NiceAction/NiceAction.enums";
import { type INiceActionPrimed_JsonObject } from "../NiceAction/NiceAction.types";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

// ---------------------------------------------------------------------------
// Shared domain
// ---------------------------------------------------------------------------

const makeCounterDomain = () =>
  createActionDomain({
    domain: "counter",
    actions: {
      increment: action().input({ schema: v.object({ by: v.number() }) }),
      decrement: action().input({ schema: v.object({ by: v.number() }) }),
      reset: action().input({ schema: v.object({ to: v.number() }) }),
    },
  });

// ---------------------------------------------------------------------------
// 1. forActionId — single-ID targeted handler
// ---------------------------------------------------------------------------

describe("NiceActionHandler.forActionId", () => {
  it("fires only for the registered action id", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    // handler built standalone, then attached to the domain
    const handler = new NiceActionRequester()
      .forActionId(dom, "increment", (act) => {
        log(`increment:${act.input.by}`);
      })
      .forActionId(dom, "decrement", (act) => {
        log(`decrement:${act.input.by}`);
      })
      .forActionId(dom, "reset", (act) => {
        log(`reset:${act.input.to}`);
      });

    dom.setActionRequester(undefined, handler);

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment:3"], ["decrement:1"], ["reset:0"]]);
  });

  it("throws when no forActionId case matches the executed id", async () => {
    const dom = makeCounterDomain();

    dom.setActionRequester().forActionId(dom, "increment", () => {});
    // reset has no handler

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(/no handler found/i);
  });

  it("input is narrowed to the specific action schema", async () => {
    const dom = makeCounterDomain();
    let capturedBy: number | undefined;

    dom.setActionRequester().forActionId(dom, "increment", (act) => {
      // TypeScript error here if act.input.by is not `number`
      capturedBy = act.input.by;
    });

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 2. forActionIds — multi-ID handler
// ---------------------------------------------------------------------------

describe("NiceActionHandler.forActionIds", () => {
  it("fires for any id in the provided list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionIds(dom, ["increment", "decrement"] as const, (act) => {
        log(act.coreAction.id);
      })
      .forActionId(dom, "reset", () => {});

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"]]);
  });

  it("falls through to next case when id is not in the list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionIds(dom, ["increment", "decrement"] as const, () => {
        log("inc_or_dec");
      })
      .forActionId(dom, "reset", () => {
        log("reset");
      });

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("reset");
    expect(log).not.toHaveBeenCalledWith("inc_or_dec");
  });

  it("first matching case wins — forDomain after forActionId is not reached", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionId(dom, "increment", () => {
        log("specific");
      })
      .forDomain(dom, () => {
        log("catchall");
      });

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });
});

// ---------------------------------------------------------------------------
// 3. standalone NiceActionHandler — setDefaultHandler + reuse
// ---------------------------------------------------------------------------

describe("NiceActionHandler standalone", () => {
  it("setDefaultHandler catches actions with no matching case", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    const handler = new NiceActionRequester()
      .forActionId(dom, "increment", () => log("increment"))
      .setDefaultHandler((act) => log(`default:${act.coreAction.id}`));

    dom.setActionRequester(undefined, handler);

    await dom.action("increment").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 }); // no specific case → default

    expect(log.mock.calls).toEqual([["increment"], ["default:reset"]]);
  });

  it("same handler instance reused across two different domains", async () => {
    const counterDom = makeCounterDomain();
    const timerDom = createActionDomain({
      domain: "timer",
      actions: {
        start: action().input({ schema: v.object({ ms: v.number() }) }),
        stop: action().input({ schema: v.object({}) }),
      },
    });
    const log = vi.fn();

    // One handler covers both domains
    const handler = new NiceActionRequester()
      .forActionId(counterDom, "increment", (act) => log(`counter:increment:${act.input.by}`))
      .forActionId(timerDom, "start", (act) => log(`timer:start:${act.input.ms}`))
      .setDefaultHandler((act) => log(`fallback:${act.coreAction.id}`));

    counterDom.setActionRequester(undefined, handler);
    timerDom.setActionRequester(undefined, handler);

    await counterDom.action("increment").execute({ by: 5 });
    await timerDom.action("start").execute({ ms: 1000 });
    await counterDom.action("reset").execute({ to: 0 }); // hits default

    expect(log.mock.calls).toEqual([
      ["counter:increment:5"],
      ["timer:start:1000"],
      ["fallback:reset"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// 5. addActionListener — observer pattern
// ---------------------------------------------------------------------------

describe("NiceActionDomain.addActionListener", () => {
  it("listener is called after every dispatched action", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setActionRequester().forDomain(dom, () => {});
    dom.addActionListener((act) => {
      seen(act.coreAction.id);
    });

    await dom.action("increment").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(seen.mock.calls).toEqual([["increment"], ["reset"]]);
  });

  it("unsubscribe stops the listener from being called", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setActionRequester().forDomain(dom, () => {});
    const unsub = dom.addActionListener(() => seen());

    await dom.action("increment").execute({ by: 1 });
    unsub();
    await dom.action("decrement").execute({ by: 1 });

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("multiple listeners all fire independently", async () => {
    const dom = makeCounterDomain();
    const a = vi.fn();
    const b = vi.fn();

    dom.setActionRequester().forDomain(dom, () => {});
    dom.addActionListener(a);
    dom.addActionListener(b);

    await dom.action("increment").execute({ by: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("listener receives the primed action (correct input)", async () => {
    const dom = makeCounterDomain();
    let seenInput: { by: number } | undefined;

    dom.setActionRequester().forDomain(dom, () => {});
    dom.addActionListener((act) => {
      const match = dom.matchAction(act, "increment");
      if (match) seenInput = match.input;
    });

    await dom.action("increment").execute({ by: 42 });
    expect(seenInput).toEqual({ by: 42 });
  });
});

// ---------------------------------------------------------------------------
// 6. toJsonObject — serialization
// ---------------------------------------------------------------------------

describe("NiceActionPrimed.toJsonObject", () => {
  it("serializes a JSON-native input without custom serialization", () => {
    const dom = createActionDomain({
      domain: "ser_native",
      actions: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const primed = new NiceActionPrimed(dom.action("ping"), { msg: "hello" });
    const json = primed.toJsonObject();

    expect(json).toEqual({
      type: EActionState.primed,
      domain: "ser_native",
      allDomains: ["ser_native"],
      id: "ping",
      input: { msg: "hello" },
      cuid: primed.coreAction["cuid"],
      timeCreated: primed.coreAction["timeCreated"],
      timePrimed: primed.timePrimed,
    });
  });

  it("uses the schema's serialize function for non-JSON-native input (Date)", () => {
    const dom = createActionDomain({
      domain: "ser_date",
      actions: {
        schedule: action().input({
          schema: v.object({ at: v.date() }),
          serialization: {
            serialize: ({ at }) => ({ iso: at.toISOString() }),
            deserialize: (s) => ({ at: new Date(s.iso) }),
          },
        }),
      },
    });

    const ts = new Date("2024-03-01T09:00:00Z");
    const primed = new NiceActionPrimed(dom.action("schedule"), { at: ts });
    const json = primed.toJsonObject();

    expect(json).toEqual({
      type: EActionState.primed,
      domain: "ser_date",
      allDomains: ["ser_date"],
      id: "schedule",
      input: { iso: "2024-03-01T09:00:00.000Z" },
      cuid: primed.coreAction["cuid"],
      timeCreated: primed.coreAction["timeCreated"],
      timePrimed: primed.timePrimed,
    });
  });
});

describe("NiceAction.toJsonObject", () => {
  it("serializes the action reference without input", () => {
    const dom = createActionDomain({
      domain: "ref_dom",
      actions: { fire: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    const ref = dom.action("fire");
    expect(ref.toJsonObject()).toEqual({
      type: EActionState.empty,
      domain: "ref_dom",
      allDomains: ["ref_dom"],
      id: "fire",
      cuid: ref.cuid,
      timeCreated: ref.timeCreated,
    });
  });
});

// ---------------------------------------------------------------------------
// 7. hydrateAction — deserialization
// ---------------------------------------------------------------------------

describe("NiceActionDomain.hydrateAction", () => {
  it("hydrates a JSON-native primed action and executes it", async () => {
    const dom = createActionDomain({
      domain: "hydrate_native",
      actions: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const received = vi.fn();
    dom.setActionRequester().forActionId(dom, "ping", (act) => {
      received(act.input.msg);
    });

    const wire: INiceActionPrimed_JsonObject = {
      type: EActionState.primed,
      domain: "hydrate_native",
      allDomains: ["hydrate_native"],
      id: "ping",
      input: { msg: "revived" },
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    };
    const primed = dom.hydratePrimed(wire);

    expect(primed).toBeInstanceOf(NiceActionPrimed);
    expect(primed.id).toEqual("ping");

    await primed.execute();
    expect(received).toHaveBeenCalledWith("revived");
  });

  it("uses deserialize to restore non-JSON-native input (Date) before execution", async () => {
    const dom = createActionDomain({
      domain: "hydrate_date",
      actions: {
        schedule: action().input({
          schema: v.object({ at: v.date() }),
          serialization: {
            serialize: ({ at }) => ({ iso: at.toISOString() }),
            deserialize: (s) => ({ at: new Date(s.iso) }),
          },
        }),
      },
    });

    const received = vi.fn();
    dom.setActionRequester().forActionId(dom, "schedule", (act) => {
      received(act.input.at);
    });

    const wire: INiceActionPrimed_JsonObject = {
      type: EActionState.primed,
      domain: "hydrate_date",
      allDomains: ["hydrate_date"],
      id: "schedule",
      input: { iso: "2024-06-01T00:00:00.000Z" },
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    };
    await dom.hydratePrimed(wire).execute();

    expect(received).toHaveBeenCalledWith(new Date("2024-06-01T00:00:00.000Z"));
  });

  it("round-trips: toJsonObject → hydrateAction → execute", async () => {
    const dom = createActionDomain({
      domain: "roundtrip",
      actions: {
        send: action().input({
          schema: v.object({ ts: v.date(), label: v.string() }),
          serialization: {
            serialize: ({ ts, label }) => ({ iso: ts.toISOString(), label }),
            deserialize: (s) => ({ ts: new Date(s.iso), label: s.label }),
          },
        }),
      },
    });

    const received = vi.fn();
    dom.setActionRequester().forActionId(dom, "send", (act) => {
      received(act.input.ts, act.input.label);
    });

    const original = new NiceActionPrimed(dom.action("send"), {
      ts: new Date("2025-01-15T08:30:00Z"),
      label: "meeting",
    });

    // Simulate cross-environment: serialize → JSON.stringify → JSON.parse → hydrate
    const wire = JSON.parse(JSON.stringify(original.toJsonObject()));
    await dom.hydratePrimed(wire).execute();

    expect(received).toHaveBeenCalledWith(new Date("2025-01-15T08:30:00Z"), "meeting");
  });

  it("throws on domain mismatch", () => {
    const dom = createActionDomain({
      domain: "correct",
      actions: { a: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    expect(() =>
      dom.hydratePrimed({
        type: EActionState.primed,
        domain: "wrong",
        allDomains: ["wrong"],
        id: "a",
        input: { x: 1 },
        cuid: "x",
        timeCreated: Date.now() - 1000,
        timePrimed: Date.now(),
      }),
    ).toThrow(/domain mismatch/i);
  });

  it("throws when action id is not found in domain", () => {
    const dom = createActionDomain({
      domain: "known_dom",
      actions: { known: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    expect(() =>
      dom.hydratePrimed({
        type: EActionState.primed,
        domain: "known_dom",
        allDomains: ["known_dom"],
        id: "unknown",
        input: {},
        cuid: "x",
        timeCreated: Date.now() - 1000,
        timePrimed: Date.now(),
      }),
    ).toThrow(/does not exist/i);
  });
});
