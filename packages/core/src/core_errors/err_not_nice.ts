import { defineNiceError, err } from "../NiceErrorDefined/defineNiceError";

export const err_not_nice = defineNiceError({
  domain: "err_not_nice",
  schema: {},
});

export enum EErrId_CastNotNice {
  js_error = "native_error",
  js_error_like_object = "js_error_like_object",
  nullish_value = "nullish_value",
}

export const err_cast_not_nice = err_not_nice.createChildDomain({
  domain: "err_cast_not_nice",
  schema: {
    [EErrId_CastNotNice.js_error]: err<{ error: Error }>({
      message: ({ error }) => `A native JavaScript Error was encountered: ${error.message}"`,
      httpStatusCode: 500,
    }),
    [EErrId_CastNotNice.js_error_like_object]: {
      message: "An object resembling a JavaScript Error was encountered",
    },
    [EErrId_CastNotNice.nullish_value]: {
      message: "A null or undefined value was encountered where an error was expected",
    },
  },
});
