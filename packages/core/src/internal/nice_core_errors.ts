import { StatusCodes } from "http-status-codes";
import { defineNiceError } from "../NiceErrorDefined/defineNiceError";
import { err } from "../NiceErrorDefined/err";
import type {
  IInspectErrorResult_JsError,
  IInspectErrorResult_JsErrorObject,
  IInspectErrorResult_JsOther,
  IInspectErrorResult_Nullish,
  TInspectErrorResult_JsDataType,
} from "../utils/inspectPotentialError/inspectPotentialError.types";

export const err_nice = defineNiceError({
  domain: "err_nice",
  schema: {},
});

export enum EErrId_CastNotNice {
  js_error = "native_error",
  js_error_like_object = "js_error_like_object",
  nullish_value = "nullish_value",
  js_data_type = "js_data_type",
  js_other = "js_other",
}

export const err_cast_not_nice = err_nice.createChildDomain({
  domain: "err_cast_not_nice",
  defaultHttpStatusCode: StatusCodes.UNPROCESSABLE_ENTITY,
  schema: {
    [EErrId_CastNotNice.js_error]: err<IInspectErrorResult_JsError>({
      context: {
        required: true,
      },
      message: ({ jsError }) =>
        `A native JavaScript Error was encountered during casting: ${jsError.message}`,
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    }),
    [EErrId_CastNotNice.js_error_like_object]: err<IInspectErrorResult_JsErrorObject>({
      context: {
        required: true,
      },
      message: ({ jsErrorObject }) =>
        `An object resembling a JavaScript Error was encountered during casting: [${jsErrorObject.name}] ${jsErrorObject.message}`,
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    }),
    [EErrId_CastNotNice.nullish_value]: err<IInspectErrorResult_Nullish>({
      context: {
        required: true,
      },
      message: ({ value }) =>
        `A nullish value [${value === null ? "null" : "undefined"}] was encountered during casting`,
    }),
    [EErrId_CastNotNice.js_data_type]: err<TInspectErrorResult_JsDataType>({
      context: {
        required: true,
      },
      message: ({ jsDataType, jsDataValue }) => {
        let inspectedValue: string | undefined;

        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {}

        return `A value of type [${jsDataType}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      },
    }),
    [EErrId_CastNotNice.js_other]: err<IInspectErrorResult_JsOther>({
      context: {
        required: true,
      },
      message: ({ jsDataValue }) => {
        let inspectedValue: string | undefined;

        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {}

        return `An unhandled type [${typeof jsDataValue}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      },
    }),
  },
});
