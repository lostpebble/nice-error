/**
 * Runtime tests for NiceActionHandler and environment-id dispatch.
 *
 * Covers:
 *  - forDomain / forActionId / forActionIds / setDefaultHandler behaviour
 *  - First-match-wins priority within a handler
 *  - Handler instance shared across multiple domains
 *  - Named environment ids: setActionHandler({ envId }) + execute(input, envId)
 *  - action_environment_not_found when the requested envId has no handler or resolver
 *  - environment_already_registered when the same envId is registered twice
 *  - Default fallback: no envId → default handler → default resolver → error
 *  - Action listeners fire for both default and named-env dispatches
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import { NiceActionRequester } from "../ActionRequestResponse/ActionRequester/NiceActionRequester";
import { createDomainResolver } from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import { action } from "../ActionSchema/action";

// ---------------------------------------------------------------------------
// Shared domain factory
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
// 1. forDomain — catch-all handler
// ---------------------------------------------------------------------------

describe("NiceActionHandler.forDomain", () => {
  it("fires for every action dispatched through the domain", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester().forDomain(dom, (act) => log(act.coreAction.id));

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"], ["reset"]]);
  });

  it("can return a value from the handler", async () => {
    const dom = createActionDomain({
      domain: "greet",
      schema: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ message: v.string() }) }),
      },
    });

    dom.setActionRequester().forDomain(dom, (act) => {
      const g = dom.matchAction(act, "greet");
      if (g) return { message: `hi ${g.input.name}` };
    });

    const result = await dom.action("greet").execute({ name: "Alice" });
    expect(result).toEqual({ message: "hi Alice" });
  });
});

// ---------------------------------------------------------------------------
// 2. forActionId — per-action narrowed handler
// ---------------------------------------------------------------------------

describe("NiceActionHandler.forActionId", () => {
  it("fires only for the registered action id", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionId(dom, "increment", (act) => log(`inc:${act.input.by}`))
      .forActionId(dom, "decrement", (act) => log(`dec:${act.input.by}`))
      .forActionId(dom, "reset", (act) => log(`rst:${act.input.to}`));

    await dom.action("increment").execute({ by: 3 });
    await dom.action("decrement").execute({ by: 1 });
    await dom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["inc:3"], ["dec:1"], ["rst:0"]]);
  });

  it("act.input is narrowed so domain-specific fields are accessible", async () => {
    const dom = makeCounterDomain();
    let capturedBy: number | undefined;

    dom.setActionRequester().forActionId(dom, "increment", (act) => {
      capturedBy = act.input.by;
    });

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });

  it("throws when no forActionId case matches the executed id", async () => {
    const dom = makeCounterDomain();
    dom.setActionRequester().forActionId(dom, "increment", () => {});

    await expect(dom.action("reset").execute({ to: 0 })).rejects.toThrow(/no handler found/i);
  });
});

// ---------------------------------------------------------------------------
// 3. forActionIds — multi-action handler
// ---------------------------------------------------------------------------

describe("NiceActionHandler.forActionIds", () => {
  it("fires for any action id in the provided list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionIds(dom, ["increment", "decrement"] as const, (act) => log(act.coreAction.id))
      .forActionId(dom, "reset", () => {});

    await dom.action("increment").execute({ by: 1 });
    await dom.action("decrement").execute({ by: 2 });

    expect(log.mock.calls).toEqual([["increment"], ["decrement"]]);
  });

  it("does not fire for an id outside the list", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionIds(dom, ["increment", "decrement"] as const, () => log("batch"))
      .forActionId(dom, "reset", () => log("reset"));

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("reset");
    expect(log).not.toHaveBeenCalledWith("batch");
  });
});

// ---------------------------------------------------------------------------
// 4. setDefaultHandler — fallback
// ---------------------------------------------------------------------------

describe("NiceActionHandler.setDefaultHandler", () => {
  it("fires when no other case matches", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionId(dom, "increment", () => {})
      .setDefaultHandler((act) => log(`default:${act.coreAction.id}`));

    await dom.action("reset").execute({ to: 0 });
    expect(log).toHaveBeenCalledWith("default:reset");
  });

  it("does not fire when a prior case matches", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionId(dom, "increment", () => log("specific"))
      .setDefaultHandler(() => log("default"));

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("default");
  });
});

// ---------------------------------------------------------------------------
// 5. First-match-wins priority
// ---------------------------------------------------------------------------

describe("NiceActionHandler — first-match-wins", () => {
  it("forActionId registered before forDomain takes priority", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forActionId(dom, "increment", () => log("specific"))
      .forDomain(dom, () => log("catchall"));

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("specific");
    expect(log).not.toHaveBeenCalledWith("catchall");
  });

  it("forDomain registered before forActionId catches the action", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester()
      .forDomain(dom, () => log("catchall"))
      .forActionId(dom, "increment", () => log("specific"));

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("catchall");
    expect(log).not.toHaveBeenCalledWith("specific");
  });
});

// ---------------------------------------------------------------------------
// 6. Shared handler across multiple domains
// ---------------------------------------------------------------------------

describe("NiceActionHandler — shared instance", () => {
  it("same handler instance can be registered on two domains", async () => {
    const counterDom = makeCounterDomain();
    const timerDom = createActionDomain({
      domain: "timer",
      schema: {
        start: action().input({ schema: v.object({ ms: v.number() }) }),
        stop: action().input({ schema: v.object({}) }),
      },
    });
    const log = vi.fn();

    const handler = new NiceActionRequester()
      .forActionId(counterDom, "increment", (act) => log(`counter:${act.input.by}`))
      .forActionId(timerDom, "start", (act) => log(`timer:${act.input.ms}`))
      .setDefaultHandler((act) => log(`fallback:${act.coreAction.id}`));

    counterDom.setActionRequester(handler);
    timerDom.setActionRequester(handler);

    await counterDom.action("increment").execute({ by: 5 });
    await timerDom.action("start").execute({ ms: 1000 });
    await counterDom.action("reset").execute({ to: 0 });

    expect(log.mock.calls).toEqual([["counter:5"], ["timer:1000"], ["fallback:reset"]]);
  });
});

// ---------------------------------------------------------------------------
// 7. Named environment ids — setActionHandler({ envId })
// ---------------------------------------------------------------------------

describe("named environment — handler envId", () => {
  it("execute(input, envId) routes to the named handler", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom
      .setActionRequester(undefined, { envId: "worker" })
      .forActionId(dom, "increment", (act) => log(`worker:${act.input.by}`));

    await dom.action("increment").execute({ by: 4 }, "worker");
    expect(log).toHaveBeenCalledWith("worker:4");
  });

  it("named handler does not fire when envId is omitted", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester(undefined, { envId: "worker" }).forDomain(dom, () => log("worker"));

    // No default handler registered → should throw
    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow();
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named handlers can coexist", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester(undefined, { envId: "a" }).forDomain(dom, () => log("a"));
    dom.setActionRequester(undefined, { envId: "b" }).forDomain(dom, () => log("b"));

    await dom.action("increment").execute({ by: 1 }, "a");
    await dom.action("increment").execute({ by: 1 }, "b");

    expect(log.mock.calls).toEqual([["a"], ["b"]]);
  });

  it("default and named handlers can coexist independently", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester().forDomain(dom, () => log("default"));
    dom.setActionRequester(undefined, { envId: "named" }).forDomain(dom, () => log("named"));

    await dom.action("increment").execute({ by: 1 });
    await dom.action("increment").execute({ by: 1 }, "named");

    expect(log.mock.calls).toEqual([["default"], ["named"]]);
  });

  it("throws action_environment_not_found when envId has no handler or resolver", async () => {
    const dom = makeCounterDomain();
    dom.setActionRequester().forDomain(dom, () => {});

    await expect(dom.action("increment").execute({ by: 1 }, "missing")).rejects.toThrow(
      /no handler or resolver registered with environment id/i,
    );
  });

  it("throws environment_already_registered when the same envId is used twice", () => {
    const dom = makeCounterDomain();
    dom.setActionRequester(undefined, { envId: "dup" });

    expect(() => dom.setActionRequester(undefined, { envId: "dup" })).toThrow(
      /already registered/i,
    );
  });

  it("throws domain_action_handler_conflict when default handler registered twice", () => {
    const dom = makeCounterDomain();
    dom.setActionRequester();

    expect(() => dom.setActionRequester()).toThrow(/already has a handler/i);
  });
});

// ---------------------------------------------------------------------------
// 8. Handler takes priority over resolver when both are registered
// ---------------------------------------------------------------------------

describe("handler vs resolver priority", () => {
  it("default handler fires before default resolver", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester().forDomain(dom, () => log("handler"));
    dom.registerResponder(
      createDomainResolver(dom)
        .resolveAction("increment", () => {
          log("resolver");
        })
        .resolveAction("decrement", () => {})
        .resolveAction("reset", () => {}),
    );

    await dom.action("increment").execute({ by: 1 });
    expect(log).toHaveBeenCalledWith("handler");
    expect(log).not.toHaveBeenCalledWith("resolver");
  });

  it("named handler fires before named resolver for the same envId", async () => {
    const dom = makeCounterDomain();
    const log = vi.fn();

    dom.setActionRequester(undefined, { envId: "env" }).forDomain(dom, () => log("handler"));

    dom.registerResponder(
      createDomainResolver(dom)
        .resolveAction("increment", () => {
          log("resolver");
        })
        .resolveAction("decrement", () => {})
        .resolveAction("reset", () => {}),
      { envId: "env" },
    );

    await dom.action("increment").execute({ by: 1 }, "env");
    expect(log).toHaveBeenCalledWith("handler");
    expect(log).not.toHaveBeenCalledWith("resolver");
  });
});

// ---------------------------------------------------------------------------
// 9. Action listeners fire regardless of dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — envId dispatch", () => {
  it("listener fires after named-env handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setActionRequester(undefined, { envId: "env" }).forDomain(dom, () => {});
    dom.addActionListener((act) => seen(act.coreAction.id));

    await dom.action("increment").execute({ by: 1 }, "env");
    expect(seen).toHaveBeenCalledWith("increment");
  });

  it("listener fires after default handler dispatch", async () => {
    const dom = makeCounterDomain();
    const seen = vi.fn();

    dom.setActionRequester().forDomain(dom, () => {});
    dom.addActionListener(() => seen());

    await dom.action("reset").execute({ to: 0 });
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 10. No handler, no resolver → domain_no_handler
// ---------------------------------------------------------------------------

describe("no handler, no resolver", () => {
  it("execute throws domain_no_handler when nothing is registered", async () => {
    const dom = makeCounterDomain();

    await expect(dom.action("increment").execute({ by: 1 })).rejects.toThrow(/no action handler/i);
  });
});
