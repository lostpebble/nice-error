import { defineNiceError, err } from "../NiceErrorDefined/defineNiceError";
import { castNiceError } from "../utils/castNiceError";
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
});

export enum EErrId_UserAuth_Registration {
  password_error = "password_error",
  password_too_short = "password_too_short",
}

export const err_user_auth_registration = err_user_auth.createChildDomain({
  domain: "err_user_auth_registration",
  schema: {
    [EErrId_UserAuth_Registration.password_too_short]: err<{ minLength: number }>({
      message: ({ minLength }) => `Password is too short. Minimum length is ${minLength}.`,
      httpStatusCode: 400,
      context: {
        required: true,
      },
    }),
    [EErrId_UserAuth_Registration.password_error]: err(),
  },
});

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

  const authRegistrationError = err_user_auth_registration
    .fromId(EErrId_UserAuth_Registration.password_error)
    .addContext({
      [EErrId_UserAuth_Registration.password_too_short]: { minLength: 8 },
    });
  // addId() should also be a method that is available on NiceError instances - to allow chaining of multiple IDs after construction

  const authRegistrationObj = authRegistrationError.toJsonObject();

  logger_NiceError_testing.debug("Auth registration error object:", authRegistrationObj);

  const isParent = err_user_auth.isParentOf(err_user_auth_registration); // true
  const isGrandParent = err_example_app.isParentOf(err_user_auth_registration); // true

  const niceErrorCast = castNiceError(authRegistrationObj);

  if (err_user_auth.is(niceErrorCast)) {
    // This block should not run because it is not the exact domain, but a parent domain
    logger_NiceError_testing.error(
      "This should not log because niceErrorCast is not a direct instance of err_user_auth domain",
    );
  }

  if (err_user_auth_registration.is(niceErrorCast)) {
    // This block will run because niceErrorCast is a NiceError instance with matching domain in its definition
    const isParentAfterCast = err_user_auth_registration.isParentOf(niceErrorCast); // true
    const isGrandParentAfterCast = err_example_app.isParentOf(niceErrorCast); // true

    const hasIds = niceErrorCast.hasOneOfIds([EErrId_UserAuth_Registration.password_error]); // should be true
    const pwContext = niceErrorCast.getContext(EErrId_UserAuth_Registration.password_too_short); // should be { minLength: number }

    logger_NiceError_testing.debug(
      "Successfully cast auth registration error object back to NiceError instance:",
      niceErrorCast,
    );
  }

  throw testAuthError;
}
