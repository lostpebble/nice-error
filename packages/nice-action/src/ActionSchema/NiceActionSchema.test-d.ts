import type { JSONSerializableValue } from "@nice-error/core";
import {
  defineNiceError,
  err,
  err_cast_not_nice,
  type InferNiceError,
  NiceError,
} from "@nice-error/core";
import * as v from "valibot";
import { expectTypeOf, test } from "vitest";
import { action } from "./action";
import type { TInferActionError } from "./NiceActionSchema";
import { NiceActionSchema } from "./NiceActionSchema";

// ---------------------------------------------------------------------------
// Input / output raw type inference
// ---------------------------------------------------------------------------

test("[NiceActionSchema] .input() narrows raw INPUT type — JSON-native schema", () => {
  const sch = action().input({ schema: v.object({ msg: v.string(), count: v.number() }) });

  type RawInput = Parameters<typeof sch.serializeInput>[0];
  expectTypeOf<RawInput>().toEqualTypeOf<{ msg: string; count: number }>();
});

test("[NiceActionSchema] .input() narrows raw INPUT type — non-JSON-native (Date)", () => {
  // SERDE_IN must be explicit: TypeScript cannot infer it through the
  // conditional TNiceActonSchemaInputOptions type with a deferred constraint.
  const dateSchema = v.object({ at: v.date() });
  const sch = action().input<typeof dateSchema, { iso: string }>({
    schema: dateSchema,
    serialization: {
      serialize: ({ at }) => ({ iso: at.toISOString() }),
      deserialize: (s) => ({ at: new Date(s.iso) }),
    },
  });

  type RawInput = Parameters<typeof sch.serializeInput>[0];
  expectTypeOf<RawInput>().toEqualTypeOf<{ at: Date }>();
});

test("[NiceActionSchema] .output() narrows raw OUTPUT type", () => {
  const sch = action().output({ schema: v.object({ result: v.number() }) });

  type RawOutput = ReturnType<typeof sch.deserializeOutput>;
  expectTypeOf<RawOutput>().toEqualTypeOf<{ result: number }>();
});

test("[NiceActionSchema] input + output chaining both narrow independently", () => {
  const sch = action()
    .input({ schema: v.object({ userId: v.string() }) })
    .output({ schema: v.object({ name: v.string(), age: v.number() }) });

  type RawInput = Parameters<typeof sch.serializeInput>[0];
  type RawOutput = ReturnType<typeof sch.deserializeOutput>;

  expectTypeOf<RawInput>().toEqualTypeOf<{ userId: string }>();
  expectTypeOf<RawOutput>().toEqualTypeOf<{ name: string; age: number }>();
});

// ---------------------------------------------------------------------------
// Serialization / deserialization method signatures
// ---------------------------------------------------------------------------

test("[NiceActionSchema] serializeInput always returns JSONSerializableValue", () => {
  const sch = action().input({ schema: v.object({ n: v.number() }) });
  type SerResult = ReturnType<typeof sch.serializeInput>;
  expectTypeOf<SerResult>().toEqualTypeOf<JSONSerializableValue>();
});

test("[NiceActionSchema] deserializeInput returns raw input type", () => {
  const sch = action().input({ schema: v.object({ x: v.string() }) });
  type DeserResult = ReturnType<typeof sch.deserializeInput>;
  expectTypeOf<DeserResult>().toEqualTypeOf<{ x: string }>();
});

test("[NiceActionSchema] serializeOutput always returns JSONSerializableValue", () => {
  const sch = action().output({ schema: v.object({ testBool: v.boolean() }) });
  type SerResult = ReturnType<typeof sch.serializeOutput>;
  expectTypeOf<SerResult>().toEqualTypeOf<JSONSerializableValue | undefined>();
});

test("[NiceActionSchema] deserializeOutput returns raw output type", () => {
  const sch = action().output({ schema: v.object({ value: v.number() }) });
  type DeserResult = ReturnType<typeof sch.deserializeOutput>;
  expectTypeOf<DeserResult>().toEqualTypeOf<{ value: number }>();
});

// ---------------------------------------------------------------------------
// TInferActionError — no throws
// ---------------------------------------------------------------------------

test("[TInferActionError] no .throws() → exactly err_cast_not_nice fallback", () => {
  const sch = action().input({ schema: v.object({ x: v.number() }) });

  type Err = TInferActionError<typeof sch>;
  expectTypeOf<Err>().toEqualTypeOf<InferNiceError<typeof err_cast_not_nice>>();
});

