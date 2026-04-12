/**
 * Integration: multi-ID compound errors
 *
 * Tests the builder pattern for errors that represent more than one failure
 * simultaneously — e.g. a form with multiple validation failures, or an
 * operation that hit several error conditions at once.
 *
 * Pressure points:
 * - Immutability: builder methods must never mutate the original
 * - matchFirst order: first active ID wins
 * - Full serialization round-trip preserving all IDs and their context
 * - matches() fingerprint comparison across transport
 */

import { describe, expect, it } from "vitest";
import { castNiceError, defineNiceError, err, type InferNiceError, matchFirst } from "../../index";

// ---------------------------------------------------------------------------
// Domain: form validation
// ---------------------------------------------------------------------------

const err_form = defineNiceError({
  domain: "err_form",
  defaultHttpStatusCode: 422,
  schema: {
    required_field: err<{ field: string }>({
      message: ({ field }) => `"${field}" is required`,
      context: { required: true },
    }),
    too_short: err<{ field: string; min: number }>({
      message: ({ field, min }) => `"${field}" must be at least ${min} characters`,
      context: { required: true },
    }),
    invalid_format: err<{ field: string; expected: string }>({
      message: ({ field, expected }) => `"${field}" must match format: ${expected}`,
      context: { required: true },
    }),
    duplicate_value: err<{ field: string; value: string }>({
      message: ({ field, value }) => `"${field}" value "${value}" is already taken`,
      context: { required: true },
    }),
    rate_limit_exceeded: err({
      message: "Too many submission attempts",
      httpStatusCode: 429,
    }),
  },
} as const);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wireTransit(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("multi-ID construction via fromContext", () => {
  it("fromContext creates an error with all supplied IDs", () => {
    const error = err_form.fromContext({
      required_field: { field: "email" },
      too_short: { field: "password", min: 8 },
    });

    expect(error.hasMultiple).toBe(true);
    expect(error.getIds()).toEqual(expect.arrayContaining(["required_field", "too_short"]));
  });

  it("message reflects the first ID supplied to fromContext", () => {
    const error = err_form.fromContext({
      required_field: { field: "username" },
      too_short: { field: "bio", min: 20 },
    });
    expect(error.message).toBe('"username" is required');
  });

  it("each ID has its own typed context", () => {
    const error = err_form.fromContext({
      required_field: { field: "email" },
      invalid_format: { field: "email", expected: "user@domain.com" },
    });

    expect(error.getContext("required_field")).toEqual({ field: "email" });
    expect(error.getContext("invalid_format")).toEqual({
      field: "email",
      expected: "user@domain.com",
    });
  });
});

describe("multi-ID construction via addId / addContext chaining", () => {
  it("addId does not mutate the original and returns a new instance", () => {
    const base = err_form.fromId("required_field", { field: "name" });
    const extended = base.addId("too_short", { field: "name", min: 3 });

    expect(base.getIds()).toEqual(["required_field"]);
    expect(base.hasMultiple).toBe(false);
    expect(extended.getIds()).toEqual(expect.arrayContaining(["required_field", "too_short"]));
    expect(extended.hasMultiple).toBe(true);
    expect(extended).not.toBe(base);
  });

  it("addContext does not mutate the original and returns a new instance", () => {
    const base = err_form.fromId("required_field", { field: "phone" });
    const extended = base.addContext({
      invalid_format: { field: "phone", expected: "+1-555-0000" },
    });

    expect(base.getIds()).toEqual(["required_field"]);
    expect(extended.getIds()).toEqual(expect.arrayContaining(["required_field", "invalid_format"]));
    expect(extended).not.toBe(base);
  });

  it("long builder chain accumulates all IDs immutably", () => {
    const error = err_form
      .fromId("required_field", { field: "email" })
      .addId("too_short", { field: "password", min: 8 })
      .addContext({ rate_limit_exceeded: undefined });

    expect(error.getIds()).toHaveLength(3);
    expect(error.hasOneOfIds(["required_field", "too_short", "rate_limit_exceeded"])).toBe(true);
  });
});

describe("matchFirst on multi-ID errors", () => {
  it("first active ID wins regardless of handler order", () => {
    // IDs are: required_field (first), too_short (second)
    const error = err_form.fromContext({
      required_field: { field: "email" },
      too_short: { field: "email", min: 5 },
    });

    const result = matchFirst(error, {
      too_short: () => "too_short_handler",
      required_field: () => "required_field_handler",
    });
    // "required_field" was the first ID created — it fires first
    expect(result).toBe("required_field_handler");
  });

  it("falls through to next handler when first ID has no handler", () => {
    const error = err_form.fromContext({
      required_field: { field: "email" },
      duplicate_value: { field: "username", value: "alice" },
    });

    const result = matchFirst(error, {
      // No handler for required_field — should fall to duplicate_value
      duplicate_value: ({ value }) => `duplicate: ${value}`,
    });
    expect(result).toBe("duplicate: alice");
  });

  it("fallback _ handler fires when no IDs match", () => {
    // Cast to the full union so matchFirst accepts handlers for any schema id
    const error = err_form.fromId("rate_limit_exceeded") as InferNiceError<typeof err_form>;
    const result = matchFirst(error, {
      required_field: () => "nope",
      _: () => "fallback",
    });
    expect(result).toBe("fallback");
  });

  it("returns undefined when no handler matches and no fallback", () => {
    const error = err_form.fromId("rate_limit_exceeded") as InferNiceError<typeof err_form>;
    const result = matchFirst(error, {
      required_field: () => "nope",
    });
    expect(result).toBeUndefined();
  });
});

describe("multi-ID round-trip across transport", () => {
  it("all IDs and their contexts survive a full wire transit", () => {
    const serverErr = err_form
      .fromId("required_field", { field: "email" })
      .addId("too_short", { field: "password", min: 8 })
      .addId("invalid_format", { field: "email", expected: "user@domain.com" });

    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    expect(err_form.isExact(casted)).toBe(true);
    expect(casted.getIds()).toHaveLength(3);
    expect(casted.hasOneOfIds(["required_field"])).toBe(true);
    expect(casted.hasOneOfIds(["too_short"])).toBe(true);
    expect(casted.hasOneOfIds(["invalid_format"])).toBe(true);

    // All context is JSON-safe — no hydration required
    if (casted.hasId("too_short")) {
      expect(casted.getContext("too_short")).toEqual({ field: "password", min: 8 });
    }
  });

  it("matches() fingerprint is stable before and after transport", () => {
    const original = err_form.fromContext({
      required_field: { field: "x" },
      too_short: { field: "x", min: 1 },
    });

    const wire = wireTransit(original.toJsonObject());
    const casted = castNiceError(wire);

    // A "template" error with same domain + same IDs but different context values
    const template = err_form.fromContext({
      required_field: { field: "y" },
      too_short: { field: "y", min: 99 },
    });
    expect(casted.matches(template)).toBe(true);
    expect(casted.matches(original)).toBe(true);
  });

  it("a no-context ID mixed with context IDs survives transport", () => {
    const serverErr = err_form
      .fromId("rate_limit_exceeded")
      .addId("required_field", { field: "email" });

    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    if (!err_form.isExact(casted)) throw new Error("domain mismatch");

    const hydrated = err_form.hydrate(casted);
    expect(hydrated.hasId("rate_limit_exceeded")).toBe(true);
    if (hydrated.hasId("rate_limit_exceeded")) {
      expect(hydrated.getContext("rate_limit_exceeded")).toBeUndefined();
    }
    if (hydrated.hasId("required_field")) {
      expect(hydrated.getContext("required_field")).toEqual({ field: "email" });
    }
  });
});
