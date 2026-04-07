import { describe, expect, it } from "vitest";
import type { INiceErrorJsonObject } from "../NiceError/NiceError.types";
import { inspectPotentialError } from "./inspectPotentialError";

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

  it("should correctly identify NiceError objects", () => {
    const niceErrorObj: INiceErrorJsonObject = {
      name: "NiceError",
      message: "This is a test error",
      httpStatusCode: 500,
      wasntNice: false,
      ids: ["TEST_ERROR"],
    };

    const result = inspectPotentialError(niceErrorObj);

    expect(result).toEqual({
      type: "niceErrorObject",
      niceErrorObject: niceErrorObj,
    });
  });
});
