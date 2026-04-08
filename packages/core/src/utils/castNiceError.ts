import { NiceError } from "../NiceError/NiceError";
import { inspectPotentialError } from "./inspectPotentialError";
import { EInspectErrorResultType } from "./inspectPotentialError.types";

/**
 * Casts any unknown value into a `NiceError`.
 *
 * - If the value is already a `NiceError` instance, it is returned as-is.
 * - If the value is a plain `Error`, it is wrapped with the original as `originError`.
 * - If the value is a JSON-serialised `NiceError` object (e.g. from an API
 *   response), a best-effort `NiceError` is re-created from it.
 * - For all other values, a generic `NiceError` is created with a descriptive
 *   message.
 *
 * After casting, use `NiceErrorDefined.is(error)` to narrow the error to a
 * specific domain and access its strongly-typed ids and context.
 */
export const castNiceError = (error: unknown): NiceError => {
  const inspected = inspectPotentialError(error);

  switch (inspected.type) {
    case EInspectErrorResultType.niceError:
      // Already a NiceError instance — return as-is.
      return inspected.niceError;

    case EInspectErrorResultType.niceErrorObject: {
      // Re-hydrate from a serialised NiceError JSON object.
      const obj = inspected.niceErrorObject;
      return new NiceError(obj);
    }

    case EInspectErrorResultType.jsError: {
      // Wrap a native JS Error, preserving the original as context.
      const err = new NiceError({
        def: {
          domain: "unknown",
          allDomains: ["unknown"],
        },
        contexts: {},
        wasntNice: true,
        ids: [],
        message: inspected.jsError.message,
        httpStatusCode: 500,
        originError: inspected.jsError,
      });
      err.cause = inspected.jsError;
      return err;
    }

    case EInspectErrorResultType.jsErrorObject: {
      const err = new NiceError({
        def: {
          domain: "unknown",
          allDomains: ["unknown"],
        },
        contexts: {},
        wasntNice: true,
        ids: [],
        message: inspected.jsErrorObject.message,
        httpStatusCode: 500,
        originError: Object.assign(
          new Error(inspected.jsErrorObject.message),
          inspected.jsErrorObject,
        ),
      });
      err.cause = inspected.jsErrorObject;
      return err;
    }

    case EInspectErrorResultType.nullish:
      return new NiceError({
        def: {
          domain: "unknown",
          allDomains: ["unknown"],
        },
        contexts: {},
        wasntNice: true,
        ids: [],
        message: "Received null or undefined where an error was expected",
        httpStatusCode: 500,
      });

    case EInspectErrorResultType.jsDataType: {
      const value = inspected.jsDataValue;
      const message =
        typeof value === "string"
          ? value
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return new NiceError(message);
    }

    default:
      return new NiceError("Unknown error");
  }
};
