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

  // @ts-expect-error — error IDs from child domain are not valid for parent domain (empty schema)
  err_example_app.fromContext({ [EErrId_UserAuth.invalid_credentials]: {} });

  // Working as intended
  const authErrorFromContext = err_user_auth.fromContext({
    [EErrId_UserAuth.invalid_credentials]: { username: "another_user" },
  });

  const validContext = authErrorFromContext.getContext(EErrId_UserAuth.invalid_credentials);

  if (err_user_auth.is(authErrorFromContext)) {
    // This block will run because authErrorFromContext is an instance of the child domain
    authErrorFromContext.getContext(EErrId_UserAuth.invalid_credentials).username; // string
  }

  validContext.username; // string

  throw testAuthError;
}
