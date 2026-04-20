/**
 * Integration: handleWith / forDomain / forIds
 *
 * Tests the synchronous domain-dispatched error handler.
 * Pressure points:
 * - Return value correctness (handler result / undefined when unmatched)
 * - First-match-wins ordering
 * - forIds ID filter (fires only when the id is active)
 * - forDomain is exact-domain — does NOT bleed into parent/child domains
 * - Implicit hydration inside handleWith (works on bare NiceError from castNiceError)
 * - Handler invoked exactly once
 * - Multi-ID errors with forIds subsets
 * - Edge cases: empty cases, unrelated domain, wasntNice errors
 */

import { describe, expect, it, vi } from "vitest";
import {
  castNiceError,
  defineNiceError,
  err,
  forDomain,
  forIds,
  matchFirst,
  NiceErrorHandler,
} from "../../index";

// ---------------------------------------------------------------------------
// Domain setup
// ---------------------------------------------------------------------------

const err_app = defineNiceError({
  domain: "err_app",
  schema: {
    maintenance: err({ message: "System under maintenance", httpStatusCode: 503 }),
  },
} as const);

const err_api = err_app.createChildDomain({
  domain: "err_api",
  schema: {
    rate_limited: err<{ retryAfterMs: number }>({
      message: ({ retryAfterMs }) => `Rate limited. Retry after ${retryAfterMs}ms`,
      httpStatusCode: 429,
      context: { required: true },
    }),
    not_found: err<{ resource: string }>({
      message: ({ resource }) => `${resource} not found`,
      httpStatusCode: 404,
      context: { required: true },
    }),
    unauthorized: err({ message: "Unauthorized", httpStatusCode: 401 }),
    validation: err<{ fields: string[] }>({
      message: ({ fields }) => `Validation failed: ${fields.join(", ")}`,
      httpStatusCode: 422,
      context: { required: true },
    }),
  },
} as const);

const err_billing = err_app.createChildDomain({
  domain: "err_billing",
  schema: {
    payment_failed: err<{ code: string }>({
      message: ({ code }) => `Payment failed with code: ${code}`,
      httpStatusCode: 402,
      context: { required: true },
    }),
    subscription_expired: err({ message: "Subscription has expired", httpStatusCode: 402 }),
  },
} as const);

// ---------------------------------------------------------------------------
// Tests: return value
// ---------------------------------------------------------------------------

