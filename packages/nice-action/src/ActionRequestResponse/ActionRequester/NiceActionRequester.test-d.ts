/**
 * Type tests for NiceActionHandler.
 *
 * Verifies that handler registration methods correctly narrow input types, that
 * chaining returns `this`, and that the broad / default handler receives the
 * generic primed-action type.
 */
import * as v from "valibot";
import { assertType, expectTypeOf, test } from "vitest";
import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
import type { INiceActionDomain } from "../../ActionDomain/NiceActionDomain.types";
import { action } from "../../ActionSchema/action";
import type { NiceActionPrimed } from "../../NiceAction/NiceActionPrimed";
import { NiceActionRequester } from "./NiceActionRequester";

// ---------------------------------------------------------------------------
// Shared domain for all handler type tests
// ---------------------------------------------------------------------------

const dom = createActionRootDomain({
  domain: "handler_type_test",
  actions: {
    setName: action().input({ schema: v.object({ name: v.string() }) }),
    setAge: action().input({ schema: v.object({ age: v.number() }) }),
    greet: action()
      .input({ schema: v.object({ name: v.string() }) })
      .output({ schema: v.object({ greeting: v.string() }) }),
  },
});

// ---------------------------------------------------------------------------
// forActionId — input narrowing
// ---------------------------------------------------------------------------

test("[forActionId] act.input is narrowed to the specific action's input type", () => {
  new NiceActionRequester().forActionId(dom, "setName", (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ name: string }>();
  });
});

test("[forActionId] act.input is narrowed for a different action id", () => {
  new NiceActionRequester().forActionId(dom, "setAge", (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ age: number }>();
  });
});

test("[forActionId] act.input for an action with output schema is still narrowed", () => {
  new NiceActionRequester().forActionId(dom, "greet", (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ name: string }>();
  });
});

// ---------------------------------------------------------------------------
// forActionIds — union narrowing
// ---------------------------------------------------------------------------

test("[forActionIds] act.input is the union of the listed action input types", () => {
  new NiceActionRequester().forActionIds(dom, ["setName", "setAge"] as const, (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ name: string } | { age: number }>();
  });
});

test("[forActionIds] single-item list narrows to that action's type", () => {
  new NiceActionRequester().forActionIds(dom, ["setAge"] as const, (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ age: number }>();
  });
});

// ---------------------------------------------------------------------------
// forDomain — domain-scoped union narrowing
// ---------------------------------------------------------------------------

test("[forDomain] act.input is the union of all action input types in the domain", () => {
  const specificDom = createActionRootDomain({
    domain: "specific",
    actions: {
      a: action().input({ schema: v.object({ x: v.number() }) }),
      b: action().input({ schema: v.object({ y: v.string() }) }),
    },
  });

  new NiceActionRequester().forDomain(specificDom, (act) => {
    expectTypeOf(act.input).toEqualTypeOf<{ x: number } | { y: string }>();
  });
});

test("[forDomain] act.input for the shared dom is the union of setName/setAge/greet inputs", () => {
  new NiceActionRequester().forDomain(dom, (act) => {
    // setName: { name: string }, setAge: { age: number }, greet: { name: string }
    expectTypeOf(act.input).toEqualTypeOf<{ name: string } | { age: number } | { name: string }>();
  });
});

// ---------------------------------------------------------------------------
// setDefaultHandler — broad type
// ---------------------------------------------------------------------------

test("[setDefaultHandler] handler receives the generic NiceActionPrimed type", () => {
  new NiceActionRequester().setDefaultHandler((act) => {
    assertType<NiceActionPrimed<INiceActionDomain, string, INiceActionDomain["actions"][string]>>(
      act,
    );
  });
});

// ---------------------------------------------------------------------------
// Chaining — all methods return this
// ---------------------------------------------------------------------------

test("[NiceActionHandler] all registration methods return the handler instance", () => {
  const h = new NiceActionRequester();
  assertType<NiceActionRequester>(h.forActionId(dom, "setName", () => {}));
  assertType<NiceActionRequester>(h.forActionIds(dom, ["setAge"] as const, () => {}));
  assertType<NiceActionRequester>(h.forDomain(dom, () => {}));
  assertType<NiceActionRequester>(h.setDefaultHandler(() => {}));
});

test("[NiceActionHandler] chaining forActionId → forDomain → setDefaultHandler compiles", () => {
  const h = new NiceActionRequester()
    .forActionId(dom, "setName", () => {})
    .forActionIds(dom, ["setAge"] as const, () => {})
    .forDomain(dom, () => {})
    .setDefaultHandler(() => {});
  assertType<NiceActionRequester>(h);
});
