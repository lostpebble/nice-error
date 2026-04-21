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
import { createActionRootDomain } from "../ActionDomain/RootDomain/createActionRootDomain";
import { ActionHandler } from "../ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// Shared domain factory
// ---------------------------------------------------------------------------

const makeCounterDomain = () =>
  createActionRootDomain({
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

    dom.setHandler(new ActionHandler().forDomain(dom, (act) => log(act.coreAction.id)));

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"], ["reset"]]);
  });

  it("can return a value from the handler", async () => {
    const dom = createActionRootDomain({
      domain: "greet",
      actions: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ message: v.string() }) }),
      },
    });

    dom.setHandler(
      new ActionHandler().forDomain(dom, (act) => {
        const g = dom.matchAction(act, "greet");
        if (g) return { message: `hi ${g.input.name}` };
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
        .forAction(dom, "increment", (act) => log(`inc:${act.input.by}`))
        .forAction(dom, "decrement", (act) => log(`dec:${act.input.by}`))
        .forAction(dom, "reset", (act) => log(`rst:${act.input.to}`)),
    );

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["inc:3"], ["dec:1"], ["rst:0"]]);
  });

  it("act.input is narrowed so domain-specific fields are accessible", async () => {
    const dom = makeCounterDomain();
    let capturedBy: number | undefined;

    dom.setHandler(
      new ActionHandler().forAction(dom, "increment", (act) => {
        capturedBy = act.input.by;
      }),
    );

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });

  it("throws when no forAction case matches the executed id", async () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler().forAction(dom, "increment", () => {}));

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
        .forActionIds(dom, ["increment", "decrement"] as const, (act) => log(act.coreAction.id))
        .forAction(dom, "reset", () => {}),
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
        .forActionIds(dom, ["increment", "decrement"] as const, () => log("batch"))
        .forAction(dom, "reset", () => log("reset")),
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
        .forAction(dom, "increment", () => {})
        .setDefaultHandler((act) => log(`default:${act.coreAction.id}`)),
    );

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("default:reset");
  });

  it("does not fire when a prior case matches", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "increment", () => log("specific"))
        .setDefaultHandler(() => log("default")),
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
        .forAction(dom, "increment", () => log("specific"))
        .forDomain(dom, () => log("catchall")),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });

  it("forDomain registered before forAction catches the action", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forDomain(dom, () => log("catchall"))
        .forAction(dom, "increment", () => log("specific")),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("catchall");
    expect(log).not.toHaveBeenCalledWith("specific");
  });
});

// ---------------------------------------------------------------------------
// 6. Shared handler across multiple domains
// ---------------------------------------------------------------------------