// ---------------------------------------------------------------------------
// TInferActionError — single .throws(domain) with all IDs
// ---------------------------------------------------------------------------

test("[TInferActionError] .throws(domain) includes all schema IDs from that domain", () => {
  const err_auth = defineNiceError({
    domain: "err_auth_schema_test",
    schema: {
      unauthenticated: err({ message: "Not authenticated" }),
      forbidden: err({ message: "Forbidden" }),
    },
  } as const);

  const sch = action()
    .input({ schema: v.object({ token: v.string() }) })
    .throws(err_auth);

  type Err = TInferActionError<typeof sch>;

  // Distribute over the union to collect all active IDs across all members.
  type AllIds = Err extends NiceError<any, infer IDS> ? IDS : never;

  type HasUnauthenticated = "unauthenticated" extends AllIds ? true : false;
  expectTypeOf<HasUnauthenticated>().toEqualTypeOf<true>();

  type HasForbidden = "forbidden" extends AllIds ? true : false;
  expectTypeOf<HasForbidden>().toEqualTypeOf<true>();
});

test("[TInferActionError] .throws(domain) also includes err_cast_not_nice fallback", () => {
  const err_auth = defineNiceError({
    domain: "err_auth_schema_cast_test",
    schema: { unauthenticated: err({ message: "Not authenticated" }) },
  } as const);

  const sch = action().throws(err_auth);

  type Err = TInferActionError<typeof sch>;
  type CastIds =
    InferNiceError<typeof err_cast_not_nice> extends NiceError<any, infer IDS> ? IDS : never;
  type AllIds = Err extends NiceError<any, infer IDS> ? IDS : never;

  // Every cast_not_nice ID must also appear in the full union.
  type AllCastIdsPresent = CastIds extends AllIds ? true : false;
  expectTypeOf<AllCastIdsPresent>().toEqualTypeOf<true>();
});

// ---------------------------------------------------------------------------
// TInferActionError — .throws(domain, ids) narrowed to specific IDs
// ---------------------------------------------------------------------------

test("[TInferActionError] .throws(domain, ids) restricts to listed IDs only", () => {
  const err_pay = defineNiceError({
    domain: "err_pay_schema_test",
    schema: {
      insufficient_funds: err({ message: "Insufficient funds" }),
      card_declined: err({ message: "Card declined" }),
      expired_card: err({ message: "Expired card" }),
    },
  } as const);

  // Only two of three IDs declared.
  const sch = action()
    .input({ schema: v.object({ amount: v.number() }) })
    .throws(err_pay, ["insufficient_funds", "card_declined"] as const);

  type Err = TInferActionError<typeof sch>;
  type AllIds = Err extends NiceError<any, infer IDS> ? IDS : never;

  type HasInsufficientFunds = "insufficient_funds" extends AllIds ? true : false;
  expectTypeOf<HasInsufficientFunds>().toEqualTypeOf<true>();

  type HasCardDeclined = "card_declined" extends AllIds ? true : false;
  expectTypeOf<HasCardDeclined>().toEqualTypeOf<true>();

  // "expired_card" was NOT declared — must not appear in the union.
  type HasExpiredCard = "expired_card" extends AllIds ? true : false;
  expectTypeOf<HasExpiredCard>().toEqualTypeOf<false>();
});

// ---------------------------------------------------------------------------
// TInferActionError — multiple .throws() calls union all declared errors
// ---------------------------------------------------------------------------

test("[TInferActionError] multiple .throws() calls union errors from all domains", () => {
  const err_a = defineNiceError({
    domain: "err_a_multi_test",
    schema: { a_err: err({ message: "a" }) },
  } as const);

  const err_b = defineNiceError({
    domain: "err_b_multi_test",
    schema: { b_err: err({ message: "b" }) },
  } as const);

  const sch = action().throws(err_a).throws(err_b);

  type Err = TInferActionError<typeof sch>;
  type AllIds = Err extends NiceError<any, infer IDS> ? IDS : never;

  type HasAErr = "a_err" extends AllIds ? true : false;
  expectTypeOf<HasAErr>().toEqualTypeOf<true>();

  type HasBErr = "b_err" extends AllIds ? true : false;
  expectTypeOf<HasBErr>().toEqualTypeOf<true>();
});

// ---------------------------------------------------------------------------
// NiceActionSchema builder returns correct instance type
// ---------------------------------------------------------------------------

test("[NiceActionSchema] action() return type is NiceActionSchema with default params", () => {
  const sch = action();
  expectTypeOf(sch).toEqualTypeOf<NiceActionSchema>();
});
