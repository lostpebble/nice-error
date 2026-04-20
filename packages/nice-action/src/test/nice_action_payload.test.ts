/**
 * Tests for the NiceAction payload layer — serialization, hydration, type guards,
 * domain matching, and input validation.
 *
 * Covers:
 *  - NiceActionPrimed.toJsonObject — primed action wire format
 *  - NiceActionDomain.hydrateAction — reconstruct primed action from wire
 *  - NiceActionDomain.hydrateResponse — reconstruct response from wire
 *  - NiceActionPrimed.setOutput — build a success response from a hydrated action
 *  - NiceAction.toJsonObject — action definition (no input) wire format
 *  - NiceAction.is() — type guard for a specific primed action
 *  - NiceActionDomain.isExactActionDomain — domain membership guard
 *  - NiceActionDomain.matchAction — narrowed match returning null on mismatch
 *  - NiceActionDomain.primeAction — shortcut for action().prime()
 *  - NiceActionPrimed._isPrimed — discriminant property
 *  - Child domain allDomains propagation through payload
 *  - Input validation failure in resolver path (action_input_validation_failed)
 *  - Full JSON.stringify / JSON.parse transport simulation
 */
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import { createDomainResponder } from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import { action } from "../ActionSchema/action";
import { EActionState } from "../NiceAction/NiceAction.types";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";
import { NiceActionResponse } from "../NiceAction/NiceActionResponse";

// ---------------------------------------------------------------------------
// Shared domain factory
// ---------------------------------------------------------------------------

const createTestActionDomain = () =>
  createActionDomain({
    domain: "test_domain",
    actions: {
      send_message: action()
        .input({ schema: v.object({ message: v.string(), channel: v.string() }) })
        .output({
          schema: v.object({
            lastFiveMessages: v.array(v.string()),
          }),
        }),
    },
  });

// ---------------------------------------------------------------------------
// 1. Primed action payload round-trip
// ---------------------------------------------------------------------------

describe("Nice Action as an API Payload", () => {
  it("Should be serializable to JSON and deserializable back to the same action definition", () => {
    const actionDomain = createTestActionDomain();
    const sendMessageActionPayload = actionDomain
      .primeAction("send_message", {
        channel: "test",
        message: "Hello",
      })
      .toJsonObject();

    expect(sendMessageActionPayload).toEqual({
      type: EActionState.primed,
      allDomains: ["test_domain"],
      domain: "test_domain",
      id: "send_message",
      input: {
        channel: "test",
        message: "Hello",
      },
      cuid: sendMessageActionPayload.cuid,
      timeCreated: sendMessageActionPayload.timeCreated,
      timePrimed: sendMessageActionPayload.timePrimed,
    });

    const hydratedAction = actionDomain.hydratePrimed(sendMessageActionPayload);

    const comparisonAction = actionDomain
      .action("send_message", {
        cuid: hydratedAction.coreAction.cuid,
        timeCreated: hydratedAction.coreAction.timeCreated,
      })
      .prime(
        {
          channel: "test",
          message: "Hello",
        },
        {
          timePrimed: hydratedAction.timePrimed,
        },
      );

    expect(hydratedAction).toBeInstanceOf(NiceActionPrimed);
    expect(hydratedAction.id).toEqual("send_message");
    expect(hydratedAction.input).toEqual({ channel: "test", message: "Hello" });
    expect(hydratedAction).toEqual(comparisonAction);

    const secondPayload = hydratedAction.toJsonObject();

    expect(secondPayload).toEqual(sendMessageActionPayload);
  });

  it("Should throw if the action ID in the payload is not in the domain schema", () => {
    const actionDomain = createTestActionDomain();
    const invalidPayload = {
      allDomains: ["test_domain"],
      domain: "test_domain",
      id: "non_existent_action",
      input: {},
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    };

    expect(() => actionDomain.hydratePrimed(invalidPayload as any)).toThrow();
  });

  it("Should be able to make a NiceActionResponse from a payload", () => {
    const actionDomain = createTestActionDomain();
    const sendMessageActionPayload = actionDomain
      .primeAction("send_message", {
        channel: "test",
        message: "Hello",
      })
      .toJsonObject();

    const hydratedAction = actionDomain.hydratePrimed(sendMessageActionPayload);

    expect(hydratedAction.id).toEqual("send_message");

    if (hydratedAction.id !== "send_message") {
      throw new Error("Unexpected action ID");
    }

    const lastMessage = hydratedAction.input.message;

    const actionResponse = hydratedAction.setOutput({
      lastFiveMessages: [lastMessage, "Hi", "Hey", "Hola", "Bonjour"],
    });

    const responseJson = actionResponse.toJsonObject(); // Should not throw

    expect(responseJson).toEqual({
      type: EActionState.response,
      ok: true,
      output: {
        lastFiveMessages: ["Hello", "Hi", "Hey", "Hola", "Bonjour"],
      },
      domain: "test_domain",
      allDomains: ["test_domain"],
      id: "send_message",
      input: {
        channel: "test",
        message: "Hello",
      },
      cuid: sendMessageActionPayload.cuid,
      timeCreated: sendMessageActionPayload.timeCreated,
      timePrimed: sendMessageActionPayload.timePrimed,
      timeResponded: responseJson.timeResponded,
    });

    const hydratedResponse = actionDomain.hydrateResponse(responseJson);

    expect(hydratedResponse).toBeInstanceOf(NiceActionResponse);
    expect(hydratedResponse.primed).toEqual(hydratedAction);
    expect(hydratedResponse.result).toEqual({
      ok: true,
      output: {
        lastFiveMessages: ["Hello", "Hi", "Hey", "Hola", "Bonjour"],
      },
    });
  });
});