describe("ActionHandler — shared instance", () => {
  it("same handler instance can be registered on two domains", async () => {
    const counterDom = makeCounterDomain();
    const timerDom = createActionRootDomain({
      domain: "timer",
      actions: {
        start: action().input({ schema: v.object({ ms: v.number() }) }),
        stop: action().input({ schema: v.object({}) }),
      },
    });
    const log = vi.fn();

    const handler = new ActionHandler()
      .forAction(counterDom, "increment", (act) => log(`counter:${act.input.by}`))
      .forAction(timerDom, "start", (act) => log(`timer:${act.input.ms}`))
      .setDefaultHandler((act) => log(`fallback:${act.coreAction.id}`));

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
      new ActionHandler().forAction(dom, "increment", (act) => log(`worker:${act.input.by}`)),
      { envId: "worker" },
    );

    await dom.action("increment").execute({ by: 4 }, "worker");
    expect(log).toHaveBeenCalledWith("worker:4");
  });

  it("named handler does not fire when envId is omitted", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler().forDomain(dom, () => log("worker")),
      { envId: "worker" },
    );

    // No default handler registered → should throw
    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named handlers can coexist", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler().forDomain(dom, () => log("a")),
      { envId: "a" },
    );
    dom.setHandler(
      new ActionHandler().forDomain(dom, () => log("b")),
      { envId: "b" },
    );

    await dom.action("increment").execute({ by: 1 }, "a");
    await dom.action("increment").execute({ by: 1 }, "b");

    expect(log.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("default and named handlers can coexist independently", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, () => log("default")));
    dom.setHandler(
      new ActionHandler().forDomain(dom, () => log("named")),
      { envId: "named" },
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("increment").execute({ by: 1 }, "named");

    expect(log.mock.calls).toEqual([["default"], ["named"]]);
  });

  it("throws action_environment_not_found when envId is unknown and no default handler exists", async () => {
    const dom = makeCounterDomain();
    dom.setHandler(
      new ActionHandler().forDomain(dom, () => {}),
      { envId: "named" },
    );

    await expect(dom.action("increment").execute({ by: 1 }, "missing")).rejects.toThrow(
      /no handler or resolver registered with environment id/i,
    );
  });

  it("uses default handler as fallback when envId is not registered on this domain", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn<(src: string) => void>();

    dom.setHandler(new ActionHandler().forDomain(dom, () => log("default-fallback")));

    await dom.action("increment").execute({ by: 1 }, "unregistered");

    expect(log).toHaveBeenCalledWith("default-fallback");
  });

  it("throws environment_already_registered when the same envId is used twice", () => {
    const dom = makeCounterDomain();
    dom.setHandler(new ActionHandler(), { envId: "dup" });

    expect(() => dom.setHandler(new ActionHandler(), { envId: "dup" })).toThrow(
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
// 8. resolve() vs forDomain() priority within a single ActionHandler
// ---------------------------------------------------------------------------

describe("resolve() vs forDomain() priority", () => {
  it("resolve() fires before forDomain() when registered after", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .resolve(dom, "increment", () => {
          log("resolver");
        })
        .forDomain(dom, () => {
          log("handler");
        }),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("resolver");
    expect(log).not.toHaveBeenCalledWith("handler");
  });

  it("resolve() fires before forDomain() even when forDomain() is registered first", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forDomain(dom, () => {
          log("handler");
        })
        .resolve(dom, "increment", () => {
          log("resolver");
        }),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("resolver");
    expect(log).not.toHaveBeenCalledWith("handler");
  });
});

// ---------------------------------------------------------------------------
// 9. Action listeners fire regardless of dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — envId dispatch", () => {
  it("listener fires after named-env handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setHandler(
      new ActionHandler().forDomain(dom, () => {}),
      { envId: "env" },
    );
    dom.addActionListener((act) => seen(act.coreAction.id));

    await dom.action("increment").execute({ by: 1 }, "env");
    expect(seen).toHaveBeenCalledWith("increment");
  });

  it("listener fires after default handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setHandler(new ActionHandler().forDomain(dom, () => {}));
    dom.addActionListener(() => seen());

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
      domain: "validated",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    dom.setHandler(new ActionHandler().forDomain(dom, () => {}));

    await expect(dom.action("ping").execute({ count: 0 })).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("throws action_input_validation_failed when input fails schema via named envId handler", async () => {
    const dom = createActionRootDomain({
      domain: "validated_named",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    dom.setHandler(
      new ActionHandler().forDomain(dom, () => {}),
      { envId: "worker" },
    );

    await expect(dom.action("ping").execute({ count: 0 }, "worker")).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("handler receives the validated (transformed) input value", async () => {
    const dom = createActionRootDomain({
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
      new ActionHandler().forDomain(dom, (act) => {
        received = act.input;
      }),
    );

    await dom.action("double").execute({ count: 5 });
    expect(received).toEqual({ count: 10 });
  });

  it("valid input passes through and handler fires normally", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setHandler(new ActionHandler().forAction(dom, "increment", (act) => log(act.input.by)));

    await dom.action("increment").execute({ by: 5 });
    expect(log).toHaveBeenCalledWith(5);
  });
});
