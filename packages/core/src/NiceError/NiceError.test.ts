import { describe, expect, it } from "vitest";
import { defineNiceError } from "../NiceErrorDefined/defineNiceError";
import { err } from "../NiceErrorDefined/err";
import { nice_error_test_options } from "../test/helpers/nice_error_testing.static";
import { castNiceError } from "../utils/castNiceError";
import { NiceError } from "./NiceError";
import { EContextSerializedState } from "./NiceError.enums";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const err_app = defineNiceError({
  domain: "err_app",
  schema: {},
} as const);

enum EAuth {
  invalid_credentials = "invalid_credentials",
  account_locked = "account_locked",
}

const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    [EAuth.invalid_credentials]: err<{ username: string }>({
      message: ({ username }) => `Invalid credentials for ${username}`,
      httpStatusCode: 401,
      context: { required: true },
    }),
    [EAuth.account_locked]: err({
      message: "Account locked",
      httpStatusCode: 403,
    }),
  },
} as const);

enum ERegistration {
  password_too_short = "password_too_short",
  password_error = "password_error",
}

const err_registration = err_auth.createChildDomain({
  domain: "err_registration",
  schema: {
    [ERegistration.password_too_short]: err<{ minLength: number }>({
      message: ({ minLength }) => `Password is too short. Minimum length is ${minLength}.`,
      httpStatusCode: 400,
      context: { required: true },
    }),
    [ERegistration.password_error]: err(),
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("NiceError — bare construction", () => {
  it("creates a NiceError with default values when no args are provided", () => {
    const testErr = new NiceError(nice_error_test_options);
    expect(testErr).toBeInstanceOf(NiceError);
    expect(testErr).toBeInstanceOf(Error);
    expect(testErr.name).toBe("NiceError");
    expect(testErr.message).toBe("Test error");
    expect(testErr.wasntNice).toBe(false);
    expect(testErr.httpStatusCode).toBe(500);
    expect(testErr.ids).toEqual([]);
    expect(testErr.def.domain).toBe("TEST_DOMAIN");
  });

  it("creates a NiceError with a custom message", () => {
    const testErr = new NiceError({
      ...nice_error_test_options,
      message: "something broke",
    });
    expect(testErr.message).toBe("something broke");
    expect(testErr.httpStatusCode).toBe(500);
  });
});

describe("NiceErrorDefined.fromId", () => {
  it("creates an error with the correct id and message (with context)", () => {
    const testErr = err_auth.fromId(EAuth.invalid_credentials, {
      username: "alice",
    });
    expect(testErr).toBeInstanceOf(NiceError);
    expect(testErr.ids).toEqual([EAuth.invalid_credentials]);
    expect(testErr.message).toBe("Invalid credentials for alice");
    expect(testErr.httpStatusCode).toBe(401);
  });

  it("creates an error with a static message (no context)", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    expect(testErr.ids).toEqual([EAuth.account_locked]);
    expect(testErr.message).toBe("Account locked");
    expect(testErr.httpStatusCode).toBe(403);
  });

  it("creates an error with default message when schema entry has no message", () => {
    const testErr = err_registration.fromId(ERegistration.password_error);
    expect(testErr.ids).toEqual([ERegistration.password_error]);
    expect(testErr.message).toBe("[err_registration::password_error] An error occurred.");
    expect(testErr.httpStatusCode).toBe(500);
  });

  it("preserves the domain definition on the error", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    expect(testErr.def.domain).toBe("err_auth");
    expect(testErr.def.allDomains).toEqual(["err_auth", "err_app"]);
  });
});

describe("NiceErrorDefined.fromContext", () => {
  it("creates a multi-id error with all supplied context entries", () => {
    const testErr = err_auth.fromContext({
      [EAuth.invalid_credentials]: { username: "bob" },
      [EAuth.account_locked]: undefined,
    });
    expect(testErr.getIds()).toEqual(
      expect.arrayContaining([EAuth.invalid_credentials, EAuth.account_locked]),
    );
    expect(testErr.hasMultiple).toBe(true);
  });

  it("uses the first entry's message and httpStatusCode", () => {
    const testErr = err_auth.fromContext({
      [EAuth.invalid_credentials]: { username: "carol" },
    });
    expect(testErr.message).toBe("Invalid credentials for carol");
    expect(testErr.httpStatusCode).toBe(401);
    expect(testErr.hasMultiple).toBe(false);
  });

  it("throws when given an empty context object", () => {
    expect(() => err_auth.fromContext({} as any)).toThrow("at least one error id");
  });
});

describe("NiceError.hasId / hasOneOfIds", () => {
  it("hasId returns true for the active id and false for others", () => {
    const testErr = err_auth.fromId(EAuth.invalid_credentials, {
      username: "x",
    });
    expect(testErr.hasId(EAuth.invalid_credentials)).toBe(true);
    expect(testErr.hasId(EAuth.account_locked)).toBe(false);
  });

  it("hasOneOfIds returns true when at least one id matches", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    expect(testErr.hasOneOfIds([EAuth.invalid_credentials, EAuth.account_locked])).toBe(true);
    expect(testErr.hasOneOfIds([EAuth.invalid_credentials])).toBe(false);
  });

  it("hasOneOfIds works with multi-id errors", () => {
    const testErr = err_auth.fromContext({
      [EAuth.invalid_credentials]: { username: "z" },
      [EAuth.account_locked]: undefined,
    });
    expect(testErr.hasOneOfIds([EAuth.invalid_credentials])).toBe(true);
    expect(testErr.hasOneOfIds([EAuth.account_locked])).toBe(true);
  });
});