// ---------------------------------------------------------------------------
// 2. NiceAction.toJsonObject — action definition without input
// ---------------------------------------------------------------------------

describe("NiceAction.toJsonObject", () => {
  it("serializes action definition (no input) with domain, allDomains, and id", () => {
    const dom = createTestActionDomain();
    const ref = dom.action("send_message");

    expect(ref.toJsonObject()).toEqual({
      type: EActionState.empty,
      domain: "test_domain",
      allDomains: ["test_domain"],
      id: "send_message",
      cuid: ref.cuid,
      timeCreated: ref.timeCreated,
    });
  });

  it("does not include input field", () => {
    const dom = createTestActionDomain();
    const ref = dom.action("send_message");
    const json = ref.toJsonObject();

    expect("input" in json).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. NiceAction.is() — type guard
// ---------------------------------------------------------------------------

describe("NiceAction.is()", () => {
  it("returns true when the primed action matches this action's domain and id", () => {
    const dom = createTestActionDomain();
    const act = dom.action("send_message");
    const primed = act.prime({ message: "hi", channel: "c" });

    expect(act.is(primed)).toBe(true);
  });

  it("returns false for a primed action with a different id", () => {
    const dom = createActionDomain({
      domain: "multi_dom",
      actions: {
        foo: action().input({ schema: v.object({ x: v.number() }) }),
        bar: action().input({ schema: v.object({ y: v.number() }) }),
      },
    });

    const fooAction = dom.action("foo");
    const barPrimed = dom.action("bar").prime({ y: 1 });

    expect(fooAction.is(barPrimed)).toBe(false);
  });

  it("returns false for a non-NiceActionPrimed value", () => {
    const dom = createTestActionDomain();
    const act = dom.action("send_message");

    expect(act.is(null)).toBe(false);
    expect(act.is(undefined)).toBe(false);
    expect(act.is("send_message")).toBe(false);
    expect(act.is({ id: "send_message" })).toBe(false);
  });

  it("returns false for a primed action from a different domain with the same id", () => {
    const domA = createActionDomain({
      domain: "domain_a",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });
    const domB = createActionDomain({
      domain: "domain_b",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    const pingA = domA.action("ping");
    const primedB = domB.action("ping").prime({ x: 1 });

    expect(pingA.is(primedB)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. NiceActionDomain.isExactActionDomain
// ---------------------------------------------------------------------------

describe("NiceActionDomain.isExactActionDomain()", () => {
  it("returns true for a primed action that belongs to this domain", () => {
    const dom = createTestActionDomain();
    const primed = dom.action("send_message").prime({ message: "hi", channel: "c" });

    expect(dom.isExactActionDomain(primed)).toBe(true);
  });

  it("returns false for a primed action from a different domain", () => {
    const domA = createActionDomain({
      domain: "domain_a",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });
    const domB = createActionDomain({
      domain: "domain_b",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    const primedB = domB.action("ping").prime({ x: 1 });
    expect(domA.isExactActionDomain(primedB)).toBe(false);
  });

  it("returns false for non-primed values", () => {
    const dom = createTestActionDomain();

    expect(dom.isExactActionDomain(null)).toBe(false);
    expect(dom.isExactActionDomain(undefined)).toBe(false);
    expect(dom.isExactActionDomain({ domain: "test_domain" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. NiceActionDomain.matchAction — narrowed match
// ---------------------------------------------------------------------------

describe("NiceActionDomain.matchAction()", () => {
  it("returns the same primed action when domain and id match", () => {
    const dom = createTestActionDomain();
    const primed = dom.action("send_message").prime({ message: "hi", channel: "c" });

    const matched = dom.matchAction(primed, "send_message");

    expect(matched).toBe(primed);
  });

  it("returns null when the action id does not match", () => {
    const dom = createActionDomain({
      domain: "multi",
      actions: {
        foo: action().input({ schema: v.object({ x: v.number() }) }),
        bar: action().input({ schema: v.object({ y: v.number() }) }),
      },
    });

    const fooPrimed = dom.action("foo").prime({ x: 1 });
    expect(dom.matchAction(fooPrimed, "bar")).toBeNull();
  });

  it("returns null for a primed action from a different domain", () => {
    const domA = createActionDomain({
      domain: "domain_a",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });
    const domB = createActionDomain({
      domain: "domain_b",
      actions: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    const primedB = domB.action("ping").prime({ x: 1 });
    expect(domA.matchAction(primedB, "ping")).toBeNull();
  });

  it("can be used inside a handler to narrow input type", async () => {
    const dom = createActionDomain({
      domain: "narrowing",
      actions: {
        increment: action().input({ schema: v.object({ by: v.number() }) }),
        reset: action().input({ schema: v.object({ to: v.number() }) }),
      },
    });

    let capturedBy: number | undefined;
    dom.setActionRequester().forDomain(dom, (act) => {
      const inc = dom.matchAction(act, "increment");
      if (inc) capturedBy = inc.input.by;
    });

    await dom.action("increment").execute({ by: 7 });
    expect(capturedBy).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 6. domain.primeAction() — shortcut equivalent to action().prime()
// ---------------------------------------------------------------------------

describe("NiceActionDomain.primeAction()", () => {
  it("produces the same result as action().prime()", () => {
    const dom = createTestActionDomain();
    const input = { message: "hello", channel: "general" };

    const viaShortcut = dom.primeAction("send_message", input);
    const viaLongForm = dom
      .action("send_message", {
        cuid: viaShortcut.coreAction.cuid,
        timeCreated: viaShortcut.coreAction.timeCreated,
      })
      .prime(input, {
        timePrimed: viaShortcut.timePrimed,
      });

    expect(viaShortcut).toEqual(viaLongForm);
    expect(viaShortcut.toJsonObject()).toEqual(viaLongForm.toJsonObject());
  });

  it("produces a NiceActionPrimed with correct id and input", () => {
    const dom = createTestActionDomain();
    const primed = dom.primeAction("send_message", { message: "test", channel: "ch" });

    expect(primed).toBeInstanceOf(NiceActionPrimed);
    expect(primed.id).toBe("send_message");
    expect(primed.input).toEqual({ message: "test", channel: "ch" });
  });
});

// ---------------------------------------------------------------------------
// 7. NiceActionPrimed._isPrimed discriminant
// ---------------------------------------------------------------------------

describe("NiceActionPrimed._isPrimed", () => {
  it("is always true on any primed action", () => {
    const dom = createTestActionDomain();
    const primed = dom.primeAction("send_message", { message: "x", channel: "y" });

    expect(primed.type).toBe(EActionState.primed);
  });

  it("can be used to distinguish primed actions from plain objects", () => {
    const dom = createTestActionDomain();
    const primed = dom.primeAction("send_message", { message: "x", channel: "y" });
    const notPrimed = { id: "send_message", input: {}, type: EActionState.empty };

    expect(primed.type).toBe(EActionState.primed);
    expect(notPrimed.type).toBe(EActionState.empty);
  });
});

// ---------------------------------------------------------------------------
// 8. hydrateAction — error cases
// ---------------------------------------------------------------------------

describe("NiceActionDomain.hydrateAction — error cases", () => {
  it("throws when the payload domain does not match this domain", () => {
    const dom = createTestActionDomain();

    expect(() =>
      dom.hydratePrimed({
        type: EActionState.primed,
        domain: "wrong_domain",
        allDomains: ["wrong_domain"],
        id: "send_message",
        input: { message: "hi", channel: "c" },
        cuid: "x",
        timeCreated: Date.now(),
        timePrimed: Date.now(),
      }),
    ).toThrow(/domain mismatch/i);
  });

  it("throws when the action id is not in the schema", () => {
    const dom = createTestActionDomain();

    expect(() =>
      dom.hydratePrimed({
        domain: "test_domain",
        allDomains: ["test_domain"],
        id: "does_not_exist",
        input: {},
        cuid: "x",
        timeCreated: Date.now(),
        timePrimed: Date.now(),
      } as any),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. Child domain — allDomains propagation through payload
// ---------------------------------------------------------------------------

describe("Child domain allDomains in serialized payload", () => {
  it("allDomains in child domain includes both child and parent domain ids", () => {
    const parent = createActionDomain({
      domain: "parent",
      actions: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = parent.createChildDomain({
      domain: "child",
      actions: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    expect(child.allDomains).toEqual(["child", "parent"]);
  });

  it("primed action payload from child domain includes full allDomains hierarchy", () => {
    const parent = createActionDomain({
      domain: "parent",
      actions: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = parent.createChildDomain({
      domain: "child",
      actions: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const payload = child.primeAction("pong", { v: "test" }).toJsonObject();

    expect(payload.domain).toBe("child");
    expect(payload.allDomains).toEqual(["child", "parent"]);
    expect(payload.id).toBe("pong");
  });

  it("hydrateAction on child domain reconstructs primed action with correct allDomains", () => {
    const parent = createActionDomain({
      domain: "parent",
      actions: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = parent.createChildDomain({
      domain: "child",
      actions: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    child.setActionRequester().forDomain(child, () => {});

    const wire = child.primeAction("pong", { v: "hello" }).toJsonObject();
    const hydrated = child.hydratePrimed(wire);

    expect(hydrated.domain).toBe("child");
    expect(hydrated.allDomains).toEqual(["child", "parent"]);
    expect(hydrated.input).toEqual({ v: "hello" });
  });
});

// ---------------------------------------------------------------------------
// 10. Custom serialization (Date) — payload round-trip
// ---------------------------------------------------------------------------

describe("Payload round-trip with custom serialization (Date)", () => {
  const makeDateDomain = () =>
    createActionDomain({
      domain: "date_domain",
      actions: {
        schedule: action()
          .input({
            schema: v.object({ at: v.date(), label: v.string() }),
            serialization: {
              serialize: ({ at, label }) => ({ iso: at.toISOString(), label }),
              deserialize: (s: { iso: string; label: string }) => ({
                at: new Date(s.iso),
                label: s.label,
              }),
            },
          })
          .output({
            schema: v.object({ confirmed: v.boolean(), scheduledAt: v.date() }),
            serialization: {
              serialize: ({ confirmed, scheduledAt }) => ({
                confirmed,
                scheduledAtIso: scheduledAt.toISOString(),
              }),
              deserialize: (s: { confirmed: boolean; scheduledAtIso: string }) => ({
                confirmed: s.confirmed,
                scheduledAt: new Date(s.scheduledAtIso),
              }),
            },
          }),
      },
    });

  it("toJsonObject serializes Date input to ISO string", () => {
    const dom = makeDateDomain();
    const ts = new Date("2025-06-01T12:00:00Z");

    const wire = dom.primeAction("schedule", { at: ts, label: "meeting" }).toJsonObject();

    expect(wire.input).toEqual({ iso: "2025-06-01T12:00:00.000Z", label: "meeting" });
  });

  it("hydrateAction deserializes ISO string back to Date", () => {
    const dom = makeDateDomain();
    const ts = new Date("2025-06-01T12:00:00Z");

    const wire = dom.primeAction("schedule", { at: ts, label: "meeting" }).toJsonObject();
    const hydrated = dom.hydratePrimed(wire);

    expect(hydrated.input.at).toBeInstanceOf(Date);
    expect(hydrated.input.at.toISOString()).toBe(ts.toISOString());
    expect(hydrated.input.label).toBe("meeting");
  });

  it("full JSON.stringify → JSON.parse round-trip restores Date input", () => {
    const dom = makeDateDomain();
    const ts = new Date("2025-03-15T09:30:00Z");

    const wire = JSON.parse(
      JSON.stringify(dom.primeAction("schedule", { at: ts, label: "standup" }).toJsonObject()),
    );
    const hydrated = dom.hydratePrimed(wire);

    expect(hydrated.input.at).toBeInstanceOf(Date);
    expect(hydrated.input.at.toISOString()).toBe(ts.toISOString());
  });

  it("setOutput serializes Date output to ISO string in response wire format", () => {
    const dom = makeDateDomain();
    const ts = new Date("2025-06-01T12:00:00Z");
    const scheduledAt = new Date("2025-06-02T08:00:00Z");

    const primed = dom.primeAction("schedule", { at: ts, label: "meeting" });
    const response = primed.setOutput({ confirmed: true, scheduledAt });
    const wire = response.toJsonObject();

    expect(wire.ok).toBe(true);
    if (wire.ok) {
      expect(wire.output).toEqual({
        confirmed: true,
        scheduledAtIso: "2025-06-02T08:00:00.000Z",
      });
    }
  });

  it("hydrateResponse restores Date output from wire format", () => {
    const dom = makeDateDomain();
    const ts = new Date("2025-06-01T12:00:00Z");
    const scheduledAt = new Date("2025-06-02T08:00:00Z");

    const primed = dom.primeAction("schedule", { at: ts, label: "meeting" });
    const wire = JSON.parse(
      JSON.stringify(primed.setOutput({ confirmed: true, scheduledAt }).toJsonObject()),
    );

    const hydrated = dom.hydrateResponse(wire);

    expect(hydrated.result.ok).toBe(true);
    if (hydrated.result.ok) {
      expect(hydrated.result.output.scheduledAt).toBeInstanceOf(Date);
      expect(hydrated.result.output.scheduledAt.toISOString()).toBe(scheduledAt.toISOString());
      expect(hydrated.result.output.confirmed).toBe(true);
    }

    // Input also deserialized
    expect(hydrated.primed.input.at).toBeInstanceOf(Date);
    expect(hydrated.primed.input.at.toISOString()).toBe(ts.toISOString());
  });
});

// ---------------------------------------------------------------------------
// 11. Input validation failure — resolver path
// ---------------------------------------------------------------------------

describe("Input validation failure in resolver path", () => {
  it("throws action_input_validation_failed when resolver receives invalid input shape", async () => {
    const dom = createActionDomain({
      domain: "validation_dom",
      actions: {
        greet: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    dom.registerResponder(
      createDomainResponder(dom).resolveAction("greet", ({ name }) => ({ greeting: `hi ${name}` })),
    );

    // Force invalid input through wire format — bypass TypeScript types
    const invalidWire = {
      type: EActionState.primed,
      domain: "validation_dom",
      allDomains: ["validation_dom"],
      id: "greet",
      input: { name: 42 }, // name must be string
    };

    await expect(dom.hydratePrimed(invalidWire as any).execute()).rejects.toThrow(/validation/i);
  });
});

// ---------------------------------------------------------------------------
// 12. Multiple actions in one domain — payload routing
// ---------------------------------------------------------------------------

describe("Multi-action domain payload", () => {
  const makeMultiDomain = () =>
    createActionDomain({
      domain: "multi",
      actions: {
        create: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ id: v.string() }) }),
        delete: action()
          .input({ schema: v.object({ id: v.string() }) })
          .output({ schema: v.object({ deleted: v.boolean() }) }),
        list: action()
          .input({ schema: v.object({ page: v.number() }) })
          .output({ schema: v.object({ items: v.array(v.string()) }) }),
      },
    });

  it("each action produces a unique payload with correct id", () => {
    const dom = makeMultiDomain();

    const createWire = dom.primeAction("create", { name: "item" }).toJsonObject();
    const deleteWire = dom.primeAction("delete", { id: "abc" }).toJsonObject();
    const listWire = dom.primeAction("list", { page: 1 }).toJsonObject();

    expect(createWire.id).toBe("create");
    expect(deleteWire.id).toBe("delete");
    expect(listWire.id).toBe("list");
  });

  it("hydrateAction routes each payload to the correct action schema", () => {
    const dom = makeMultiDomain();

    const createHydrated = dom.hydratePrimed({
      type: EActionState.primed,
      domain: "multi",
      allDomains: ["multi"],
      id: "create",
      input: { name: "foo" },
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    });

    const deleteHydrated = dom.hydratePrimed({
      type: EActionState.primed,
      domain: "multi",
      allDomains: ["multi"],
      id: "delete",
      input: { id: "xyz" },
      cuid: "x",
      timeCreated: Date.now() - 1000,
      timePrimed: Date.now(),
    });

    expect(createHydrated.id).toBe("create");
    expect(createHydrated.input).toEqual({ name: "foo" });

    expect(deleteHydrated.id).toBe("delete");
    expect(deleteHydrated.input).toEqual({ id: "xyz" });
  });

  it("setOutput on each hydrated action produces a correctly shaped response", () => {
    const dom = makeMultiDomain();

    const createPrimed = dom.primeAction("create", { name: "foo" });
    const createResponse = createPrimed.setOutput({ id: "new-id" });
    const createWire = createResponse.toJsonObject();

    expect(createWire.ok).toBe(true);
    expect(createWire.id).toBe("create");
    if (createWire.ok) {
      expect(createWire.output).toEqual({ id: "new-id" });
    }

    const listPrimed = dom.primeAction("list", { page: 2 });
    const listResponse = listPrimed.setOutput({ items: ["a", "b", "c"] });
    const listWire = listResponse.toJsonObject();

    expect(listWire.ok).toBe(true);
    expect(listWire.id).toBe("list");
    if (listWire.ok) {
      expect(listWire.output).toEqual({ items: ["a", "b", "c"] });
    }
  });
});

// ---------------------------------------------------------------------------
// 13. Full JSON transport simulation
// ---------------------------------------------------------------------------

describe("Full JSON.stringify / JSON.parse transport", () => {
  it("primed action survives complete wire transport and can still execute", async () => {
    const dom = createTestActionDomain();

    dom.setActionRequester().forActionId(dom, "send_message", (act) => ({
      lastFiveMessages: [act.input.message],
    }));

    const originalWire = dom
      .primeAction("send_message", { message: "transport test", channel: "ch" })
      .toJsonObject();

    // Simulate cross-process transport
    const transportedWire = JSON.parse(JSON.stringify(originalWire));
    const hydrated = dom.hydratePrimed(transportedWire);

    const result = await hydrated.execute();
    expect(result).toEqual({ lastFiveMessages: ["transport test"] });
  });

  it("response payload survives complete wire transport and can be hydrated", async () => {
    const dom = createTestActionDomain();

    dom.setActionRequester().forActionId(dom, "send_message", () => ({
      lastFiveMessages: ["a", "b", "c", "d", "e"],
    }));

    const response = await dom
      .action("send_message")
      .executeToResponse({ message: "wire", channel: "chan" });

    const transportedWire = JSON.parse(JSON.stringify(response.toJsonObject()));
    const hydrated = dom.hydrateResponse(transportedWire);

    expect(hydrated.result.ok).toBe(true);
    if (hydrated.result.ok) {
      expect(hydrated.result.output).toEqual({ lastFiveMessages: ["a", "b", "c", "d", "e"] });
    }
    expect(hydrated.primed.input).toEqual({ message: "wire", channel: "chan" });
  });
});
