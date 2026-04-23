/**
 * Runtime tests for the ActionHandler execution layer.
 *
 * Covers:
 *  - Inline execution via forAction() (same-environment, domain.setHandler)
 *  - Execution handler with typed output
 *  - Custom serde (Date) round-trip through the execution handler path
 *  - Named handler envId: setHandler({ matchTag }) + execute(input, matchTag)
 *  - domain_no_handler when no handler registered for an action
 *  - action_environment_not_found when execute targets a missing envId
 *  - environment_already_registered when the same envId is used twice
 *  - Handler fn errors propagate naturally from execute / executeSafe
 *  - ActionHandler.handleWire — wire-format round-trip
 *  - handleWire with serde (Date serialization through wire format)
 *  - handleWire returns { handled: false } when no handler matches
 *  - handleWire throws domain_no_handler for unknown domain
 *  - Full JSON.stringify / JSON.parse transport simulation
 *  - Action listeners fire via the execution dispatch path
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";
import { EActionState } from "../NiceAction/NiceAction.enums";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

// ---------------------------------------------------------------------------
// Shared domain factories
// ---------------------------------------------------------------------------

const makeGreetDomain = () =>
  createActionRootDomain({
    domain: "test_greet_root",
  }).createChildDomain({
    domain: "greet",
    actions: {
      greet: action()
        .input({ schema: v.object({ name: v.string() }) })
        .output({ schema: v.object({ greeting: v.string() }) }),
      shout: action()
        .input({ schema: v.object({ text: v.string() }) })
        .output({ schema: v.object({ result: v.string() }) }),
    },
  });

const makeDateDomain = () =>
  createActionRootDomain({
    domain: "test_date_root",
  }).createChildDomain({
    domain: "date_domain",
    actions: {
      schedule: action()
        .input({
          schema: v.object({ at: v.date() }),
          serialization: {
            serialize: ({ at }) => ({ iso: at.toISOString() }),
            deserialize: (s: { iso: string }) => ({ at: new Date(s.iso) }),
          },
        })
        .output({ schema: v.object({ confirmed: v.boolean() }) }),
    },
  });

// ---------------------------------------------------------------------------
// 1. Inline execution handler — forAction() as default fallback
// ---------------------------------------------------------------------------

describe("forAction() — inline dispatch (same environment)", () => {
  it("execute falls back to the registered handler when set as domain handler", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: (primed) => ({ greeting: `hello ${primed.input.name}` }),
        })
        .forAction(dom, "shout", {
          execution: (primed) => ({ result: primed.input.text.toUpperCase() }),
        }),
    );

    const result = await dom.action("greet").execute({ name: "Alice" });
    expect(result).toEqual({ greeting: "hello Alice" });
  });

  it("handler receives correct input and returns typed output", async () => {
    const dom = makeGreetDomain();
    const received = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: (primed) => {
            received(primed.input.name);
            return { greeting: `hi ${primed.input.name}` };
          },
        })
        .forAction(dom, "shout", {
          execution: (primed) => ({ result: primed.input.text.toUpperCase() }),
        }),
    );

    await dom.action("greet").execute({ name: "Bob" });
    expect(received).toHaveBeenCalledWith("Bob");
  });

  it("async handler fn is awaited correctly", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: async (primed) => {
            await Promise.resolve();
            return { greeting: `async hello ${primed.input.name}` };
          },
        })
        .forAction(dom, "shout", { execution: async (primed) => ({ result: primed.input.text }) }),
    );

    const result = await dom.action("greet").execute({ name: "Carol" });
    expect(result).toEqual({ greeting: "async hello Carol" });
  });

  it("executeSafe wraps handler fn error in { ok: false }", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            throw new Error("handler failed");
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
    );

    const result = await dom.action("greet").executeSafe({ name: "x" });
    expect(result.ok).toBe(false);
  });

  it("execute propagates handler fn errors as thrown exceptions", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            throw new Error("boom");
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
    );

    await expect(dom.action("greet").execute({ name: "x" })).rejects.toThrow("boom");
  });
});

// ---------------------------------------------------------------------------
// 2. Execution handler with custom serialization (Date)
// ---------------------------------------------------------------------------

describe("forAction() — serde (Date input)", () => {
  it("handler receives the deserialized Date object, not the wire string", async () => {
    const dom = makeDateDomain();
    const received = vi.fn();

    dom.setHandler(
      new ActionHandler().forAction(dom, "schedule", {
        execution: (primed) => {
          received(primed.input.at);
          return { confirmed: true };
        },
      }),
    );

    const ts = new Date("2025-06-01T12:00:00Z");
    await dom.action("schedule").execute({ at: ts });
    expect(received).toHaveBeenCalledWith(ts);
    expect(received.mock.calls[0][0]).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// 3. Named handler matchTag
// ---------------------------------------------------------------------------

describe("setHandler({ matchTag }) — named environment", () => {
  it("execute(input, matchTag) routes to the named handler", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: (primed) => {
            log(`named:${primed.input.name}`);
            return { greeting: primed.input.name };
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "edge" },
    );

    await dom.action("greet").execute({ name: "Dave" }, "edge");
    expect(log).toHaveBeenCalledWith("named:Dave");
  });

  it("named handler does not fire when no matchTag is passed", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            log("named");
            return { greeting: "x" };
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "edge" },
    );

    // No default handler → should throw domain_no_handler
    await expect(dom.action("greet").execute({ name: "x" })).rejects.toThrow(/no action handler/i);
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named handlers with different matchTags coexist", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            log("env-a");
            return { greeting: "a" };
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "env-a" },
    );
    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            log("env-b");
            return { greeting: "b" };
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "env-b" },
    );

    await dom.action("greet").execute({ name: "x" }, "env-a");
    await dom.action("greet").execute({ name: "x" }, "env-b");

    expect(log.mock.calls).toEqual([["env-a"], ["env-b"]]);
  });

  it("throws action_environment_not_found when matchTag is unknown and no default handler exists", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", { execution: () => ({ greeting: "x" }) })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "named" },
    );

    await expect(dom.action("greet").execute({ name: "x" }, "ghost")).rejects.toThrow(
      /no handler or resolver registered with environment id/i,
    );
  });

  it("uses default handler as fallback when matchTag is not registered on this domain", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: (primed) => ({ greeting: `Hi ${primed.input.name}` }),
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
    );

    // "unknown" matchTag is never set up — default handler should catch it
    const result = await dom.action("greet").execute({ name: "World" }, "unknown");
    expect(result).toEqual({ greeting: "Hi World" });
  });

  it("throws environment_already_registered when the same matchTag is registered twice", () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", { execution: () => ({ greeting: "x" }) })
      .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) });

    dom.setHandler(handler, { matchTag: "dup" });
    expect(() => dom.setHandler(handler, { matchTag: "dup" })).toThrow(/already registered/i);
  });
});

// ---------------------------------------------------------------------------
// 4. domain_no_handler when no handler registered for an action
// ---------------------------------------------------------------------------

describe("domain_no_handler — missing handler", () => {
  it("throws when handler fn was not registered for the dispatched action", async () => {
    const dom = makeGreetDomain();

    // Only greet is registered — shout is not
    dom.setHandler(
      new ActionHandler().forAction(dom, "greet", { execution: () => ({ greeting: "x" }) }),
    );

    await expect(dom.action("shout").execute({ text: "hello" })).rejects.toThrow(
      /no action handler/i,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. ActionHandler.handleWire — wire-format dispatch
// ---------------------------------------------------------------------------

describe("ActionHandler.handleWire", () => {
  it("routes a serialized action to the correct handler", async () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", {
        execution: (primed) => ({ greeting: `env hello ${primed.input.name}` }),
      })
      .forAction(dom, "shout", {
        execution: (primed) => ({ result: primed.input.text.toUpperCase() }),
      });

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "Eve" }).toJsonObject();
    const result = await handler.handleWire(wire);

    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.response.result.ok).toBe(true);
      if (result.response.result.ok) {
        expect(result.response.result.output).toEqual({ greeting: "env hello Eve" });
      }
    }
  });

  it("returns the full response shape in THandleActionResult", async () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", { execution: () => ({ greeting: "hi" }) })
      .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) });

    const wire = new NiceActionPrimed(dom.action("shout"), { text: "loud" }).toJsonObject();
    const result = await handler.handleWire(wire);

    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.response.domain).toBe("greet");
      expect(result.response.id).toBe("shout");
      expect(result.response.result.ok).toBe(true);
    }
  });

  it("routes to the correct domain when multiple handlers are registered", async () => {
    const greetDom = makeGreetDomain();
    const dateDom = makeDateDomain();

    const handler = new ActionHandler()
      .forAction(greetDom, "greet", {
        execution: (primed) => ({ greeting: `hi ${primed.input.name}` }),
      })
      .forAction(greetDom, "shout", { execution: (primed) => ({ result: primed.input.text }) })
      .forAction(dateDom, "schedule", { execution: () => ({ confirmed: true }) });

    const greetWire = new NiceActionPrimed(greetDom.action("greet"), {
      name: "Frank",
    }).toJsonObject();
    const greetResult = await handler.handleWire(greetWire);
    expect(greetResult.handled).toBe(true);
    if (greetResult.handled && greetResult.response.result.ok) {
      expect(greetResult.response.result.output).toEqual({ greeting: "hi Frank" });
    }

    const dateWire = new NiceActionPrimed(dateDom.action("schedule"), {
      at: new Date("2025-01-01T00:00:00Z"),
    }).toJsonObject();
    const dateResult = await handler.handleWire(dateWire);
    expect(dateResult.handled).toBe(true);
    if (dateResult.handled && dateResult.response.result.ok) {
      expect(dateResult.response.result.output).toEqual({ confirmed: true });
    }
  });

  it("propagates handler fn errors from handleWire", async () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", {
        execution: () => {
          throw new Error("downstream error");
        },
      })
      .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) });

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "x" }).toJsonObject();

    await expect(handler.handleWire(wire)).rejects.toThrow("downstream error");
  });

  it("throws domain_no_handler for an unknown domain", async () => {
    const handler = new ActionHandler();

    await expect(
      handler.handleWire({
        type: EActionState.primed,
        domain: "unknown",
        allDomains: ["unknown"],
        id: "action",
        input: {},
        cuid: "x",
        timeCreated: Date.now() - 1000,
        timePrimed: Date.now(),
      }),
    ).rejects.toThrow(/has no action handler registered/i);
  });

  it("returns { handled: false } when no handler is registered for the action", async () => {
    const dom = makeGreetDomain();
    // Only greet registered, not shout
    const handler = new ActionHandler().forAction(dom, "greet", {
      execution: () => ({ greeting: "x" }),
    });

    const result = await handler.handleWire({
      type: EActionState.primed,
      domain: "greet",
      allDomains: ["greet"],
      id: "shout",
      input: { text: "hi" },
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    });

    expect(result.handled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Cross-transport round-trip with serde
// ---------------------------------------------------------------------------

describe("full transport round-trip — wire format with serde", () => {
  it("Date input serializes over wire and is deserialized in the handler", async () => {
    const dom = makeDateDomain();
    const received = vi.fn();

    const handler = new ActionHandler().forAction(dom, "schedule", {
      execution: (primed) => {
        received(primed.input.at);
        return { confirmed: true };
      },
    });

    const ts = new Date("2025-03-15T09:30:00Z");
    const primed = new NiceActionPrimed(dom.action("schedule"), { at: ts });

    // Simulate cross-process transport: serialize → JSON.stringify → JSON.parse
    const wire = JSON.parse(JSON.stringify(primed.toJsonObject()));
    const result = await handler.handleWire(wire);

    expect(result.handled).toBe(true);
    expect(received.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(received.mock.calls[0][0].toISOString()).toBe(ts.toISOString());
  });

  it("greet domain completes a full JSON.stringify/parse round-trip", async () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", {
        execution: (primed) => ({ greeting: `hello ${primed.input.name}` }),
      })
      .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) });

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "Grace" });
    const wire = JSON.parse(JSON.stringify(primed.toJsonObject()));
    const result = await handler.handleWire(wire);

    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.response.domain).toBe("greet");
      expect(result.response.id).toBe("greet");
      expect(result.response.result.ok).toBe(true);
      if (result.response.result.ok) {
        expect(result.response.result.output).toEqual({ greeting: "hello Grace" });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. response from handleWire — accessing the response directly
// ---------------------------------------------------------------------------

describe("response after handleWire dispatch", () => {
  it("handleWire result.response contains the success response with typed output", async () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler()
      .forAction(dom, "greet", { execution: (primed) => ({ greeting: `hi ${primed.input.name}` }) })
      .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) });

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "Heidi" }).toJsonObject();
    const result = await handler.handleWire(wire);

    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.response.result.ok).toBe(true);
      if (result.response.result.ok) {
        expect(result.response.result.output).toEqual({ greeting: "hi Heidi" });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Action listeners fire via the execution dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — execution dispatch path", () => {
  it("listener fires after inline handler dispatch", async () => {
    const dom = makeGreetDomain();
    const seen = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", { execution: () => ({ greeting: "x" }) })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
    );
    dom.addActionListener({ execution: (act) => seen(act.coreAction.id) });

    await dom.action("greet").execute({ name: "Ivan" });
    expect(seen).toHaveBeenCalledWith("greet");
  });

  it("listener fires after named-env handler dispatch", async () => {
    const dom = makeGreetDomain();
    const seen = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", { execution: () => ({ greeting: "x" }) })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "remote" },
    );
    dom.addActionListener({ execution: (act) => seen(act.coreAction.id) });

    await dom.action("greet").execute({ name: "Ivan" }, "remote");
    expect(seen).toHaveBeenCalledWith("greet");
  });
});

// ---------------------------------------------------------------------------
// 9. NiceActionPrimed.execute with matchTag targeting a handler
// ---------------------------------------------------------------------------

describe("NiceActionPrimed.execute(matchTag) — handler path", () => {
  it("primed.execute(matchTag) routes to the named handler", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: (primed) => {
            log(`primed:${primed.input.name}`);
            return { greeting: primed.input.name };
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "myEnv" },
    );

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "Judy" });
    await primed.execute("myEnv");
    expect(log).toHaveBeenCalledWith("primed:Judy");
  });

  it("primed.executeSafe(matchTag) returns ok:false on handler fn error", async () => {
    const dom = makeGreetDomain();

    dom.setHandler(
      new ActionHandler()
        .forAction(dom, "greet", {
          execution: () => {
            throw new Error("nope");
          },
        })
        .forAction(dom, "shout", { execution: (primed) => ({ result: primed.input.text }) }),
      { matchTag: "fail-env" },
    );

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "x" });
    const result = await primed.executeSafe("fail-env");
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. forAction() chaining
// ---------------------------------------------------------------------------

describe("ActionHandler.forAction() chaining", () => {
  it("forAction() returns the same handler instance for chaining", () => {
    const dom = makeGreetDomain();
    const handler = new ActionHandler();
    const chained = handler.forAction(dom, "greet", { execution: () => ({ greeting: "x" }) });
    expect(chained).toBe(handler);
  });
});
