import { describe, expect, it, vi } from "vitest";
import { NiceError } from "../NiceError/NiceError";
import type { INiceErrorJsonObject, IRegularErrorJsonObject } from "../NiceError/NiceError.types";
import { inspectPotentialError } from "./inspectPotentialError";
import { logger_NiceError } from "./logger";

describe("inspectPotentialError", () => {
  it("should correctly identify nullish values", () => {
    const nullResult = inspectPotentialError(null);

    expect(nullResult).toEqual({
      type: "nullish",
      value: null,
    });

    const undefinedResult = inspectPotentialError(undefined);

    expect(undefinedResult).toEqual({
      type: "nullish",
      value: undefined,
    });
  });

  it("should correctly identify a NiceError instance", () => {
    const niceError = new NiceError({
      def: {
        domain: "TEST_DOMAIN",
        allDomains: ["TEST_DOMAIN"],
      },
      contexts: {},
      ids: [],
      message: "Something went wrong",
      httpStatusCode: 500,
      wasntNice: false,
    });

    const result = inspectPotentialError(niceError);

    expect(result).toEqual({
      type: "niceError",
      niceError,
    });
  });

  it("should correctly identify NiceError JSON objects", () => {
    const niceErrorObj: INiceErrorJsonObject = {
      contexts: {},
      ids: [],
      name: "NiceError",
      message: "This is a test error",
      httpStatusCode: 500,
      wasntNice: false,
      def: {
        domain: "TEST_DOMAIN",
        allDomains: ["TEST_DOMAIN"],
      },
    };

    const result = inspectPotentialError(niceErrorObj);

    expect(result).toEqual({
      type: "niceErrorObject",
      niceErrorObject: niceErrorObj,
    });
  });

  it("should correctly identify NiceError JSON objects serialized as a string", () => {
    const niceErrorObj: INiceErrorJsonObject = {
      contexts: {},
      ids: [],
      name: "NiceError",
      message: "Serialized nice error",
      httpStatusCode: 404,
      wasntNice: true,
      def: {
        domain: "TEST_DOMAIN",
        allDomains: ["TEST_DOMAIN"],
      },
    };

    const result = inspectPotentialError(JSON.stringify(niceErrorObj));

    expect(result).toEqual({
      type: "niceErrorObject",
      niceErrorObject: niceErrorObj,
    });
  });

  it("should correctly identify native JS Error instances", () => {
    const jsError = new Error("A plain JS error");

    const result = inspectPotentialError(jsError);

    expect(result).toEqual({
      type: "jsError",
      jsError,
    });
  });

  it("should correctly identify JS error-like objects (jsErrorObject)", () => {
    const errorLikeObj: IRegularErrorJsonObject = {
      name: "TypeError",
      message: "Cannot read property of undefined",
      stack: "TypeError: ...",
    } as IRegularErrorJsonObject;

    const result = inspectPotentialError(errorLikeObj);

    expect(result).toEqual({
      type: "jsErrorObject",
      jsErrorObject: errorLikeObj,
    });
  });

  it("should correctly identify string data type values", () => {
    const result = inspectPotentialError("just a plain string");

    expect(result).toEqual({
      type: "jsDataType",
      jsDataType: "string",
      jsDataValue: "just a plain string",
    });
  });

  it("should correctly identify number data type values", () => {
    const result = inspectPotentialError(42);

    expect(result).toEqual({
      type: "jsDataType",
      jsDataType: "number",
      jsDataValue: 42,
    });
  });

  it("should correctly identify boolean data type values", () => {
    const trueResult = inspectPotentialError(true);

    expect(trueResult).toEqual({
      type: "jsDataType",
      jsDataType: "boolean",
      jsDataValue: true,
    });

    const falseResult = inspectPotentialError(false);

    expect(falseResult).toEqual({
      type: "jsDataType",
      jsDataType: "boolean",
      jsDataValue: false,
    });
  });

  it("should correctly identify plain objects as jsDataType object", () => {
    const plainObj = { foo: "bar", count: 3 };

    const result = inspectPotentialError(plainObj);

    expect(result).toEqual({
      type: "jsDataType",
      jsDataType: "object",
      jsDataValue: plainObj,
    });
  });

  it("should return jsOther and log a warning for unexpected primitives like Symbol", () => {
    const warnSpy = vi.spyOn(logger_NiceError, "warn").mockImplementation(() => undefined);

    const sym = Symbol("test");
    const result = inspectPotentialError(sym);

    expect(result).toEqual({
      type: "jsOther",
      jsDataValue: sym,
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("primitive data type"),
        potentialError: sym,
      }),
    );

    warnSpy.mockRestore();
  });
});
