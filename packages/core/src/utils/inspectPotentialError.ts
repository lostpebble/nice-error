import { NiceError } from "../NiceError/NiceError";
import type { IRegularErrorJsonObject } from "../NiceError/NiceError.types";
import { EInspectErrorResultType, type TInspectErrorResult } from "./inspectPotentialError.types";
import { isNiceErrorObject } from "./isNiceErrorObject";
import { isRegularErrorJsonObject } from "./isRegularErrorObject";
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

  let parsedError: unknown = potentialError;

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
    } else {
      return {
        type: EInspectErrorResultType.jsDataType,
        jsDataType: "string",
        jsDataValue: potentialError,
      };
    }
  }

  if (typeof parsedError !== "object" || parsedError === null) {
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

  if (parsedError instanceof NiceError) {
    return {
      type: EInspectErrorResultType.niceError,
      niceError: parsedError,
    };
  }

  if (isNiceErrorObject(parsedError)) {
    return {
      type: EInspectErrorResultType.niceErrorObject,
      niceErrorObject: parsedError,
    };
  }

  if (parsedError instanceof Error) {
    return {
      type: EInspectErrorResultType.jsError,
      jsError: parsedError,
    };
  }

  if (isRegularErrorJsonObject(parsedError)) {
    return {
      type: EInspectErrorResultType.jsErrorObject,
      jsErrorObject: parsedError as IRegularErrorJsonObject,
    };
  }

  return {
    type: EInspectErrorResultType.jsDataType,
    jsDataType: "object",
    jsDataValue: parsedError,
  };
};
