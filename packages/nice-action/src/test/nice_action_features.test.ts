import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { createActionRuntime } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../ActionSchema/action";
import { EActionState } from "../NiceAction/NiceAction.enums";
import { type INiceActionPrimed_JsonObject } from "../NiceAction/NiceAction.types";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

// ---------------------------------------------------------------------------
// Shared domain
// ---------------------------------------------------------------------------

const makeCounterDomain = () => {
  const root = createActionRootDomain({ domain: "counter_root" });
  const dom = root.createChildDomain({
    domain: "counter",
    actions: {
      increment: action().input({ schema: v.object({ by: v.number() }) }),
      decrement: action().input({ schema: v.object({ by: v.number() }) }),
      reset: action().input({ schema: v.object({ to: v.number() }) }),
    },
  });
  return { root, dom };
};

// ---------------------------------------------------------------------------
// 1. forAction — single-ID targeted handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forAction", () => {
  it("fires only for the registered action id", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    const handler = new ActionHandler()
      .forAction(dom, "increment", {
        execution: (primed) => {
          log(`increment:${primed.input.by}`);
        },
      })
      .forAction(dom, "decrement", {
        execution: (primed) => {
          log(`decrement:${primed.input.by}`);
        },
      })
      .forAction(dom, "reset", {
        execution: (primed) => {
          log(`reset:${primed.input.to}`);
        },
      });

    root.setRuntimeEnvironment(createActionRuntime({ envId: "test" }).addHandlers([handler]));

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment:3"], ["decrement:1"], ["reset:0"]]);
  });

  it("throws when no forAction case matches the executed id", async () => {
    const { root, dom } = makeCounterDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "increment", { execution: () => {} }),
      ]),
    );
    // reset has no handler

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(/no action handler/i);
  });

  it("input is narrowed to the specific action schema", async () => {
    const { root, dom } = makeCounterDomain();
    let capturedBy: number | undefined;

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "increment", {
          execution: (primed) => {
            capturedBy = primed.input.by;
          },
        }),
      ]),
    );

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 2. forActionIds — multi-ID handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forActionIds", () => {
  it("fires for any id in the provided list", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forActionIds(dom, ["increment", "decrement"] as const, {
            execution: (primed) => {
              log(primed.coreAction.id);
            },
          })
          .forAction(dom, "reset", { execution: () => {} }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"]]);
  });

  it("falls through to next case when id is not in the list", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forActionIds(dom, ["increment", "decrement"] as const, {
            execution: () => {
              log("inc_or_dec");
            },
          })
          .forAction(dom, "reset", {
            execution: () => {
              log("reset");
            },
          }),
      ]),
    );

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("reset");
    expect(log).not.toHaveBeenCalledWith("inc_or_dec");
  });

  it("first matching case wins — forDomain after forAction is not reached", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forAction(dom, "increment", {
            execution: () => {
              log("specific");
            },
          })
          .forDomain(dom, {
            execution: () => {
              log("catchall");
            },
          }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });
});

// ---------------------------------------------------------------------------
// 3. standalone ActionHandler — setDefaultHandler + reuse
// ---------------------------------------------------------------------------

