import { assertType, expectTypeOf, test } from "vitest";
import { defineNiceError } from "../NiceErrorDefined/defineNiceError";
import { err } from "../NiceErrorDefined/err";
import {
  type InferNiceError,
  type InferNiceErrorExtendable,
  NiceErrorDefined,
} from "../NiceErrorDefined/NiceErrorDefined";
import { nice_error_test_options } from "../test/helpers/nice_error_testing.static";
import { NiceError } from "./NiceError";
import { NiceErrorExtendable } from "./NiceErrorExtendable";

test("[NiceError] bare construction works", () => {
  assertType<InstanceType<typeof Error>>(new NiceError(nice_error_test_options));
  assertType<InstanceType<typeof NiceError>>(new NiceError(nice_error_test_options));
});

test("[defineNiceError] returns a NiceErrorDefined with correct domain type", () => {
  const err_test = defineNiceError({ domain: "nerr_test", schema: {} } as const);
  assertType<NiceErrorDefined<{ domain: "nerr_test"; allDomains: ["nerr_test"]; schema: {} }>>(
    err_test,
  );
  expectTypeOf(err_test.domain).toEqualTypeOf<"nerr_test">();
});

test("[NiceErrorDefined] fromId returns correctly typed NiceError", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      no_context_id: err({ message: "plain message", httpStatusCode: 400 }),
      with_context_id: err<{ userId: string }>({
        message: (ctx: { userId: string }) => `user: ${ctx.userId}`,
        context: { required: true },
      }),
    },
  } as const);

  const err1 = err_test.fromId("no_context_id");
  assertType<InstanceType<typeof NiceError>>(err1);
  expectTypeOf(err1.ids).toEqualTypeOf<"no_context_id"[]>();

  const err2 = err_test.fromId("with_context_id", { userId: "abc" });
  assertType<InstanceType<typeof NiceError>>(err2);
  expectTypeOf(err2.ids).toEqualTypeOf<"with_context_id"[]>();
});

test("[NiceError] hasId narrows ACTIVE_IDS", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      id_a: err<{ a: number }>({ message: "a", context: { required: true } }),
      id_b: { message: "b" },
    },
  } as const);

  const err_cre = err_test.fromId("id_a", { a: 1 });
  if (err_cre.hasId("id_a")) {
    expectTypeOf(err_cre.getContext("id_a")).toEqualTypeOf<{ a: number }>();
  }
});

test("[NiceError] hasOneOfIds narrows ACTIVE_IDS to a union", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      id_a: err<{ a: number }>({ context: { required: true } }),
      id_b: err<{ b: string }>({ context: { required: true } }),
      id_c: err({ message: "c" }),
    },
  } as const);

  const multi = err_test.fromContext({ id_a: { a: 1 }, id_b: { b: "x" } });
  expectTypeOf(multi.hasMultiple).toEqualTypeOf<boolean>();
  expectTypeOf(multi.getIds()).toEqualTypeOf<Array<"id_a" | "id_b">>();
});

test("NiceError object types", () => {
  expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>();
  expectTypeOf<string>().not.toBeAny();
});

// ---------------------------------------------------------------------------
// InferNiceError / InferNiceErrorExtendable
// ---------------------------------------------------------------------------

test("[InferNiceError] resolves to a NiceError with all schema keys as ACTIVE_IDS", () => {
  const err_auth = defineNiceError({
    domain: "err_auth",
    schema: {
      invalid_credentials: err<{ username: string }>({
        context: { required: true },
        message: (ctx: { username: string }) => `Bad creds for ${ctx.username}`,
      }),
      account_locked: err({ message: "Locked" }),
    },
  } as const);

  type TAuthError = InferNiceError<typeof err_auth>;

  // Must be a NiceError subtype.
  type _isNiceError = TAuthError extends NiceError<any, any> ? true : false;
  expectTypeOf<_isNiceError>().toEqualTypeOf<true>();

  // Extract the ACTIVE_IDS union and check both keys are members.
  type _activeIds = TAuthError extends NiceError<any, infer IDS> ? IDS : never;
  type _hasInvalidCreds = "invalid_credentials" extends _activeIds ? true : false;
  expectTypeOf<_hasInvalidCreds>().toEqualTypeOf<true>();

  type _hasAccountLocked = "account_locked" extends _activeIds ? true : false;
  expectTypeOf<_hasAccountLocked>().toEqualTypeOf<true>();
});

