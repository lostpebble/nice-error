import { defineNiceError, err } from "../NiceErrorDefined/defineNiceError";

export enum EErrId_NotNice {
  js_error = "native_error",
  js_error_like_object = "js_error_like_object",
  nullish_value = "nullish_value",
}

export const err_not_nice = defineNiceError({
  domain: "err_not_nice",
  schema: {
    [EErrId_NotNice.js_error]: err<{ error: Error }>({
      message: ({ error }) => `A native JavaScript Error was encountered: ${error.message}"`,
      httpStatusCode: 500,
    }),
    [EErrId_NotNice.js_error_like_object]: {
      message: "An object resembling a JavaScript Error was encountered",
    },
    [EErrId_NotNice.nullish_value]: {
      message: "A null or undefined value was encountered where an error was expected",
    },
  },
});
