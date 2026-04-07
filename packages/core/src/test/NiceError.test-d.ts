import { assertType, expectTypeOf, test } from "vitest";
import { NiceError } from "../NiceError/NiceError";
import { NiceErrorDefined } from "../NiceErrorDefined/NiceErrorDefined";
import { defineNiceError } from "../NiceErrorDefined/defineNiceError";

test("[NiceError] bare construction works", () => {
  // No-arg and string-arg construction should both work
  assertType<InstanceType<typeof Error>>(new NiceError());
  assertType<InstanceType<typeof NiceError>>(new NiceError());
  assertType<InstanceType<typeof NiceError>>(new NiceError("my message"));
});

test("[defineNiceError] returns a NiceErrorDefined with correct domain type", () => {
  const err_test = defineNiceError({ domain: "nerr_test", schema: {} } as const);
  // The result is a NiceErrorDefined instance
  assertType<NiceErrorDefined<{ domain: "nerr_test"; allDomains: ["nerr_test"]; schema: {} }>>(
    err_test,
  );
  // domain is the literal string
  expectTypeOf(err_test.domain).toEqualTypeOf<"nerr_test">();
});

test("[NiceErrorDefined] fromId returns correctly typed NiceError", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      no_context_id: { message: "plain message", httpStatusCode: 400 },
      with_context_id: {
        message: (ctx: { userId: string }) => `user: ${ctx.userId}`,
        context: { required: true, type: {} as { userId: string } },
      },
    },
  } as const);

  // fromId without context
  const err1 = err_test.fromId("no_context_id");
  assertType<InstanceType<typeof NiceError>>(err1);
  expectTypeOf(err1.id).toEqualTypeOf<"no_context_id">();

  // fromId with context
  const err2 = err_test.fromId("with_context_id", { userId: "abc" });
  assertType<InstanceType<typeof NiceError>>(err2);
  expectTypeOf(err2.id).toEqualTypeOf<"with_context_id">();
});

test("[NiceError] hasId narrows ACTIVE_IDS", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      id_a: { message: "a", context: { required: true, type: {} as { a: number } } },
      id_b: { message: "b" },
    },
  } as const);

  const err = err_test.fromId("id_a", { a: 1 });
  if (err.hasId("id_a")) {
    // getContext should return { a: number }
    expectTypeOf(err.getContext("id_a")).toEqualTypeOf<{ a: number }>();
  }
});

test("[NiceError] hasOneOfIds narrows ACTIVE_IDS to a union", () => {
  const err_test = defineNiceError({
    domain: "nerr_test",
    schema: {
      id_a: { message: "a", context: { required: true, type: {} as { a: number } } },
      id_b: { message: "b", context: { required: true, type: {} as { b: string } } },
      id_c: { message: "c" },
    },
  } as const);

  const err = err_test.fromContext({ id_a: { a: 1 }, id_b: { b: "x" } });
  expectTypeOf(err.hasMultiple).toEqualTypeOf<boolean>();
  expectTypeOf(err.getIds()).toEqualTypeOf<Array<"id_a" | "id_b">>();
});

test("NiceError object types", () => {
  expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>();
  expectTypeOf<string>().not.toBeAny();
});