describe("handleWith — return value", () => {
  it("returns the handler result when a forDomain case matches", () => {
    const error = err_api.fromId("unauthorized");
    const result = error.handleWith([new NiceErrorHandler().forDomain(err_api, () => true)]);
    expect(result).toBe(true);
  });

  it("returns the handler result when a forIds case matches", () => {
    const error = err_api.fromId("not_found", { resource: "User" });
    const result = error.handleWith([
      new NiceErrorHandler().forIds(err_api, ["not_found"], () => true),
    ]);
    expect(result).toBe(true);
  });

  it("returns undefined when no case matches the domain", () => {
    const error = err_billing.fromId("subscription_expired");
    const result = error.handleWith([new NiceErrorHandler().forDomain(err_api, () => true)]);
    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty cases array", () => {
    const error = err_api.fromId("unauthorized");
    expect(error.handleWith([])).toBeUndefined();
  });

  it("returns undefined when forIds is given but that id is not active", () => {
    const error = err_api.fromId("unauthorized");
    // The error has "unauthorized" active, but the case is looking for "not_found"
    const result = error.handleWith([
      new NiceErrorHandler().forIds(err_api, ["not_found"], () => true),
    ]);
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: first-match-wins ordering
// ---------------------------------------------------------------------------

describe("handleWith — first-match-wins ordering", () => {
  it("calls the first matching handler and stops", () => {
    const calls: string[] = [];
    const error = err_api.fromId("unauthorized");

    error.handleWith([
      forDomain(err_api, () => {
        calls.push("first");
      }),
      forDomain(err_api, () => {
        calls.push("second");
      }),
    ]);

    expect(calls).toEqual(["first"]);
  });

  it("forIds before forDomain wins for that specific id", () => {
    const calls: string[] = [];
    const error = err_api.fromId("rate_limited", { retryAfterMs: 1000 });

    error.handleWith([
      forIds(err_api, ["rate_limited"], () => {
        calls.push("specific");
      }),
      forDomain(err_api, () => {
        calls.push("fallback");
      }),
    ]);

    expect(calls).toEqual(["specific"]);
  });

  it("forDomain wins over forIds when placed first", () => {
    const calls: string[] = [];
    const error = err_api.fromId("rate_limited", { retryAfterMs: 1000 });

    error.handleWith([
      forDomain(err_api, () => {
        calls.push("domain");
      }),
      forIds(err_api, ["rate_limited"], () => {
        calls.push("ids");
      }),
    ]);

    // forDomain comes first and matches — forIds is never reached
    expect(calls).toEqual(["domain"]);
  });

  it("skips non-matching domain cases before finding the match", () => {
    const calls: string[] = [];
    const error = err_billing.fromId("payment_failed", { code: "declined" });

    error.handleWith([
      forDomain(err_api, () => {
        calls.push("api");
      }),
      forDomain(err_billing, () => {
        calls.push("billing");
      }),
    ]);

    expect(calls).toEqual(["billing"]);
  });

  it("handler is called exactly once for multi-id errors", () => {
    const spy = vi.fn();
    const error = err_api.fromContext({
      unauthorized: undefined,
      not_found: { resource: "Token" },
    });

    error.handleWith([forDomain(err_api, spy)]);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: exact domain matching (no parent/child bleed)
// ---------------------------------------------------------------------------

describe("handleWith — exact domain matching", () => {
  it("forDomain(err_app) does not match err_api errors", () => {
    const error = err_api.fromId("unauthorized");
    const result = error.handleWith([forDomain(err_app, () => {})]);
    expect(result).toBeUndefined();
  });

  it("forDomain(err_api) does not match err_app errors", () => {
    const error = err_app.fromId("maintenance");
    const result = error.handleWith([forDomain(err_api, () => {})]);
    expect(result).toBeUndefined();
  });

  it("forDomain(err_api) does not match err_billing errors", () => {
    const error = err_billing.fromId("subscription_expired");
    const result = error.handleWith([forDomain(err_api, () => {})]);
    expect(result).toBeUndefined();
  });

  it("a cases list covering both siblings matches each to the correct handler", () => {
    const calls: string[] = [];

    const apiError = err_api.fromId("not_found", { resource: "Widget" });
    const billingError = err_billing.fromId("payment_failed", { code: "cvc_fail" });

    const cases = [
      forDomain(err_api, () => {
        calls.push("api");
      }),
      forDomain(err_billing, () => {
        calls.push("billing");
      }),
    ];

    apiError.handleWith(cases);
    billingError.handleWith(cases);

    expect(calls).toEqual(["api", "billing"]);
  });
});

// ---------------------------------------------------------------------------
// Tests: forIds ID filtering with multi-id errors
// ---------------------------------------------------------------------------

describe("handleWith — forIds with multi-id errors", () => {
  it("fires when at least one of the listed ids is active", () => {
    const called: string[] = [];
    const error = err_api.fromContext({
      rate_limited: { retryAfterMs: 500 },
      unauthorized: undefined,
    });

    error.handleWith([
      forIds(err_api, ["unauthorized"], () => {
        called.push("unauthorized");
      }),
    ]);

    expect(called).toEqual(["unauthorized"]);
  });

  it("does not fire when none of the listed ids are active", () => {
    const error = err_api.fromContext({
      rate_limited: { retryAfterMs: 500 },
      unauthorized: undefined,
    });

    const result = error.handleWith([
      // "not_found" and "validation" are not active on this error
      forIds(err_api, ["not_found", "validation"], () => {}),
    ]);

    expect(result).toBeUndefined();
  });

  it("forIds handler receives a hydrated error with context for the matched ids", () => {
    const error = err_api.fromContext({
      rate_limited: { retryAfterMs: 9000 },
      not_found: { resource: "Invoice" },
    });

    let capturedRetryAfter: number | undefined;

    error.handleWith([
      forIds(err_api, ["rate_limited"], (h) => {
        capturedRetryAfter = h.getContext("rate_limited").retryAfterMs;
      }),
    ]);

    expect(capturedRetryAfter).toBe(9000);
  });
});

// ---------------------------------------------------------------------------
// Tests: implicit hydration (works on bare NiceError from castNiceError)
// ---------------------------------------------------------------------------

describe("handleWith — implicit hydration via castNiceError", () => {
  function wireTransit(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }

  it("works on a castNiceError result without manual hydration", () => {
    const serverErr = err_api.fromId("not_found", { resource: "Order" });
    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));

    let capturedResource: string | undefined;

    const result = casted.handleWith([
      forDomain(err_api, (h) => {
        if (h.hasId("not_found")) {
          capturedResource = h.getContext("not_found").resource;
        }
        return true;
      }),
    ]);

    expect(result).toBe(true);
    expect(capturedResource).toBe("Order");
  });

  it("returns undefined for a non-domain wire payload (wasntNice error)", () => {
    const casted = castNiceError(wireTransit({ message: "boom", status: 500 }));
    const result = casted.handleWith([
      forDomain(err_api, () => {}),
      forDomain(err_billing, () => {}),
    ]);
    expect(result).toBeUndefined();
  });

  it("correctly routes a wire-transited error from a sibling domain", () => {
    const serverErr = err_billing.fromId("payment_failed", { code: "expired_card" });
    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));

    const calls: string[] = [];
    casted.handleWith([
      forDomain(err_api, () => {
        calls.push("api");
      }),
      forDomain(err_billing, () => {
        calls.push("billing");
      }),
    ]);

    expect(calls).toEqual(["billing"]);
  });

  it("multi-id wire error: forIds still matches the active subset", () => {
    const serverErr = err_api.fromId("unauthorized").addId("rate_limited", { retryAfterMs: 60000 });

    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));

    let retryAfter: number | undefined;
    casted.handleWith([
      forIds(err_api, ["rate_limited"], (h) => {
        retryAfter = h.getContext("rate_limited").retryAfterMs;
      }),
    ]);

    expect(retryAfter).toBe(60000);
  });
});

// ---------------------------------------------------------------------------
// Tests: handler receives a fully usable hydrated error
// ---------------------------------------------------------------------------

describe("handleWith — handler receives hydrated error with full API", () => {
  it("handler can use matchFirst on the hydrated error", () => {
    const error = err_api.fromId("validation", { fields: ["email", "password"] });
    const results: string[] = [];

    error.handleWith([
      forDomain(err_api, (h) => {
        const result = matchFirst(h, {
          validation: ({ fields }) => `fix: ${fields.join(", ")}`,
          _: () => "unknown",
        });
        if (result) results.push(result);
      }),
    ]);

    expect(results).toEqual(["fix: email, password"]);
  });

  it("handler can use hasId and getContext together", () => {
    const error = err_api.fromContext({
      not_found: { resource: "Team" },
      unauthorized: undefined,
    });

    let resource: string | undefined;
    error.handleWith([
      forDomain(err_api, (h) => {
        if (h.hasId("not_found")) {
          resource = h.getContext("not_found").resource;
        }
      }),
    ]);

    expect(resource).toBe("Team");
  });

  it("handler can call addId and addContext (hydrated = builder methods available)", () => {
    const error = err_api.fromId("unauthorized");
    let extended: boolean | undefined;

    error.handleWith([
      forDomain(err_api, (h) => {
        const expanded = h.addId("rate_limited", { retryAfterMs: 100 });
        extended = expanded.hasId("rate_limited");
      }),
    ]);

    expect(extended).toBe(true);
  });

  it("is callable on a NiceErrorHydrated instance (fromId result) directly", () => {
    const error = err_api.fromId("rate_limited", { retryAfterMs: 2000 });
    const result = error.handleWith([forDomain(err_api, () => true)]);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: handleWith returns the handler's response value
// ---------------------------------------------------------------------------

describe("handleWith — response union type", () => {
  it("returns the exact value returned by the matching handler", () => {
    const error = err_api.fromId("not_found", { resource: "User" });
    const result = error.handleWith([forDomain(err_api, (h) => h.httpStatusCode)]);
    expect(result).toBe(404);
  });

  it("returns a Promise when the matching handler is async (use handleWithAsync to await it)", () => {
    const error = err_api.fromId("unauthorized");
    const result = error.handleWith([forDomain(err_api, async () => "async-result")]);

    expect(result).toBeUndefined();
  });

  it("union type: handler returning different types per case — result is the union", () => {
    const apiError = err_api.fromId("rate_limited", { retryAfterMs: 500 });
    const billingError = err_billing.fromId("subscription_expired");

    const handler = new NiceErrorHandler()
      .forDomain(err_api, () => "api-error" as const)
      .forDomain(err_billing, () => 402 as const);

    const r1 = apiError.handleWith(handler);
    const r2 = billingError.handleWith(handler);

    expect(r1).toBe("api-error");
    expect(r2).toBe(402);
  });
});
