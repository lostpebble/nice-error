import { assertType, expectTypeOf, test } from "vitest";
import { NiceError } from "../NiceError/NiceError";
import { defineNiceError } from "../NiceErrorDefined/defineNiceError";

test("[NiceError] basic type checks", () => {
  // Check that NiceError is a class that extends Error
  assertType<InstanceType<typeof Error>>(new NiceError());
  assertType<InstanceType<typeof NiceError>>(new NiceError());
});

test("[definedNiceError] basic type checks", () => {
  const err_test = defineNiceError({ domain: "nerr_test" } as const);
  // Check that the defined error has the correct type
  assertType<typeof err_test>(err_test);
  assertType<{ domain: "nerr_test" }>(err_test);
});

test("NiceError object types", () => {
  expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>();
  expectTypeOf<string>().not.toBeAny();
});