describe("NiceError.getContext", () => {
  it("returns the context value for the active id", () => {
    const testErr = err_auth.fromId(EAuth.invalid_credentials, {
      username: "dave",
    });
    expect(testErr.getContext(EAuth.invalid_credentials)).toEqual({
      username: "dave",
    });
  });

  it("returns the correct context for each id in a multi-id error", () => {
    const testErr = err_auth.fromContext({
      [EAuth.invalid_credentials]: { username: "eve" },
      [EAuth.account_locked]: undefined,
    });

    if (testErr.hasId(EAuth.invalid_credentials)) {
      expect(testErr.getContext(EAuth.invalid_credentials)).toEqual({
        username: "eve",
      });
    }
    if (testErr.hasId(EAuth.account_locked)) {
      expect(testErr.getContext(EAuth.account_locked)).toBeUndefined();
    }
  });
});

describe("NiceError.addContext", () => {
  it("returns a new NiceError with merged context entries", () => {
    const original = err_auth.fromId(EAuth.invalid_credentials, {
      username: "frank",
    });
    const expanded = original.addContext({
      [EAuth.account_locked]: undefined,
    });

    // Original is unchanged
    expect(original.getIds()).toEqual([EAuth.invalid_credentials]);
    expect(original.hasMultiple).toBe(false);

    // Expanded has both ids
    expect(expanded.getIds()).toEqual([EAuth.invalid_credentials, EAuth.account_locked]);
    expect(expanded.hasMultiple).toBe(true);
    expect(expanded.ids).toEqual([EAuth.invalid_credentials, EAuth.account_locked]);
  });

  it("preserves message, httpStatusCode, and wasntNice from the original", () => {
    const original = err_auth.fromId(EAuth.invalid_credentials, {
      username: "grace",
    });
    const expanded = original.addContext({
      [EAuth.account_locked]: undefined,
    });
    expect(expanded.message).toBe(original.message);
    expect(expanded.httpStatusCode).toBe(original.httpStatusCode);
    expect(expanded.wasntNice).toBe(original.wasntNice);
  });

  it("works when chained from fromId (as in example file)", () => {
    const testErr = err_registration.fromId(ERegistration.password_error).addContext({
      [ERegistration.password_too_short]: { minLength: 8 },
    });

    expect(testErr.getIds()).toEqual(
      expect.arrayContaining([ERegistration.password_error, ERegistration.password_too_short]),
    );
    expect(testErr.hasId(ERegistration.password_too_short)).toBe(true);
    if (testErr.hasId(ERegistration.password_too_short)) {
      expect(testErr.getContext(ERegistration.password_too_short)).toEqual({
        minLength: 8,
      });
    }
  });
});

