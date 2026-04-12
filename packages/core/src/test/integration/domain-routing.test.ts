/**
 * Integration: domain-based error routing
 *
 * Simulates a middleware/error-handler pattern where an unknown thrown value
 * arrives and must be dispatched to the correct handler based on domain ancestry.
 *
 * Scenario: a three-level hierarchy (app → service → feature) where errors can
 * come from any level. Handlers are registered at each level and the most
 * specific one wins.
 */

import { describe, expect, it } from "vitest";
import { castAndHydrate, castNiceError, defineNiceError, err, matchFirst } from "../../index";

// ---------------------------------------------------------------------------
// Three-level hierarchy
// ---------------------------------------------------------------------------

const err_app = defineNiceError({
  domain: "err_app",
  defaultHttpStatusCode: 500,
  schema: {
    unexpected: err({ message: "An unexpected error occurred" }),
  },
} as const);

const err_service = err_app.createChildDomain({
  domain: "err_service",
  schema: {
    unavailable: err({ message: "Service is temporarily unavailable", httpStatusCode: 503 }),
    dependency_failed: err<{ dep: string }>({
      message: ({ dep }) => `Dependency "${dep}" failed`,
      httpStatusCode: 502,
      context: { required: true },
    }),
  },
} as const);

const err_feature = err_service.createChildDomain({
  domain: "err_feature",
  schema: {
    not_found: err<{ resource: string }>({
      message: ({ resource }) => `${resource} not found`,
      httpStatusCode: 404,
      context: { required: true },
    }),
    forbidden: err<{ userId: string; action: string }>({
      message: ({ userId, action }) => `User ${userId} is not permitted to ${action}`,
      httpStatusCode: 403,
      context: { required: true },
    }),
    validation_error: err<{ field: string; issue: string }>({
      message: ({ field, issue }) => `Validation failed for "${field}": ${issue}`,
      httpStatusCode: 422,
      context: { required: true },
    }),
  },
} as const);

// ---------------------------------------------------------------------------
// Simulated request handler — routes to response by error domain
// ---------------------------------------------------------------------------

type THttpResponse = { status: number; body: string };

function handleError(thrown: unknown): THttpResponse {
  const error = castNiceError(thrown);

  // Most specific domain first
  if (err_feature.isExact(error)) {
    const hydrated = err_feature.hydrate(error);
    const matched = matchFirst(hydrated, {
      not_found: ({ resource }): THttpResponse => ({ status: 404, body: `${resource} not found` }),
      forbidden: ({ userId, action }): THttpResponse => ({
        status: 403,
        body: `${userId} cannot ${action}`,
      }),
      validation_error: ({ field, issue }): THttpResponse => ({
        status: 422,
        body: `${field}: ${issue}`,
      }),
    });
    if (matched) return matched;
  }

  if (err_service.isExact(error)) {
    const hydrated = err_service.hydrate(error);
    const matched = matchFirst(hydrated, {
      unavailable: (): THttpResponse => ({ status: 503, body: "Service unavailable" }),
      dependency_failed: ({ dep }): THttpResponse => ({ status: 502, body: `${dep} failed` }),
    });
    if (matched) return matched;
  }

  if (err_app.isExact(error)) {
    const hydrated = err_app.hydrate(error);
    const matched = matchFirst(hydrated, {
      unexpected: (): THttpResponse => ({ status: 500, body: "Unexpected error" }),
    });
    if (matched) return matched;
  }

  // Truly unknown — non-NiceError
  return { status: 500, body: "Unknown error" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("domain routing — direct instances", () => {
  it("routes err_feature errors to the feature handler", () => {
    const err = err_feature.fromId("not_found", { resource: "User#42" });
    expect(handleError(err)).toEqual({ status: 404, body: "User#42 not found" });
  });

  it("routes err_service errors when not an err_feature error", () => {
    const err = err_service.fromId("unavailable");
    expect(handleError(err)).toEqual({ status: 503, body: "Service unavailable" });
  });

  it("routes to app-level handler for root domain errors", () => {
    const err = err_app.fromId("unexpected");
    expect(handleError(err)).toEqual({ status: 500, body: "Unexpected error" });
  });

  it("returns fallback for non-NiceError thrown values", () => {
    expect(handleError(new Error("boom"))).toEqual({ status: 500, body: "Unknown error" });
    expect(handleError("string error")).toEqual({ status: 500, body: "Unknown error" });
    expect(handleError(null)).toEqual({ status: 500, body: "Unknown error" });
  });
});

describe("domain routing — errors arriving over the wire (JSON payload)", () => {
  function wireTransit(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  it("feature domain errors still route correctly after wire transit", () => {
    const original = err_feature.fromId("forbidden", {
      userId: "u-99",
      action: "delete",
    });
    const wire = wireTransit(original.toJsonObject());
    expect(handleError(wire)).toEqual({ status: 403, body: "u-99 cannot delete" });
  });

  it("service domain errors still route correctly after wire transit", () => {
    const original = err_service.fromId("dependency_failed", { dep: "redis" });
    const wire = wireTransit(original.toJsonObject());
    expect(handleError(wire)).toEqual({ status: 502, body: "redis failed" });
  });

  it("isParentOf correctly identifies ancestry on a deserialized error", () => {
    const original = err_feature.fromId("validation_error", {
      field: "email",
      issue: "invalid format",
    });
    const wire = wireTransit(original.toJsonObject());
    const casted = castNiceError(wire);

    // All three ancestors should recognise this error
    expect(err_feature.isParentOf(casted)).toBe(true);
    expect(err_service.isParentOf(casted)).toBe(true);
    expect(err_app.isParentOf(casted)).toBe(true);

    // Exact match only for the leaf domain
    expect(err_feature.isExact(casted)).toBe(true);
    expect(err_service.isExact(casted)).toBe(false);
    expect(err_app.isExact(casted)).toBe(false);
  });
});

describe("castAndHydrate — one-call routing shortcut", () => {
  it("returns a fully usable error when domain matches", () => {
    const original = err_feature.fromId("not_found", { resource: "Invoice#5" });
    const wire = JSON.parse(JSON.stringify(original.toJsonObject()));

    const result = castAndHydrate(wire, err_feature);
    expect(err_feature.isExact(result)).toBe(true);
    if (err_feature.isExact(result) && result.hasId("not_found")) {
      expect(result.getContext("not_found").resource).toBe("Invoice#5");
    }
  });

  it("returns wasntNice error when the wrong domain is expected", () => {
    const original = err_service.fromId("unavailable");
    const wire = JSON.parse(JSON.stringify(original.toJsonObject()));

    // Caller expects err_feature but gets err_service
    const result = castAndHydrate(wire, err_feature);
    expect(err_feature.isExact(result)).toBe(false);
    // result is a plain NiceError with the deserialized data
    expect(result.def.domain).toBe("err_service");
  });
});
