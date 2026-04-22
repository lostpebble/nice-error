// /**
//  * Type tests for the ActionResolver layer.
//  *
//  * Verifies that:
//  *  - `resolve(actionId, fn)` correctly constrains fn's input and return types
//  *    to those declared in the domain schema.
//  *  - `TActionResolverFn<SCH>` infers input / output from the schema.
//  *  - Factory helpers return the expected class types.
//  *  - Chaining on `NiceActionDomainResolver` preserves `this`.
//  */
// import * as v from "valibot";
// import { assertType, expectTypeOf, test } from "vitest";
// import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
// import { action } from "../../ActionSchema/action";
// import { createDomainResponder, type NiceActionDomainResponder } from "./NiceActionResponder";
// import type { TActionResponderFn } from "./NiceActionResponder.types";
// import {
//   createResponderEnvironment,
//   NiceActionResponderEnvironment,
// } from "./NiceActionResponderEnvironment";

// // ---------------------------------------------------------------------------
// // Shared domain for all resolver type tests
// // ---------------------------------------------------------------------------

// const dom = createActionRootDomain({
//   domain: "resolver_type_test",
//   actions: {
//     greet: action()
//       .input({ schema: v.object({ name: v.string() }) })
//       .output({ schema: v.object({ greeting: v.string() }) }),
//     compute: action()
//       .input({ schema: v.object({ x: v.number(), y: v.number() }) })
//       .output({ schema: v.object({ result: v.number() }) }),
//     fire: action().input({ schema: v.object({ count: v.number() }) }),
//   },
// });

// // ---------------------------------------------------------------------------
// // resolve — input type
// // ---------------------------------------------------------------------------

// test("[resolve] fn input is typed from the action's input schema", () => {
//   createDomainResponder(dom).resolveAction("greet", (input) => {
//     expectTypeOf(input).toEqualTypeOf<{ name: string }>();
//     return { greeting: `hello ${input.name}` };
//   });
// });

// test("[resolve] fn input for a multi-field schema is typed correctly", () => {
//   createDomainResponder(dom).resolveAction("compute", (input) => {
//     expectTypeOf(input).toEqualTypeOf<{ x: number; y: number }>();
//     return { result: input.x + input.y };
//   });
// });

// test("[resolve] fn input for schema without output is typed correctly", () => {
//   createDomainResponder(dom).resolveAction("fire", (input) => {
//     expectTypeOf(input).toEqualTypeOf<{ count: number }>();
//   });
// });

// // ---------------------------------------------------------------------------
// // resolve — return type (sync and async)
// // ---------------------------------------------------------------------------

// test("[resolve] synchronous fn with correct return type compiles", () => {
//   createDomainResponder(dom).resolveAction("greet", () => ({ greeting: "hi" }));
// });

// test("[resolve] async fn with correct return type compiles (MaybePromise)", () => {
//   createDomainResponder(dom).resolveAction("greet", async (input) => {
//     expectTypeOf(input).toEqualTypeOf<{ name: string }>();
//     return { greeting: `hello ${input.name}` };
//   });
// });

// test("[resolve] async fn for compute returns correct type", () => {
//   createDomainResponder(dom).resolveAction("compute", async (input) => ({
//     result: input.x * input.y,
//   }));
// });

// // ---------------------------------------------------------------------------
// // resolve — chaining returns this
// // ---------------------------------------------------------------------------

// test("[resolve] chaining multiple resolve calls returns the resolver instance", () => {
//   const resolver = createDomainResponder(dom);
//   const chained = resolver
//     .resolveAction("greet", () => ({ greeting: "hi" }))
//     .resolveAction("compute", (input) => ({ result: input.x + input.y }));
//   assertType<typeof resolver>(chained);
// });

// // ---------------------------------------------------------------------------
// // TActionResolverFn — utility type
// // ---------------------------------------------------------------------------

// test("[TActionResolverFn] infers input type from schema", () => {
//   type GreetSchema = typeof dom.actions.greet;
//   type Fn = TActionResponderFn<GreetSchema>;
//   type Input = Parameters<Fn>[0];
//   expectTypeOf<Input>().toEqualTypeOf<{ name: string }>();
// });

// test("[TActionResolverFn] infers output type (via Awaited) from schema", () => {
//   type GreetSchema = typeof dom.actions.greet;
//   type Fn = TActionResponderFn<GreetSchema>;
//   type Output = Awaited<ReturnType<Fn>>;
//   expectTypeOf<Output>().toEqualTypeOf<{ greeting: string }>();
// });

// test("[TActionResolverFn] infers multi-field output correctly", () => {
//   type ComputeSchema = typeof dom.actions.compute;
//   type Fn = TActionResponderFn<ComputeSchema>;
//   type Input = Parameters<Fn>[0];
//   type Output = Awaited<ReturnType<Fn>>;
//   expectTypeOf<Input>().toEqualTypeOf<{ x: number; y: number }>();
//   expectTypeOf<Output>().toEqualTypeOf<{ result: number }>();
// });

// // ---------------------------------------------------------------------------
// // Factory functions
// // ---------------------------------------------------------------------------

// test("[createDomainResolver] returns a NiceActionDomainResolver", () => {
//   const resolver = createDomainResponder(dom);
//   assertType<NiceActionDomainResponder<any>>(resolver);
// });

// test("[createResolverEnvironment] accepts a NiceActionDomainResolver array", () => {
//   const resolver = createDomainResponder(dom)
//     .resolveAction("greet", () => ({ greeting: "hi" }))
//     .resolveAction("compute", (i) => ({ result: i.x }))
//     .resolveAction("fire", () => {});
//   const env = createResponderEnvironment([resolver]);
//   assertType<NiceActionResponderEnvironment>(env);
// });
