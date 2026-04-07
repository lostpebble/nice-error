import { defineNiceError } from "../NiceErrorDefined/defineNiceError";
import { logger_NiceError_testing } from "../utils/logger";

export const err_example_app = defineNiceError({
  domain: "err_example_app",
  schema: {},
} as const);

export enum EErrId_UserAuth {
  invalid_credentials = "invalid_credentials",
  account_locked = "account_locked",
}

export const err_user_auth = err_example_app.createChildDomain({
  domain: "err_user_auth",
  schema: {
    [EErrId_UserAuth.invalid_credentials]: {
      message: (context) => `Invalid username or password for username: ${context.username}`,
      httpStatusCode: 401,
      context: {
        required: true,
        type: {} as { username: string },
      },
    },
    [EErrId_UserAuth.account_locked]: {
      message: "Account is locked due to multiple failed login attempts",
      httpStatusCode: 403,
    },
  },
} as const);

function throwUserAuthError() {
  const testAuthError = err_user_auth.fromId(EErrId_UserAuth.invalid_credentials, {
    username: "test_user",
  });

  if (testAuthError.hasId(EErrId_UserAuth.invalid_credentials)) {
    // Do something with the context or the error
    const { username } = testAuthError.getContext(EErrId_UserAuth.invalid_credentials);
    logger_NiceError_testing.debug("Error context (username):", username);
  }

  throw testAuthError;
}
