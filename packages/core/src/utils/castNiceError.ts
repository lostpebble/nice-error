import { EErrId_CastNotNice, err_cast_not_nice, err_not_nice } from "../core_errors/err_not_nice";
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
      return err_cast_not_nice
        .fromContext({
          [EErrId_CastNotNice.js_error]: inspected,
        })
        .withOriginError(inspected.jsError);
      // const err = new NiceError({
      //   def: {
      //     domain: "unknown",
      //     allDomains: ["unknown"],
      //   },
      //   contexts: {},
      //   wasntNice: true,
      //   ids: [],
      //   message: inspected.jsError.message,
      //   httpStatusCode: 500,
      //   originError: inspected.jsError,
      // });
      // err.cause = inspected.jsError;
      // return err;
    }

    case EInspectErrorResultType.jsErrorObject: {
      const err = err_cast_not_nice.fromContext({
        [EErrId_CastNotNice.js_error_like_object]: inspected,
      });
      err.cause = inspected.jsErrorObject;
      return err;
    }

    case EInspectErrorResultType.nullish:
      return err_cast_not_nice.fromContext({
        [EErrId_CastNotNice.nullish_value]: inspected,
      });

    case EInspectErrorResultType.jsDataType: {
      return err_cast_not_nice.fromContext({
        [EErrId_CastNotNice.js_data_type]: inspected,
      });
    }

    default:
      return err_cast_not_nice.fromContext({
        [EErrId_CastNotNice.js_other]: inspected,
      });
  }
};