test("[InferNiceErrorExtendable] resolves to a NiceErrorExtendable with builder methods", () => {
  const err_auth = defineNiceError({
    domain: "err_auth",
    schema: {
      not_found: err({ message: "Not found", httpStatusCode: 404 }),
    },
  } as const);

  type TAuthExtendable = InferNiceErrorExtendable<typeof err_auth>;

  type _isExtendable = TAuthExtendable extends NiceErrorExtendable<any, any> ? true : false;
  expectTypeOf<_isExtendable>().toEqualTypeOf<true>();

  type _hasNotFound = TAuthExtendable extends NiceErrorExtendable<any, "not_found"> ? true : false;
  expectTypeOf<_hasNotFound>().toEqualTypeOf<true>();
});

// ---------------------------------------------------------------------------
// hydrate return type
// ---------------------------------------------------------------------------

test("[NiceErrorDefined.hydrate] returns NiceErrorExtendable with preserved ACTIVE_IDS", () => {
  const err_auth = defineNiceError({
    domain: "err_auth",
    schema: {
      invalid_credentials: err<{ username: string }>({ context: { required: true } }),
      account_locked: err(),
    },
  } as const);

  type ERR_DEF = typeof err_auth extends NiceErrorDefined<infer D> ? D : never;

  const plain = err_auth.fromId("account_locked") as NiceError<ERR_DEF, "account_locked">;
  const hydrated = err_auth.hydrate(plain);

  type _isExtendable =
    typeof hydrated extends NiceErrorExtendable<any, "account_locked"> ? true : false;
  expectTypeOf<_isExtendable>().toEqualTypeOf<true>();

  // Builder methods are available on the hydrated result.
  expectTypeOf(hydrated.addId).toBeFunction();
  expectTypeOf(hydrated.addContext).toBeFunction();
});

// ---------------------------------------------------------------------------
// Optional context args (fromId / addId)
// ---------------------------------------------------------------------------

test("[fromId] required: true makes context arg required; absent/false makes it optional", () => {
  const err_test = defineNiceError({
    domain: "nerr_opt",
    schema: {
      // context: { required: true } → second arg is required
      with_required_ctx: err<{ field: string }>({
        message: (ctx: { field: string }) => `invalid: ${ctx.field}`,
        context: { required: true },
      }),
      // context: {} (no required) → second arg is optional
      with_optional_ctx: err<{ retryAfter: number }>({
        message: "rate limited",
        context: {},
      }),
      // no context at all → single arg only
      no_ctx: err({ message: "oops" }),
    },
  } as const);

  // Required — must provide context.
  err_test.fromId("with_required_ctx", { field: "email" });

  // Optional — both forms are valid.
  err_test.fromId("with_optional_ctx");
  err_test.fromId("with_optional_ctx", { retryAfter: 30 });

  // No context — single arg only.
  err_test.fromId("no_ctx");
});

test("[addId] mirrors fromId optional/required context behaviour", () => {
  const err_test = defineNiceError({
    domain: "nerr_opt2",
    schema: {
      id_base: err({ message: "base" }),
      id_opt: err<{ x: number }>({ context: {} }),
      id_req: err<{ y: string }>({ context: { required: true } }),
    },
  } as const);

  const base = err_test.fromId("id_base");

  // Optional — both forms compile.
  base.addId("id_opt");
  base.addId("id_opt", { x: 1 });

  // Required — must provide context.
  base.addId("id_req", { y: "hello" });
});

// ---------------------------------------------------------------------------
// matches
// ---------------------------------------------------------------------------

test("[NiceError.matches] accepts any NiceError and returns boolean", () => {
  const err_a = defineNiceError({
    domain: "d_a",
    schema: { foo: err({ message: "foo" }) },
  } as const);

  const e1 = err_a.fromId("foo");
  const e2 = err_a.fromId("foo");
  expectTypeOf(e1.matches(e2)).toEqualTypeOf<boolean>();
});
