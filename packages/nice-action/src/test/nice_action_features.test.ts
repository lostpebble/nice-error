/**
 * Tests for the extended features:
 *   - NiceActionHandler.forActionId / forActionIds
 *   - NiceActionDomain.addActionListener (with unsubscribe)
 *   - NiceActionPrimed.toJsonObject  (serialization)
 *   - NiceActionDomain.hydrateAction (deserialization / hydration)
 *   - NiceAction.toJsonObject
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

// ---------------------------------------------------------------------------
// Shared domain
// ---------------------------------------------------------------------------

const makeCounterDomain = () =>
  createActionDomain({
    domain: "counter",
    schema: {
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

    dom
      .setActionHandler()
      .forActionId(dom, "increment", (act) => {
        log(`increment:${act.input.by}`);
      })
      .forActionId(dom, "decrement", (act) => {
        log(`decrement:${act.input.by}`);
      })
      .forActionId(dom, "reset", (act) => {
        log(`reset:${act.input.to}`);
      });

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment:3"], ["decrement:1"], ["reset:0"]]);
  });

  it("throws when no forActionId case matches the executed id", async () => {
    const dom = makeCounterDomain();

    dom.setActionHandler().forActionId(dom, "increment", () => {});
    // reset has no handler

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(
      /no handler found/i,
    );
  });

  it("input is narrowed to the specific action schema", async () => {
    const dom = makeCounterDomain();
    let capturedBy: number | undefined;

    dom.setActionHandler().forActionId(dom, "increment", (act) => {
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
      .setActionHandler()
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
      .setActionHandler()
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
      .setActionHandler()
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
// 3. addActionListener — observer pattern
// ---------------------------------------------------------------------------

describe("NiceActionDomain.addActionListener", () => {
  it("listener is called after every dispatched action", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setActionHandler().forDomain(dom, () => {});
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

    dom.setActionHandler().forDomain(dom, () => {});
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

    dom.setActionHandler().forDomain(dom, () => {});
    dom.addActionListener(a);
    dom.addActionListener(b);

    await dom.action("increment").execute({ by: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("listener receives the primed action (correct input)", async () => {
    const dom = makeCounterDomain();
    let seenInput: { by: number } | undefined;

    dom.setActionHandler().forDomain(dom, () => {});
    dom.addActionListener((act) => {
      const match = dom.matchAction(act, "increment");
      if (match) seenInput = match.input;
    });

    await dom.action("increment").execute({ by: 42 });
    expect(seenInput).toEqual({ by: 42 });
  });
});

// ---------------------------------------------------------------------------
// 4. toJsonObject — serialization
// ---------------------------------------------------------------------------

describe("NiceActionPrimed.toJsonObject", () => {
  it("serializes a JSON-native input without custom serialization", () => {
    const dom = createActionDomain({
      domain: "ser_native",
      schema: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const primed = new NiceActionPrimed(dom.action("ping"), { msg: "hello" });
    const json = primed.toJsonObject();

    expect(json).toEqual({ domain: "ser_native", actionId: "ping", input: { msg: "hello" } });
  });

  it("uses the schema's serialize function for non-JSON-native input (Date)", () => {
    const dom = createActionDomain({
      domain: "ser_date",
      schema: {
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
      domain: "ser_date",
      actionId: "schedule",
      input: { iso: "2024-03-01T09:00:00.000Z" },
    });
  });
});

describe("NiceAction.toJsonObject", () => {
  it("serializes the action reference without input", () => {
    const dom = createActionDomain({
      domain: "ref_dom",
      schema: { fire: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    const ref = dom.action("fire");
    expect(ref.toJsonObject()).toEqual({ domain: "ref_dom", actionId: "fire" });
  });
});

// ---------------------------------------------------------------------------
// 5. hydrateAction — deserialization
// ---------------------------------------------------------------------------

describe("NiceActionDomain.hydrateAction", () => {
  it("hydrates a JSON-native primed action and executes it", async () => {
    const dom = createActionDomain({
      domain: "hydrate_native",
      schema: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const received = vi.fn();
    dom.setActionHandler().forActionId(dom, "ping", (act) => {
      received(act.input.msg);
    });

    const wire = { domain: "hydrate_native", actionId: "ping", input: { msg: "revived" } };
    const primed = dom.hydrateAction(wire);

    await primed.execute();
    expect(received).toHaveBeenCalledWith("revived");
  });

  it("uses deserialize to restore non-JSON-native input (Date) before execution", async () => {
    const dom = createActionDomain({
      domain: "hydrate_date",
      schema: {
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
    dom.setActionHandler().forActionId(dom, "schedule", (act) => {
      received(act.input.at);
    });

    const wire = {
      domain: "hydrate_date",
      actionId: "schedule",
      input: { iso: "2024-06-01T00:00:00.000Z" },
    };
    await dom.hydrateAction(wire).execute();

    expect(received).toHaveBeenCalledWith(new Date("2024-06-01T00:00:00.000Z"));
  });

  it("round-trips: toJsonObject → hydrateAction → execute", async () => {
    const dom = createActionDomain({
      domain: "roundtrip",
      schema: {
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
    dom.setActionHandler().forActionId(dom, "send", (act) => {
      received(act.input.ts, act.input.label);
    });

    const original = new NiceActionPrimed(dom.action("send"), {
      ts: new Date("2025-01-15T08:30:00Z"),
      label: "meeting",
    });

    // Simulate cross-environment: serialize → JSON.stringify → JSON.parse → hydrate
    const wire = JSON.parse(JSON.stringify(original.toJsonObject()));
    await dom.hydrateAction(wire).execute();

    expect(received).toHaveBeenCalledWith(new Date("2025-01-15T08:30:00Z"), "meeting");
  });

  it("throws on domain mismatch", () => {
    const dom = createActionDomain({
      domain: "correct",
      schema: { a: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    expect(() =>
      dom.hydrateAction({ domain: "wrong", actionId: "a", input: { x: 1 } }),
    ).toThrow(/domain mismatch/i);
  });

  it("throws when action id is not found in domain", () => {
    const dom = createActionDomain({
      domain: "known_dom",
      schema: { known: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    expect(() =>
      dom.hydrateAction({ domain: "known_dom", actionId: "unknown", input: {} }),
    ).toThrow(/does not exist/i);
  });
});