describe("NiceError.addId", () => {
  it("adds a single id without context", () => {
    const original = err_registration.fromId(ERegistration.password_too_short, { minLength: 10 });
    const expanded = original.addId(ERegistration.password_error);

    expect(expanded.getIds()).toEqual(
      expect.arrayContaining([ERegistration.password_too_short, ERegistration.password_error]),
    );
    expect(expanded.ids).toEqual(
      expect.arrayContaining([ERegistration.password_too_short, ERegistration.password_error]),
    );
  });

  it("adds a single id with required context", () => {
    const original = err_registration.fromId(ERegistration.password_error);
    const expanded = original.addId(ERegistration.password_too_short, {
      minLength: 12,
    });

    expect(expanded.hasId(ERegistration.password_too_short)).toBe(true);
    if (expanded.hasId(ERegistration.password_too_short)) {
      expect(expanded.getContext(ERegistration.password_too_short)).toEqual({
        minLength: 12,
      });
    }
  });

  it("does not mutate the original error", () => {
    const original = err_auth.fromId(EAuth.account_locked);
    const expanded = original.addId(EAuth.invalid_credentials, {
      username: "heidi",
    });

    expect(original.getIds()).toEqual([EAuth.account_locked]);
    expect(expanded.getIds()).toHaveLength(2);
  });
});

describe("NiceError.toJsonObject", () => {
  it("serializes to the correct shape", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    const json = testErr.toJsonObject();

    expect(json).toEqual({
      name: "NiceError",
      def: {
        domain: "err_auth",
        allDomains: ["err_auth", "err_app"],
      },
      ids: [EAuth.account_locked],
      errorData: {
        [EAuth.account_locked]: {
          contextState: { kind: EContextSerializedState.serde_unset, value: undefined },
          message: "Account locked",
          httpStatusCode: 403,
        },
      },
      wasntNice: false,
      message: "Account locked",
      httpStatusCode: 403,
      stack: expect.any(String),
      originError: undefined,
    });
  });

  it("includes originError when present", () => {
    const original = new TypeError("bad type");
    const casted = castNiceError(original);
    const json = casted.toJsonObject();

    expect(json.originError).toBeDefined();
    expect(json.originError?.name).toBe("TypeError");
    expect(json.originError?.message).toBe("bad type");
    expect(casted.cause).toBe(original);
  });
});

describe("NiceErrorDefined.is — exact domain match", () => {
  it("returns true for errors from the exact domain", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    expect(err_auth.isExact(testErr)).toBe(true);
  });

  it("returns false for errors from a child domain", () => {
    const testErr = err_registration.fromId(ERegistration.password_error);
    expect(err_auth.isExact(testErr)).toBe(false);
  });

  it("returns false for errors from a parent domain", () => {
    const testErr = err_auth.fromId(EAuth.account_locked);
    expect(err_registration.isExact(testErr)).toBe(false);
  });

  it("returns false for non-NiceError values", () => {
    expect(err_auth.isExact(new Error("nope"))).toBe(false);
    expect(err_auth.isExact(null)).toBe(false);
    expect(err_auth.isExact("string")).toBe(false);
    expect(err_auth.isExact(undefined)).toBe(false);
  });
});

describe("NiceErrorDefined.isParentOf", () => {
  describe("with NiceErrorDefined targets", () => {
    it("returns true when this domain is a direct parent", () => {
      expect(err_auth.isParentOf(err_registration)).toBe(true);
    });

    it("returns true when this domain is a grandparent", () => {
      expect(err_app.isParentOf(err_registration)).toBe(true);
    });

    it("returns true when checking self (domain is in own allDomains)", () => {
      expect(err_auth.isParentOf(err_auth)).toBe(true);
    });

    it("returns false when this domain is a child, not a parent", () => {
      expect(err_registration.isParentOf(err_auth)).toBe(false);
    });

    it("returns false for unrelated domains", () => {
      const err_unrelated = defineNiceError({
        domain: "err_unrelated",
        schema: {},
      } as const);
      expect(err_unrelated.isParentOf(err_auth)).toBe(false);
    });
  });

  describe("with NiceError instance targets", () => {
    it("returns true when the error belongs to a child domain", () => {
      const testErr = err_registration.fromId(ERegistration.password_error);
      expect(err_auth.isParentOf(testErr)).toBe(true);
      expect(err_app.isParentOf(testErr)).toBe(true);
    });

    it("returns true when the error belongs to this exact domain", () => {
      const testErr = err_registration.fromId(ERegistration.password_error);
      expect(err_registration.isParentOf(testErr)).toBe(true);
    });

    it("returns false when the error belongs to a parent domain", () => {
      const testErr = err_auth.fromId(EAuth.account_locked);
      expect(err_registration.isParentOf(testErr)).toBe(false);
    });
  });
});

