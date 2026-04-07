import { defineNiceError } from "../NiceErrorDefined/defineNiceError";

export const err_example_app = defineNiceError({
  domain: "err_example_app",
} as const);

export enum EErrId_UserAuth {
  invalid_credentials = "invalid_credentials",
  account_locked = "account_locked",
}

export const err_user_auth = err_example_app.createChildDomain({
  domain: "err_user_auth",
} as const);
