import { describe, expect, it } from "vitest";
import { NiceError } from "../NiceError/NiceError";
import { castNiceError } from "./castNiceError";

describe("castNiceError", () => {
  it("should correctly cast: NiceError instance -> NiceError instance", () => {
    const error = new NiceError("Test error");
    const casted = castNiceError(error);
    expect(casted).toBeInstanceOf(NiceError);
    expect(casted.message).toBe("Test error");
    expect(casted.cause).toBeUndefined();
  });
});