describe("ActionHandler standalone", () => {
  it("setDefaultHandler catches actions with no matching case", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    const handler = new ActionHandler().forAction(dom, "increment", {
      execution: () => log("increment"),
    });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" })
        .addHandlers([handler])
        .setDefaultHandler({
          execution: (primed) => log(`default:${primed.coreAction.id}`),
        }),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 }); // no specific case → default

    expect(log.mock.calls).toEqual([["increment"], ["default:reset"]]);
  });

  it("same handler instance reused across two different domains", async () => {
    const { root: counterRoot, dom: counterDom } = makeCounterDomain();
    const timerRoot = createActionRootDomain({ domain: "timer_root" });
    const timerDom = timerRoot.createChildDomain({
      domain: "timer",
      actions: {
        start: action().input({ schema: v.object({ ms: v.number() }) }),
        stop: action().input({ schema: v.object({}) }),
      },
    });

    const log = vi.fn();

    // One handler covers both domains
    const handler = new ActionHandler()
      .forAction(counterDom, "increment", {
        execution: (primed) => log(`counter:increment:${primed.input.by}`),
      })
      .forAction(timerDom, "start", {
        execution: (primed) => log(`timer:start:${primed.input.ms}`),
      });

    counterRoot.setRuntimeEnvironment(
      createActionRuntime({ envId: "counter" })
        .addHandlers([handler])
        .setDefaultHandler({
          execution: (primed) => log(`fallback:${primed.coreAction.id}`),
        }),
    );

    timerRoot.setRuntimeEnvironment(createActionRuntime({ envId: "timer" }).addHandlers([handler]));

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
    const { root, dom } = makeCounterDomain();
    const seen = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );
    dom.addActionListener({
      execution: (act) => {
        seen(act.coreAction.id);
      },
    });

    await dom.action("increment").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(seen.mock.calls).toEqual([["increment"], ["reset"]]);
  });

  it("unsubscribe stops the listener from being called", async () => {
    const { root, dom } = makeCounterDomain();
    const seen = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );
    const unsub = dom.addActionListener({ execution: () => seen() });

    await dom.action("increment").execute({ by: 1 });
    unsub();
    await dom.action("decrement").execute({ by: 1 });

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("multiple listeners all fire independently", async () => {
    const { root, dom } = makeCounterDomain();
    const a = vi.fn();
    const b = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );
    dom.addActionListener({ execution: a });
    dom.addActionListener({ execution: b });

    await dom.action("increment").execute({ by: 1 });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("listener receives the primed action (correct input)", async () => {
    const { root, dom } = makeCounterDomain();
    let seenInput: { by: number } | undefined;

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );
    dom.addActionListener({
      execution: (action) => {
        if (action.id === "increment") {
          seenInput = action.input;
        }
      },
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
    const dom = createActionRootDomain({
      domain: "ser_native_root",
    }).createChildDomain({
      domain: "ser_native",
      actions: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const primed = new NiceActionPrimed(dom.action("ping"), { msg: "hello" });
    const json = primed.toJsonObject();

    expect(json).toEqual({
      type: EActionState.primed,
      domain: "ser_native",
      allDomains: ["ser_native", "ser_native_root"],
      id: "ping",
      input: { msg: "hello" },
      cuid: primed.coreAction["cuid"],
      timeCreated: primed.coreAction["timeCreated"],
      timePrimed: primed.timePrimed,
    });
  });

  it("uses the schema's serialize function for non-JSON-native input (Date)", () => {
    const dom = createActionRootDomain({
      domain: "ser_date_root",
    }).createChildDomain({
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
      allDomains: ["ser_date", "ser_date_root"],
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
    const dom = createActionRootDomain({
      domain: "ref_root",
    }).createChildDomain({
      domain: "ref_dom",
      actions: { fire: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    const ref = dom.action("fire");
    expect(ref.toJsonObject()).toEqual({
      type: EActionState.empty,
      domain: "ref_dom",
      allDomains: ["ref_dom", "ref_root"],
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
    const root = createActionRootDomain({ domain: "hydrate_native_root" });
    const dom = root.createChildDomain({
      domain: "hydrate_native",
      actions: { ping: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const received = vi.fn();
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "ping", {
          execution: (primed) => {
            received(primed.input.msg);
          },
        }),
      ]),
    );

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
    const root = createActionRootDomain({ domain: "hydrate_date_root" });
    const dom = root.createChildDomain({
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
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "schedule", {
          execution: (primed) => {
            received(primed.input.at);
          },
        }),
      ]),
    );

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
    const root = createActionRootDomain({ domain: "roundtrip_root" });
    const dom = root.createChildDomain({
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
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "send", {
          execution: (primed) => {
            received(primed.input.ts, primed.input.label);
          },
        }),
      ]),
    );

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
    const dom = createActionRootDomain({
      domain: "known_dom",
    }).createChildDomain({
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
    const dom = createActionRootDomain({
      domain: "known_dom_root",
    }).createChildDomain({
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
