import { message } from "valibot";
import { EInspectErrorResultType, type TInspectErrorResult } from "./inspectPotentialError.types";
import { logger_NiceError } from "./logger";

export const inspectPotentialError = (potentialError: unknown): TInspectErrorResult => {
  if (potentialError == null) {
    return {
      type: EInspectErrorResultType.nullish,
      value: potentialError,
    };
  }

  if (typeof potentialError === "number") {
    return {
      type: EInspectErrorResultType.jsDataType,
      jsDataType: "number",
      jsDataValue: potentialError,
    };
  }

  if (typeof potentialError === "boolean") {
    return {
      type: EInspectErrorResultType.jsDataType,
      jsDataType: "boolean",
      jsDataValue: potentialError,
    };
  }

  let parsedError = potentialError;

  if (typeof potentialError === "string") {
    if (potentialError.includes("{") && potentialError.includes("name")) {
      try {
        parsedError = JSON.parse(potentialError);
      } catch {
        // Not a JSON string, treat as regular string
        return {
          type: EInspectErrorResultType.jsDataType,
          jsDataType: "string",
          jsDataValue: potentialError,
        };
      }
    }
  }

  if (typeof parsedError !== "object") {
    logger_NiceError.warn({
      message:
        "Received a potential error that is a primitive data type other than string, number, or boolean. This is unexpected and may indicate an issue with error handling in the code.",
      potentialError,
    });

    return {
      jsDataValue: potentialError,
      type: EInspectErrorResultType.jsOther,
    };
  }
};
