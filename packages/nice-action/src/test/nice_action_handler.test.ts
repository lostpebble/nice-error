/**
 * Runtime tests for ActionHandler and environment-id dispatch.
 *
 * Covers:
 *  - forDomain / forAction / forActionIds / setDefaultHandler behaviour
 *  - First-match-wins priority within a handler
 *  - Handler instance shared across multiple domains
 *  - Named environment ids: setHandler(h, { envId }) + execute(input, envId)
 *  - action_environment_not_found when the requested envId has no handler
 *  - environment_already_registered when the same envId is registered twice
 *  - Default fallback: no envId → default handler → error
 *  - resolve() vs forDomain() priority within a single ActionHandler
 *  - Action listeners fire for both default and named-env dispatches
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// Shared domain factory
// ---------------------------------------------------------------------------

const makeCounterDomain = () =>
  createActionRootDomain({
    domain: "test_handler_root",
  }).createChildDomain({
    domain: "counter",
    actions: {
      increment: action().input({ schema: v.object({ by: v.number() }) }),
      decrement: action().input({ schema: v.object({ by: v.number() }) }),
      reset: action().input({ schema: v.object({ to: v.number() }) }),
    },
  });

// ---------------------------------------------------------------------------
// 1. forDomain — catch-all handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forDomain", () => {
  it("fires for every action dispatched through the domain", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler().forDomain(dom, { execution: (primed) => log(primed.coreAction.id) }),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"], ["reset"]]);
  });

  it("can return a value from the handler", async () => {
    const dom = createActionRootDomain({
      domain: "test_greet_root",
    }).createChildDomain({
      domain: "greet",
      actions: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ message: v.string() }) }),
      },
    });

    dom.setHandler(
      new ActionHandler().forDomain(dom, {
        execution: (primed) => {
          const g = dom.matchAction(primed, "greet");
          if (g) return primed.setResponse({ message: `hi ${g.input.name}` });
        },
      }),
    );

    const result = await dom.action("greet").execute({ name: "Alice" });
    expect(result).toEqual({ message: "hi Alice" });
  });
});

// ---------------------------------------------------------------------------
// 2. forAction — per-action narrowed handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forAction", () => {
  it("fires only for the registered action id", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "increment", { execution: (primed) => log(`inc:${primed.input.by}`) })
        .forAction(dom, "decrement", { execution: (primed) => log(`dec:${primed.input.by}`) })
        .forAction(dom, "reset", { execution: (primed) => log(`rst:${primed.input.to}`) }),
    );

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["inc:3"], ["dec:1"], ["rst:0"]]);
  });

  it("primed.input is narrowed so domain-specific fields are accessible", async () => {
    const dom = makeCounterDomain();
    let capturedBy: number | undefined;

    dom.setHandler(
      new ActionHandler().forAction(dom, "increment", {
        execution: (primed) => {
          capturedBy = primed.input.by;
        },
      }),
    );

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });

  it("throws when no forAction case matches the executed id", async () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler().forAction(dom, "increment", { execution: () => {} }));

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(/no action handler/i);
  });
});

// ---------------------------------------------------------------------------
// 3. forActionIds — multi-action handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forActionIds", () => {
  it("fires for any action id in the provided list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forActionIds(dom, ["increment", "decrement"] as const, {
          execution: (primed) => log(primed.coreAction.id),
        })
        .forAction(dom, "reset", { execution: () => {} }),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"]]);
  });

  it("does not fire for an id outside the list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forActionIds(dom, ["increment", "decrement"] as const, { execution: () => log("batch") })
        .forAction(dom, "reset", { execution: () => log("reset") }),
    );

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("reset");
    expect(log).not.toHaveBeenCalledWith("batch");
  });
});

// ---------------------------------------------------------------------------
// 4. setDefaultHandler — fallback
// ---------------------------------------------------------------------------

describe("ActionHandler.setDefaultHandler", () => {
  it("fires when no other case matches", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "increment", { execution: () => {} })
        .setDefaultHandler({ execution: (primed) => log(`default:${primed.coreAction.id}`) }),
    );

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("default:reset");
  });

  it("does not fire when a prior case matches", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "increment", { execution: () => log("specific") })
        .setDefaultHandler({ execution: () => log("default") }),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("default");
  });
});

// ---------------------------------------------------------------------------
// 5. First-match-wins priority
// ---------------------------------------------------------------------------

describe("ActionHandler — first-match-wins", () => {
  it("forAction registered before forDomain takes priority", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "increment", { execution: () => log("specific") })
        .forDomain(dom, { execution: () => log("catchall") }),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });

  it("forDomain registered before forAction but (more specific) forAction takes priority", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forDomain(dom, { execution: () => log("catchall") })
        .forAction(dom, "increment", { execution: () => log("specific") }),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });
});

// ---------------------------------------------------------------------------
// 6. Shared handler across multiple domains
// ---------------------------------------------------------------------------

describe("ActionHandler — shared instance", () => {
  it("same handler instance can be registered on two domains", async () => {
    const counterDom = makeCounterDomain();
    const timerDom = createActionRootDomain({
      domain: "test_handler_root",
    }).createChildDomain({
      domain: "timer",
      actions: {
        start: action().input({ schema: v.object({ ms: v.number() }) }),
        stop: action().input({ schema: v.object({}) }),
      },
    });
    const log = vi.fn();

    const handler = new ActionHandler()
      .forAction(counterDom, "increment", {
        execution: (primed) => log(`counter:${primed.input.by}`),
      })
      .forAction(timerDom, "start", { execution: (primed) => log(`timer:${primed.input.ms}`) })
      .setDefaultHandler({ execution: (primed) => log(`fallback:${primed.coreAction.id}`) });

    counterDom.setHandler(handler);
    timerDom.setHandler(handler);

    await counterDom.action("increment").execute({ by: 5 });
    await timerDom.action("start").execute({ ms: 1000 });
    await counterDom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["counter:5"], ["timer:1000"], ["fallback:reset"]]);
  });
});

// ---------------------------------------------------------------------------
// 7. Named environment ids — setHandler(h, { envId })
// ---------------------------------------------------------------------------

describe("named environment — handler envId", () => {
  it("execute(input, envId) routes to the named handler", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler().forAction(dom, "increment", {
        execution: (primed) => log(`worker:${primed.input.by}`),
      }),
      { matchTag: "worker" },
    );

    await dom.action("increment").execute({ by: 4 }, "worker");
    expect(log).toHaveBeenCalledWith("worker:4");
  });

  it("named handler does not fire when envId is omitted", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => log("worker") }), {
      matchTag: "worker",
    });

    // No default handler registered → should throw
    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named handlers can coexist", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => log("a") }), {
      matchTag: "a",
    });
    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => log("b") }), {
      matchTag: "b",
    });

    await dom.action("increment").execute({ by: 1 }, "a");
    await dom.action("increment").execute({ by: 1 }, "b");

    expect(log.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("default and named handlers can coexist independently", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => log("default") }));
    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => log("named") }), {
      matchTag: "named",
    });

    await dom.action("increment").execute({ by: 1 });
    await dom.action("increment").execute({ by: 1 }, "named");

    expect(log.mock.calls).toEqual([["default"], ["named"]]);
  });

  it("throws action_environment_not_found when envId is unknown and no default handler exists", async () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => {} }), {
      matchTag: "named",
    });

    await expect(dom.action("increment").execute({ by: 1 }, "missing")).rejects.toThrow(
      /no handler or resolver registered with environment id/i,
    );
  });

  it("uses default handler as fallback when envId is not registered on this domain", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn<(src: string) => void>();

    dom.setHandler(
      new ActionHandler().forDomain(dom, {
        execution: (primed) => {
          log("default-fallback");
          primed.setResponse({ message: "default-fallback" });
        },
      }),
    );

    await dom.action("increment").executeSafe({ by: 1 }, "unregistered");

    expect(log).not.toHaveBeenCalled();
  });

  it("throws environment_already_registered when the same envId is used twice", () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler(), { matchTag: "dup" });

    expect(() => dom.setHandler(new ActionHandler(), { matchTag: "dup" })).toThrow(
      /already registered/i,
    );
  });

  it("throws domain_action_handler_conflict when default handler registered twice", () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler());

    expect(() => dom.setHandler(new ActionHandler())).toThrow(/already has a handler/i);
  });
});

// ---------------------------------------------------------------------------
// 9. Action listeners fire regardless of dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — envId dispatch", () => {
  it("listener fires after named-env handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => {} }), {
      matchTag: "env",
    });
    dom.addActionListener({ execution: (act) => seen(act.coreAction.id) });

    await dom.action("increment").execute({ by: 1 }, "env");
    expect(seen).toHaveBeenCalledWith("increment");
  });

  it("listener fires after default handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => {} }));
    dom.addActionListener({ execution: () => seen() });

    await dom.action("reset").execute({ to: 0 });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 10. No handler → domain_no_handler
// ---------------------------------------------------------------------------

describe("no handler", () => {
  it("execute throws domain_no_handler when nothing is registered", async () => {
    const dom = makeCounterDomain();

    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow(/no action handler/i);
  });
});

// ---------------------------------------------------------------------------
// 11. Input validation fires before handler
// ---------------------------------------------------------------------------

describe("handler — input validation", () => {
  it("throws action_input_validation_failed when input fails schema via default handler", async () => {
    const dom = createActionRootDomain({
      domain: "validated_root",
    }).createChildDomain({
      domain: "validated",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => {} }));

    await expect(dom.action("ping").execute({ count: 0 })).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("throws action_input_validation_failed when input fails schema via named envId handler", async () => {
    const dom = createActionRootDomain({
      domain: "validated_root",
    }).createChildDomain({
      domain: "validated_named",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    dom.setHandler(new ActionHandler().forDomain(dom, { execution: () => {} }), {
      matchTag: "worker",
    });

    await expect(dom.action("ping").execute({ count: 0 }, "worker")).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("handler receives the validated (transformed) input value", async () => {
    const dom = createActionRootDomain({
      domain: "validated_root",
    }).createChildDomain({
      domain: "transformed",
      actions: {
        double: action().input({
          schema: v.object({
            count: v.pipe(
              v.number(),
              v.transform((n) => n * 2),
            ),
          }),
        }),
      },
    });

    let received: unknown;
    dom.setHandler(
      new ActionHandler().forDomain(dom, {
        execution: (primed) => {
          received = primed.input;
        },
      }),
    );

    await dom.action("double").execute({ count: 5 });
    expect(received).toEqual({ count: 10 });
  });

  it("valid input passes through and handler fires normally", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler().forAction(dom, "increment", {
        execution: (primed) => log(primed.input.by),
      }),
    );

    await dom.action("increment").execute({ by: 5 });
    expect(log).toHaveBeenCalledWith(5);
  });
});
