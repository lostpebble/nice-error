/**
 * Type tests for the ActionResolver layer.
 *
 * Verifies that:
 *  - `resolve(actionId, fn)` correctly constrains fn's input and return types
 *    to those declared in the domain schema.
 *  - `TActionResolverFn<SCH>` infers input / output from the schema.
 *  - Factory helpers return the expected class types.
 *  - Chaining on `NiceActionDomainResolver` preserves `this`.
 */
import * as v from "valibot";
import { assertType, expectTypeOf, test } from "vitest";
import { action } from "../ActionSchema/action";
import { createActionDomain } from "../createActionDomain";
import { createDomainResolver, NiceActionDomainResolver } from "./NiceActionDomainResolver";
import type { TActionResolverFn } from "./NiceActionResolver.types";
import {
  createResolverEnvironment,
  NiceActionResolverEnvironment,
} from "./NiceActionResolverEnvironment";

// ---------------------------------------------------------------------------
// Shared domain for all resolver type tests
// ---------------------------------------------------------------------------

const dom = createActionDomain({
  domain: "resolver_type_test",
  schema: {
    greet: action()
      .input({ schema: v.object({ name: v.string() }) })
      .output({ schema: v.object({ greeting: v.string() }) }),
    compute: action()
      .input({ schema: v.object({ x: v.number(), y: v.number() }) })
      .output({ schema: v.object({ result: v.number() }) }),
    fire: action().input({ schema: v.object({ count: v.number() }) }),
  },
});

// ---------------------------------------------------------------------------
// resolve — input type
// ---------------------------------------------------------------------------

test("[resolve] fn input is typed from the action's input schema", () => {
  createDomainResolver(dom).resolve("greet", (input) => {
    expectTypeOf(input).toEqualTypeOf<{ name: string }>();
    return { greeting: `hello ${input.name}` };
  });
});

test("[resolve] fn input for a multi-field schema is typed correctly", () => {
  createDomainResolver(dom).resolve("compute", (input) => {
    expectTypeOf(input).toEqualTypeOf<{ x: number; y: number }>();
    return { result: input.x + input.y };
  });
});

test("[resolve] fn input for schema without output is typed correctly", () => {
  createDomainResolver(dom).resolve("fire", (input) => {
    expectTypeOf(input).toEqualTypeOf<{ count: number }>();
  });
});

// ---------------------------------------------------------------------------
// resolve — return type (sync and async)
// ---------------------------------------------------------------------------

test("[resolve] synchronous fn with correct return type compiles", () => {
  createDomainResolver(dom).resolve("greet", () => ({ greeting: "hi" }));
});

test("[resolve] async fn with correct return type compiles (MaybePromise)", () => {
  createDomainResolver(dom).resolve("greet", async (input) => {
    expectTypeOf(input).toEqualTypeOf<{ name: string }>();
    return { greeting: `hello ${input.name}` };
  });
});

test("[resolve] async fn for compute returns correct type", () => {
  createDomainResolver(dom).resolve("compute", async (input) => ({
    result: input.x * input.y,
  }));
});

// ---------------------------------------------------------------------------
// resolve — chaining returns this
// ---------------------------------------------------------------------------

test("[resolve] chaining multiple resolve calls returns the resolver instance", () => {
  const resolver = createDomainResolver(dom);
  const chained = resolver
    .resolve("greet", () => ({ greeting: "hi" }))
    .resolve("compute", (input) => ({ result: input.x + input.y }));
  assertType<typeof resolver>(chained);
});

// ---------------------------------------------------------------------------
// TActionResolverFn — utility type
// ---------------------------------------------------------------------------

test("[TActionResolverFn] infers input type from schema", () => {
  type GreetSchema = typeof dom.schema.greet;
  type Fn = TActionResolverFn<GreetSchema>;
  type Input = Parameters<Fn>[0];
  expectTypeOf<Input>().toEqualTypeOf<{ name: string }>();
});

test("[TActionResolverFn] infers output type (via Awaited) from schema", () => {
  type GreetSchema = typeof dom.schema.greet;
  type Fn = TActionResolverFn<GreetSchema>;
  type Output = Awaited<ReturnType<Fn>>;
  expectTypeOf<Output>().toEqualTypeOf<{ greeting: string }>();
});

test("[TActionResolverFn] infers multi-field output correctly", () => {
  type ComputeSchema = typeof dom.schema.compute;
  type Fn = TActionResolverFn<ComputeSchema>;
  type Input = Parameters<Fn>[0];
  type Output = Awaited<ReturnType<Fn>>;
  expectTypeOf<Input>().toEqualTypeOf<{ x: number; y: number }>();
  expectTypeOf<Output>().toEqualTypeOf<{ result: number }>();
});

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

test("[createDomainResolver] returns a NiceActionDomainResolver", () => {
  const resolver = createDomainResolver(dom);
  assertType<NiceActionDomainResolver<any>>(resolver);
});

test("[createResolverEnvironment] accepts a NiceActionDomainResolver array", () => {
  const resolver = createDomainResolver(dom)
    .resolve("greet", () => ({ greeting: "hi" }))
    .resolve("compute", (i) => ({ result: i.x }))
    .resolve("fire", () => {});
  const env = createResolverEnvironment([resolver]);
  assertType<NiceActionResolverEnvironment>(env);
});
