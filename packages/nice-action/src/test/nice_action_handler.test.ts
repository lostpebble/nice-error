/**
 * Runtime tests for ActionHandler and environment-id dispatch.
 *
 * Covers:
 *  - forDomain / forAction / forActionIds / setDefaultHandler behaviour
 *  - First-match-wins priority within a handler
 *  - Handler instance shared across multiple domains
 *  - Named environment ids: ActionHandler({ tag }) + execute(input, tag)
 *  - action_tag_handler_not_found when the requested tag has no handler
 *  - environment_already_registered when setRuntimeEnvironment is called twice
 *  - Default fallback: no tag → default handler → error
 *  - Action listeners fire for both default and named-env dispatches
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { createActionRuntime } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// Shared domain factory
// ---------------------------------------------------------------------------

const makeCounterDomain = () => {
  const root = createActionRootDomain({ domain: "test_handler_root" });
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
// 1. forDomain — catch-all handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forDomain", () => {
  it("fires for every action dispatched through the domain", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: (primed) => log(primed.coreAction.id) }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"], ["reset"]]);
  });

  it("can return a value from the handler", async () => {
    const root = createActionRootDomain({ domain: "test_greet_root" });
    const dom = root.createChildDomain({
      domain: "greet",
      actions: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ message: v.string() }) }),
      },
    });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, {
          execution: (primed) => {
            if (primed.id === "greet") {
              return primed.setResponse({ message: `hi ${primed.input.name}` });
            }
          },
        }),
      ]),
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
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forAction(dom, "increment", { execution: (primed) => log(`inc:${primed.input.by}`) })
          .forAction(dom, "decrement", { execution: (primed) => log(`dec:${primed.input.by}`) })
          .forAction(dom, "reset", { execution: (primed) => log(`rst:${primed.input.to}`) }),
      ]),
    );

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["inc:3"], ["dec:1"], ["rst:0"]]);
  });

  it("primed.input is narrowed so domain-specific fields are accessible", async () => {
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

  it("throws when no forAction case matches the executed id", async () => {
    const { root, dom } = makeCounterDomain();
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(dom, "increment", { execution: () => {} }),
      ]),
    );

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(/no action handler/i);
  });
});

// ---------------------------------------------------------------------------
// 3. forActionIds — multi-action handler
// ---------------------------------------------------------------------------

describe("ActionHandler.forActionIds", () => {
  it("fires for any action id in the provided list", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forActionIds(dom, ["increment", "decrement"] as const, {
            execution: (primed) => log(primed.coreAction.id),
          })
          .forAction(dom, "reset", { execution: () => {} }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"]]);
  });

  it("does not fire for an id outside the list", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forActionIds(dom, ["increment", "decrement"] as const, {
            execution: () => log("batch"),
          })
          .forAction(dom, "reset", { execution: () => log("reset") }),
      ]),
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
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" })
        .addHandlers([new ActionHandler().forAction(dom, "increment", { execution: () => {} })])
        .setDefaultHandler({ execution: (primed) => log(`default:${primed.coreAction.id}`) }),
    );

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("default:reset");
  });

  it("does not fire when a prior case matches", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" })
        .addHandlers([
          new ActionHandler().forAction(dom, "increment", { execution: () => log("specific") }),
        ])
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
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forAction(dom, "increment", { execution: () => log("specific") })
          .forDomain(dom, { execution: () => log("catchall") }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });

  it("forDomain registered before forAction but (more specific) forAction takes priority", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler()
          .forDomain(dom, { execution: () => log("catchall") })
          .forAction(dom, "increment", { execution: () => log("specific") }),
      ]),
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
    const { root: counterRoot, dom: counterDom } = makeCounterDomain();
    const timerRoot = createActionRootDomain({ domain: "test_handler_root_timer" });
    const timerDom = timerRoot.createChildDomain({
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
      .forAction(timerDom, "start", { execution: (primed) => log(`timer:${primed.input.ms}`) });

    counterRoot.setRuntimeEnvironment(
      createActionRuntime({ envId: "counter" })
        .addHandlers([handler])
        .setDefaultHandler({ execution: (primed) => log(`fallback:${primed.coreAction.id}`) }),
    );
    timerRoot.setRuntimeEnvironment(createActionRuntime({ envId: "timer" }).addHandlers([handler]));

    await counterDom.action("increment").execute({ by: 5 });
    await timerDom.action("start").execute({ ms: 1000 });
    await counterDom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["counter:5"], ["timer:1000"], ["fallback:reset"]]);
  });
});

// ---------------------------------------------------------------------------
// 7. Named environment ids — ActionHandler({ tag })
// ---------------------------------------------------------------------------

describe("named environment — handler tag", () => {
  it("execute(input, tag) routes to the named handler", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "worker" }).forAction(dom, "increment", {
          execution: (primed) => log(`worker:${primed.input.by}`),
        }),
      ]),
    );

    await dom.action("increment").execute({ by: 4 }, { tag: "worker" });
    expect(log).toHaveBeenCalledWith("worker:4");
  });

  it("named handler does not fire when tag is omitted", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "worker" }).forDomain(dom, { execution: () => log("worker") }),
      ]),
    );

    // No default handler registered → should throw
    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named handlers can coexist", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "a" }).forDomain(dom, { execution: () => log("a") }),
        new ActionHandler({ tag: "b" }).forDomain(dom, { execution: () => log("b") }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 }, { tag: "a" });
    await dom.action("increment").execute({ by: 1 }, { tag: "b" });

    expect(log.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("default and named handlers can coexist independently", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => log("default") }),
        new ActionHandler({ tag: "named" }).forDomain(dom, { execution: () => log("named") }),
      ]),
    );

    await dom.action("increment").execute({ by: 1 });
    await dom.action("increment").execute({ by: 1 }, { tag: "named" });

    expect(log.mock.calls).toEqual([["default"], ["named"]]);
  });

  it("throws action_environment_not_found when tag is unknown and no default handler exists", async () => {
    const { root, dom } = makeCounterDomain();
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );

    await expect(dom.action("increment").execute({ by: 1 }, { tag: "missing" })).rejects.toThrow(
      /no handler registered for tag/i,
    );
  });

  it("does not use default handler as fallback when tag is unregistered", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn<(src: string) => void>();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, {
          execution: (primed) => {
            log("default-fallback");
            primed.setResponse();
          },
        }),
      ]),
    );

    await dom.action("increment").executeSafe({ by: 1 }, { tag: "unregistered" });

    expect(log).not.toHaveBeenCalled();
  });

  it("throws environment_already_registered when setRuntimeEnvironment is called twice", () => {
    const { root } = makeCounterDomain();
    root.setRuntimeEnvironment(createActionRuntime({ envId: "env1" }));

    expect(() => root.setRuntimeEnvironment(createActionRuntime({ envId: "env2" }))).toThrow(
      /already/i,
    );
  });
});

// ---------------------------------------------------------------------------
// 8. Action listeners fire regardless of dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — tag dispatch", () => {
  it("listener fires after named-tag handler dispatch", async () => {
    const { root, dom } = makeCounterDomain();
    const seen = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "env" }).forDomain(dom, { execution: () => {} }),
      ]),
    );
    dom.addActionListener({ execution: (act) => seen(act.coreAction.id) });

    await dom.action("increment").execute({ by: 1 }, { tag: "env" });
    expect(seen).toHaveBeenCalledWith("increment");
  });

  it("listener fires after default handler dispatch", async () => {
    const { root, dom } = makeCounterDomain();
    const seen = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );
    dom.addActionListener({ execution: () => seen() });

    await dom.action("reset").execute({ to: 0 });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 9. No handler → domain_no_handler
// ---------------------------------------------------------------------------

describe("no handler", () => {
  it("execute throws domain_no_handler when nothing is registered", async () => {
    const { root, dom } = makeCounterDomain();
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test" }));

    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow(/no action handler/i);
  });
});

// ---------------------------------------------------------------------------
// 10. Input validation fires before handler
// ---------------------------------------------------------------------------

describe("handler — input validation", () => {
  it("throws action_input_validation_failed when input fails schema via default handler", async () => {
    const root = createActionRootDomain({ domain: "validated_root" });
    const dom = root.createChildDomain({
      domain: "validated",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, { execution: () => {} }),
      ]),
    );

    await expect(dom.action("ping").execute({ count: 0 })).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("throws action_input_validation_failed when input fails schema via named tag handler", async () => {
    const root = createActionRootDomain({ domain: "validated_root" });
    const dom = root.createChildDomain({
      domain: "validated_named",
      actions: {
        ping: action().input({ schema: v.object({ count: v.pipe(v.number(), v.minValue(1)) }) }),
      },
    });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "worker" }).forDomain(dom, { execution: () => {} }),
      ]),
    );

    await expect(dom.action("ping").execute({ count: 0 }, { tag: "worker" })).rejects.toThrow(
      /input validation failed/i,
    );
  });

  it("handler receives the validated (transformed) input value", async () => {
    const root = createActionRootDomain({ domain: "validated_root" });
    const dom = root.createChildDomain({
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
    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forDomain(dom, {
          execution: (primed) => {
            received = primed.input;
          },
        }),
      ]),
    );

    await dom.action("double").execute({ count: 5 });
    expect(received).toEqual({ count: 10 });
  });

  it("valid input passes through and handler fires normally", async () => {
    const { root, dom } = makeCounterDomain();
    const log = vi.fn();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "worker" }).forAction(dom, "increment", {
          execution: (primed) => log(primed.input.by),
        }),
      ]),
    );

    await dom.action("increment").execute({ by: 5 }, { tag: "worker" });
    expect(log).toHaveBeenCalledWith(5);
  });
});
