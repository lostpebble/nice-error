import { describe, expect, it } from "vitest";
import { NiceError } from "../NiceError/NiceError";
import { defineNiceError, err } from "../NiceErrorDefined/defineNiceError";
import { nice_error_test_options } from "../test/nice_error_testing.static";
import { castNiceError } from "./castNiceError";

describe("castNiceError", () => {
  it("should correctly cast: NiceError instance -> NiceError instance (same reference)", () => {
    const error = new NiceError(nice_error_test_options);
    const casted = castNiceError(error);
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted).toBe(error); // same reference returned
    expect(casted.message).toBe("Test error");
  });

  it("should correctly cast: plain Error -> NiceError", () => {
    const original = new Error("something broke");
    const casted = castNiceError(original);
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted.message).toBe(
      "A native JavaScript Error was encountered during casting: something broke",
    );
    expect(casted.originError).toBe(original);
  });

  it("should correctly cast: null -> NiceError", () => {
    const casted = castNiceError(null);
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted.message).toBe("A nullish value [null] was encountered during casting");
  });

  it("should correctly cast: string -> NiceError", () => {
    const casted = castNiceError("something went wrong");
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted.message).toBe(
      'A value of type [string] with value ["something went wrong"] was encountered during casting, which is not a valid error type',
    );
  });

  it("should correctly cast: number -> NiceError", () => {
    const casted = castNiceError(42);
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted.message).toBe(
      "A value of type [number] with value [42] was encountered during casting, which is not a valid error type",
    );
  });

  it("should return a NiceError from a defined domain after is() narrows it", () => {
    const err_test = defineNiceError({
      domain: "err_test",
      schema: {
        test_id: err({ message: "test message", httpStatusCode: 400 }),
      },
    } as const);

    const original = err_test.fromId("test_id");
    const casted = castNiceError(original);

    expect(casted).toBeInstanceOf(NiceError);
    expect(err_test.is(casted)).toBe(true);
  });
});
