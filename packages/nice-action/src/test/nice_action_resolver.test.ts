/**
 * Runtime tests for the ActionResolver layer.
 *
 * Covers:
 *  - Inline resolver via registerResolver (same-environment, no handler needed)
 *  - Resolver with typed output
 *  - Custom serde (Date) round-trip through the resolver path
 *  - Named resolver envId: registerResolver({ envId }) + execute(input, envId)
 *  - resolver_action_not_registered when fn is missing for an action id
 *  - action_environment_not_found when execute targets a missing envId
 *  - environment_already_registered when the same envId is used twice for resolvers
 *  - Resolver fn errors propagate naturally from execute / executeSafe
 *  - NiceActionResolverEnvironment.dispatch — wire-format round-trip
 *  - ResolverEnvironment with serde (Date serialization through wire format)
 *  - ResolverEnvironment wraps resolver fn errors in the response (ok: false)
 *  - ResolverEnvironment throws resolver_domain_not_registered for unknown domain
 *  - ResolverEnvironment throws resolver_action_not_registered for unregistered action
 *  - Full JSON.stringify / JSON.parse transport simulation
 *  - Action listeners fire via the resolver dispatch path
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import {
  createDomainResponder,
  NiceActionDomainResponder,
} from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import {
  createResponderEnvironment,
  NiceActionResponderEnvironment,
} from "../ActionRequestResponse/ActionResponder/NiceActionResponderEnvironment";
import { action } from "../ActionSchema/action";
import { EActionState } from "../NiceAction/NiceAction.enums";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

// ---------------------------------------------------------------------------
// Shared domain factories
// ---------------------------------------------------------------------------

const makeGreetDomain = () =>
  createActionDomain({
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
  createActionDomain({
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
// 1. Inline resolver — registerResolver as default fallback
// ---------------------------------------------------------------------------

describe("registerResolver — inline dispatch (same environment)", () => {
  it("execute falls back to the registered resolver when no handler is set", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => ({ greeting: `hello ${name}` }))
        .resolveAction("shout", ({ text }) => ({ result: text.toUpperCase() })),
    );

    const result = await dom.action("greet").execute({ name: "Alice" });
    expect(result).toEqual({ greeting: "hello Alice" });
  });

  it("resolver receives correct input and returns typed output", async () => {
    const dom = makeGreetDomain();
    const received = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", (input) => {
          received(input.name);
          return { greeting: `hi ${input.name}` };
        })
        .resolveAction("shout", ({ text }) => ({ result: text.toUpperCase() })),
    );

    await dom.action("greet").execute({ name: "Bob" });
    expect(received).toHaveBeenCalledWith("Bob");
  });

  it("async resolver fn is awaited correctly", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", async ({ name }) => {
          await Promise.resolve();
          return { greeting: `async hello ${name}` };
        })
        .resolveAction("shout", async ({ text }) => ({ result: text })),
    );

    const result = await dom.action("greet").execute({ name: "Carol" });
    expect(result).toEqual({ greeting: "async hello Carol" });
  });

  it("executeSafe wraps resolver fn error in { ok: false }", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          throw new Error("resolver failed");
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
    );

    const result = await dom.action("greet").executeSafe({ name: "x" });
    expect(result.ok).toBe(false);
  });

  it("execute propagates resolver fn errors as thrown exceptions", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          throw new Error("boom");
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
    );

    await expect(dom.action("greet").execute({ name: "x" })).rejects.toThrow("boom");
  });
});

// ---------------------------------------------------------------------------
// 2. Resolver with custom serialization (Date)
// ---------------------------------------------------------------------------

describe("registerResolver — serde (Date input)", () => {
  it("resolver receives the deserialized Date object, not the wire string", async () => {
    const dom = makeDateDomain();
    const received = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom).resolveAction("schedule", ({ at }) => {
        received(at);
        return { confirmed: true };
      }),
    );

    const ts = new Date("2025-06-01T12:00:00Z");
    await dom.action("schedule").execute({ at: ts });
    expect(received).toHaveBeenCalledWith(ts);
    expect(received.mock.calls[0][0]).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// 3. Named resolver envId
// ---------------------------------------------------------------------------

describe("registerResolver — named envId", () => {
  it("execute(input, envId) routes to the named resolver", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => {
          log(`named:${name}`);
          return { greeting: name };
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "edge" },
    );

    await dom.action("greet").execute({ name: "Dave" }, "edge");
    expect(log).toHaveBeenCalledWith("named:Dave");
  });

  it("named resolver does not fire when no envId is passed", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          log("named");
          return { greeting: "x" };
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "edge" },
    );

    // No default handler/resolver → should throw domain_no_handler
    await expect(dom.action("greet").execute({ name: "x" })).rejects.toThrow(/no action handler/i);
    expect(log).not.toHaveBeenCalled();
  });

  it("multiple named resolvers with different envIds coexist", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          log("env-a");
          return { greeting: "a" };
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "env-a" },
    );
    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          log("env-b");
          return { greeting: "b" };
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "env-b" },
    );

    await dom.action("greet").execute({ name: "x" }, "env-a");
    await dom.action("greet").execute({ name: "x" }, "env-b");

    expect(log.mock.calls).toEqual([["env-a"], ["env-b"]]);
  });

  it("throws action_environment_not_found when envId is unknown and no default resolver exists", async () => {
    const dom = makeGreetDomain();

    // Only a named env resolver — no default fallback.
    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => ({ greeting: "x" }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "named" },
    );

    await expect(dom.action("greet").execute({ name: "x" }, "ghost")).rejects.toThrow(
      /no handler or resolver registered with environment id/i,
    );
  });

  it("uses default resolver as fallback when envId is not registered on this domain", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => ({ greeting: `Hi ${name}` }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    );

    // "unknown" envId is never set up — default resolver should catch it
    const result = await dom.action("greet").execute({ name: "World" }, "unknown");
    expect(result).toEqual({ greeting: "Hi World" });
  });

  it("throws environment_already_registered when the same envId is registered twice", () => {
    const dom = makeGreetDomain();
    const resolver = createDomainResponder(dom)
      .resolveAction("greet", () => ({ greeting: "x" }))
      .resolveAction("shout", ({ text }) => ({ result: text }));

    dom.registerResponder(resolver, { envId: "dup" });
    expect(() => dom.registerResponder(resolver, { envId: "dup" })).toThrow(/already registered/i);
  });
});

// ---------------------------------------------------------------------------
// 4. resolver_action_not_registered
// ---------------------------------------------------------------------------

describe("resolver_action_not_registered", () => {
  it("throws when resolver fn was not registered for the dispatched action", async () => {
    const dom = makeGreetDomain();

    // Only greet is registered — shout is not
    dom.registerResponder(
      createDomainResponder(dom).resolveAction("greet", () => ({ greeting: "x" })),
    );

    await expect(dom.action("shout").execute({ text: "hello" })).rejects.toThrow(
      /no resolver registered for action/i,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. NiceActionResolverEnvironment — wire-format dispatch
// ---------------------------------------------------------------------------

describe("NiceActionResolverEnvironment", () => {
  it("dispatch routes a serialized action to the correct domain resolver", async () => {
    const dom = makeGreetDomain();
    const resolver = createDomainResponder(dom)
      .resolveAction("greet", ({ name }) => ({ greeting: `env hello ${name}` }))
      .resolveAction("shout", ({ text }) => ({ result: text.toUpperCase() }));

    const env = createResponderEnvironment([resolver]);

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "Eve" }).toJsonObject();
    const response = await env.dispatch(wire);

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.output).toEqual({ greeting: "env hello Eve" });
    }
  });

  it("dispatch returns the full ISerializedNiceActionResponse shape", async () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      createDomainResponder(dom)
        .resolveAction("greet", () => ({ greeting: "hi" }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    ]);

    const wire = new NiceActionPrimed(dom.action("shout"), { text: "loud" }).toJsonObject();
    const response = await env.dispatch(wire);

    expect(response).toMatchObject({
      domain: "greet",
      id: "shout",
      ok: true,
    });
  });

  it("dispatch routes to the correct domain when multiple resolvers are registered", async () => {
    const greetDom = makeGreetDomain();
    const dateDom = makeDateDomain();

    const env = createResponderEnvironment([
      createDomainResponder(greetDom)
        .resolveAction("greet", ({ name }) => ({ greeting: `hi ${name}` }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
      createDomainResponder(dateDom).resolveAction("schedule", () => ({ confirmed: true })),
    ]);

    const greetWire = new NiceActionPrimed(greetDom.action("greet"), {
      name: "Frank",
    }).toJsonObject();
    const greetResp = await env.dispatch(greetWire);
    expect(greetResp.ok).toBe(true);
    if (greetResp.ok) expect(greetResp.output).toEqual({ greeting: "hi Frank" });

    const dateWire = new NiceActionPrimed(dateDom.action("schedule"), {
      at: new Date("2025-01-01T00:00:00Z"),
    }).toJsonObject();
    const dateResp = await env.dispatch(dateWire);
    expect(dateResp.ok).toBe(true);
    if (dateResp.ok) expect(dateResp.output).toEqual({ confirmed: true });
  });

  it("dispatch wraps resolver fn errors in the response as { ok: false }", async () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          throw new Error("downstream error");
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
    ]);

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "x" }).toJsonObject();
    const response = await env.dispatch(wire);

    expect(response.ok).toBe(false);
    if (!response.ok) {
      // Error is cast and serialized — must have the standard NiceError JSON shape
      expect(response.error).toMatchObject({ ids: expect.any(Array) });
    }
  });

  it("dispatch throws resolver_domain_not_registered for an unknown domain", async () => {
    const env = createResponderEnvironment([]);

    await expect(
      env.dispatch({
        type: EActionState.primed,
        domain: "unknown",
        allDomains: ["unknown"],
        id: "action",
        input: {},
        cuid: "x",
        timeCreated: Date.now() - 1000,
        timePrimed: Date.now(),
      }),
    ).rejects.toThrow(/no resolver registered for domain/i);
  });

  it("dispatch throws resolver_action_not_registered when fn is absent for the action", async () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      // Only greet registered, not shout
      createDomainResponder(dom).resolveAction("greet", () => ({ greeting: "x" })),
    ]);

    await expect(
      env.dispatch({
        type: EActionState.primed,
        domain: "greet",
        allDomains: ["greet"],
        id: "shout",
        input: { text: "hi" },
        cuid: "x",
        timeCreated: Date.now() - 1000,
        timePrimed: Date.now(),
      }),
    ).rejects.toThrow(/no resolver registered for action/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Cross-transport round-trip with serde
// ---------------------------------------------------------------------------

describe("full transport round-trip — wire format with serde", () => {
  it("Date input serializes over wire and is deserialized in the resolver", async () => {
    const dom = makeDateDomain();
    const received = vi.fn();

    const env = createResponderEnvironment([
      createDomainResponder(dom).resolveAction("schedule", ({ at }) => {
        received(at);
        return { confirmed: true };
      }),
    ]);

    const ts = new Date("2025-03-15T09:30:00Z");
    const primed = new NiceActionPrimed(dom.action("schedule"), { at: ts });

    // Simulate cross-process transport: serialize → JSON.stringify → JSON.parse
    const wire = JSON.parse(JSON.stringify(primed.toJsonObject()));
    const response = await env.dispatch(wire);

    expect(response.ok).toBe(true);
    // Resolver received a proper Date, not a string
    expect(received.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(received.mock.calls[0][0].toISOString()).toBe(ts.toISOString());
  });

  it("greet domain completes a full JSON.stringify/parse round-trip", async () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => ({ greeting: `hello ${name}` }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    ]);

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "Grace" });
    const wire = JSON.parse(JSON.stringify(primed.toJsonObject()));
    const response = await env.dispatch(wire);

    expect(response).toMatchObject({
      domain: "greet",
      id: "greet",
      ok: true,
      output: { greeting: "hello Grace" },
    });
  });
});

// ---------------------------------------------------------------------------
// 7. hydrateResponse — reconstructing the response on the receiving side
// ---------------------------------------------------------------------------

describe("hydrateResponse after ResolverEnvironment dispatch", () => {
  it("domain.hydrateResponse reconstructs the success response with typed output", async () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => ({ greeting: `hi ${name}` }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    ]);

    const wire = new NiceActionPrimed(dom.action("greet"), { name: "Heidi" }).toJsonObject();
    const serializedResponse = await env.dispatch(wire);

    // Client side: hydrate the response back
    const response = dom.hydrateResponse(serializedResponse);
    expect(response.result.ok).toBe(true);
    if (response.result.ok) {
      expect(response.result.output).toEqual({ greeting: "hi Heidi" });
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Action listeners fire via the resolver dispatch path
// ---------------------------------------------------------------------------

describe("action listeners — resolver dispatch path", () => {
  it("listener fires after inline resolver dispatch", async () => {
    const dom = makeGreetDomain();
    const seen = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => ({ greeting: "x" }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    );
    dom.addActionListener((act) => seen(act.coreAction.id));

    await dom.action("greet").execute({ name: "Ivan" });
    expect(seen).toHaveBeenCalledWith("greet");
  });

  it("listener fires after named-env resolver dispatch", async () => {
    const dom = makeGreetDomain();
    const seen = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => ({ greeting: "x" }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "remote" },
    );
    dom.addActionListener((act) => seen(act.coreAction.id));

    await dom.action("greet").execute({ name: "Ivan" }, "remote");
    expect(seen).toHaveBeenCalledWith("greet");
  });
});

// ---------------------------------------------------------------------------
// 9. NiceActionPrimed.execute with envId targeting a resolver
// ---------------------------------------------------------------------------

describe("NiceActionPrimed.execute(envId) — resolver path", () => {
  it("primed.execute(envId) routes to the named resolver", async () => {
    const dom = makeGreetDomain();
    const log = vi.fn();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", ({ name }) => {
          log(`primed:${name}`);
          return { greeting: name };
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "myEnv" },
    );

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "Judy" });
    await primed.execute("myEnv");
    expect(log).toHaveBeenCalledWith("primed:Judy");
  });

  it("primed.executeSafe(envId) returns ok:false on resolver fn error", async () => {
    const dom = makeGreetDomain();

    dom.registerResponder(
      createDomainResponder(dom)
        .resolveAction("greet", () => {
          throw new Error("nope");
        })
        .resolveAction("shout", ({ text }) => ({ result: text })),
      { envId: "fail-env" },
    );

    const primed = new NiceActionPrimed(dom.action("greet"), { name: "x" });
    const result = await primed.executeSafe("fail-env");
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. createDomainResolver / createResolverEnvironment factory helpers
// ---------------------------------------------------------------------------

describe("factory helpers", () => {
  it("createDomainResolver returns a NiceActionDomainResolver", () => {
    const dom = makeGreetDomain();
    const resolver = createDomainResponder(dom);
    expect(resolver).toBeInstanceOf(NiceActionDomainResponder);
  });

  it("createResolverEnvironment returns a NiceActionResolverEnvironment", () => {
    const dom = makeGreetDomain();
    const env = createResponderEnvironment([
      createDomainResponder(dom)
        .resolveAction("greet", () => ({ greeting: "x" }))
        .resolveAction("shout", ({ text }) => ({ result: text })),
    ]);
    expect(env).toBeInstanceOf(NiceActionResponderEnvironment);
  });

  it("resolve() chaining returns the same resolver instance", () => {
    const dom = makeGreetDomain();
    const resolver = createDomainResponder(dom);
    const chained = resolver.resolveAction("greet", () => ({ greeting: "x" }));
    expect(chained).toBe(resolver);
  });
});