describe("Domain hierarchy — createChildDomain", () => {
  it("child domain has parent in allDomains", () => {
    expect(err_auth.allDomains).toEqual(["err_auth", "err_app"]);
  });

  it("grandchild domain has full ancestry chain", () => {
    expect(err_registration.allDomains).toEqual(["err_registration", "err_auth", "err_app"]);
  });

  it("child schema is independent of parent schema", () => {
    const parentErr = err_app;
    expect(Object.keys((parentErr as any)._schema)).toHaveLength(0);

    const childErr = err_auth.fromId(EAuth.account_locked);
    expect(childErr.def.schema).toHaveProperty(EAuth.invalid_credentials);
    expect(childErr.def.schema).toHaveProperty(EAuth.account_locked);
  });
});

describe("castNiceError + is() + isParentOf() integration", () => {
  it("cast a serialized NiceError and narrow with is()", () => {
    const original = err_auth.fromId(EAuth.invalid_credentials, {
      username: "ivan",
    });
    const json = original.toJsonObject();
    const casted = castNiceError(json);

    // castNiceError re-creates from JSON — check it's a NiceError
    expect(casted).toBeInstanceOf(NiceError);
  });

  it("is() matches exact domain after casting an instance", () => {
    const original = err_registration.fromId(ERegistration.password_error);
    const casted = castNiceError(original);

    expect(err_registration.isExact(casted)).toBe(true);
    expect(err_auth.isExact(casted)).toBe(false);
    expect(err_app.isExact(casted)).toBe(false);
  });

  it("isParentOf() matches ancestry after casting an instance", () => {
    const original = err_registration.fromId(ERegistration.password_error);
    const casted = castNiceError(original);

    expect(err_registration.isParentOf(casted)).toBe(true);
    expect(err_auth.isParentOf(casted)).toBe(true);
    expect(err_app.isParentOf(casted)).toBe(true);
  });

  it("full example flow: fromId -> addContext -> toJsonObject -> castNiceError -> is()", () => {
    const err = err_registration.fromId(ERegistration.password_error).addContext({
      [ERegistration.password_too_short]: { minLength: 8 },
    });

    const json = err.toJsonObject();
    const casted = castNiceError(json);

    expect(casted).toBeInstanceOf(NiceError);
    // After re-hydration from JSON, castNiceError creates a bare NiceError
    // (only message is preserved), so is() won't match — this is expected
    // for the JSON path. Instance path preserves everything.
    const instanceCasted = castNiceError(err);
    expect(err_registration.isExact(instanceCasted)).toBe(true);
    expect(err_auth.isExact(instanceCasted)).toBe(false);
    expect(err_auth.isParentOf(instanceCasted)).toBe(true);
  });
});

describe("NiceError — edge cases", () => {
  it("getIds returns empty-like array for bare construction", () => {
    const err = new NiceError(nice_error_test_options);
    expect(err.getIds()).toEqual([]);
  });

  it("hasMultiple is false for single-id errors", () => {
    const err = err_auth.fromId(EAuth.account_locked);
    expect(err.hasMultiple).toBe(false);
  });

  it("error is instanceof Error", () => {
    const err = err_auth.fromId(EAuth.account_locked);
    expect(err).toBeInstanceOf(Error);
    expect(err.stack).toBeDefined();
  });

  it("addContext returns a new instance (not the same reference)", () => {
    const original = err_auth.fromId(EAuth.account_locked);
    const expanded = original.addContext({
      [EAuth.invalid_credentials]: { username: "test" },
    });
    expect(expanded).not.toBe(original);
    expect(expanded).toBeInstanceOf(NiceError);
  });

  it("addId returns a new instance (not the same reference)", () => {
    const original = err_auth.fromId(EAuth.account_locked);
    const expanded = original.addId(EAuth.invalid_credentials, {
      username: "test",
    });
    expect(expanded).not.toBe(original);
  });

  it("chaining multiple addId calls accumulates all ids", () => {
    const err = err_registration
      .fromId(ERegistration.password_error)
      .addId(ERegistration.password_too_short, { minLength: 6 });

    expect(err.getIds()).toEqual(
      expect.arrayContaining([ERegistration.password_error, ERegistration.password_too_short]),
    );
    expect(err.hasMultiple).toBe(true);
  });
});
