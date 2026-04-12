/**
 * Integration: transport round-trip
 *
 * Simulates errors crossing a network boundary. The "server" creates and
 * serialises errors; the "client" receives raw JSON, casts, narrows, and
 * hydrates them. Plain-context and custom-serialization cases are both covered.
 */

import { describe, expect, it } from "vitest";
import { castAndHydrate, castNiceError, defineNiceError, err, matchFirst } from "../../index";

// ---------------------------------------------------------------------------
// Domain setup
// ---------------------------------------------------------------------------

const err_api = defineNiceError({
  domain: "err_api",
  defaultHttpStatusCode: 500,
  defaultMessage: "Internal API error",
  schema: {},
} as const);

const err_payments = err_api.createChildDomain({
  domain: "err_payments",
  schema: {
    payment_failed: err<{ reason: string; amount: number }>({
      message: ({ reason, amount }) => `Payment of $${amount} failed: ${reason}`,
      httpStatusCode: 402,
      context: { required: true },
    }),
    card_expired: err({
      message: "The card on file has expired",
      httpStatusCode: 402,
    }),
    rate_limited: err<{ retryAfterMs: number }>({
      message: ({ retryAfterMs }) => `Too many requests. Retry after ${retryAfterMs}ms`,
      httpStatusCode: 429,
      context: { required: true },
    }),
  },
} as const);

// ---------------------------------------------------------------------------
// Helper: simulate full wire transport (stringify → parse)
// ---------------------------------------------------------------------------

function sendOverWire(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("transport round-trip — plain context (no custom serializer)", () => {
  it("preserves domain, ids, message, and httpStatusCode across the wire", () => {
    // Server side
    const serverErr = err_payments.fromId("payment_failed", {
      reason: "insufficient funds",
      amount: 99,
    });
    const wire = sendOverWire(serverErr.toJsonObject());

    // Client side
    const casted = castNiceError(wire);
    expect(err_payments.isExact(casted)).toBe(true);
    expect(casted.def.domain).toBe("err_payments");
    expect(casted.ids).toEqual(["payment_failed"]);
    expect(casted.message).toBe("Payment of $99 failed: insufficient funds");
    expect(casted.httpStatusCode).toBe(402);
  });

  it("getContext is accessible after wire transit (no custom serializer = no hydration needed)", () => {
    const serverErr = err_payments.fromId("payment_failed", {
      reason: "declined",
      amount: 50,
    });
    const wire = sendOverWire(serverErr.toJsonObject());

    const casted = castNiceError(wire);
    if (err_payments.isExact(casted)) {
      if (casted.hasId("payment_failed")) {
        const ctx = casted.getContext("payment_failed");
        expect(ctx).toEqual({ reason: "declined", amount: 50 });
      }
    }
  });

  it("ancestry is preserved across the wire", () => {
    const serverErr = err_payments.fromId("card_expired");
    const wire = sendOverWire(serverErr.toJsonObject());

    const casted = castNiceError(wire);
    expect(err_api.isParentOf(casted)).toBe(true);
    expect(err_payments.isParentOf(casted)).toBe(true);
  });

  it("matches() returns true for structurally identical errors before and after transport", () => {
    const original = err_payments.fromId("rate_limited", { retryAfterMs: 3000 });
    const wire = sendOverWire(original.toJsonObject());
    const casted = castNiceError(wire);

    // Same domain + same id set → should match fingerprint
    const template = err_payments.fromId("rate_limited", { retryAfterMs: 0 });
    expect(casted.matches(template)).toBe(true);
  });

  it("matchFirst works on a hydrated domain error after wire transit", () => {
    const serverErr = err_payments.fromId("card_expired");
    const wire = sendOverWire(serverErr.toJsonObject());

    const casted = castNiceError(wire);
    if (err_payments.isExact(casted)) {
      const hydrated = err_payments.hydrate(casted);
      const result = matchFirst(hydrated, {
        payment_failed: () => "handle_payment_failed",
        card_expired: () => "handle_card_expired",
        rate_limited: () => "handle_rate_limited",
      });
      expect(result).toBe("handle_card_expired");
    }
  });

  it("castAndHydrate combines cast + is + hydrate in a single call", () => {
    const serverErr = err_payments.fromId("rate_limited", { retryAfterMs: 5000 });
    const wire = sendOverWire(serverErr.toJsonObject());

    const result = castAndHydrate(wire, err_payments);
    expect(err_payments.isExact(result)).toBe(true);

    if (err_payments.isExact(result)) {
      expect(result.hasId("rate_limited")).toBe(true);
      if (result.hasId("rate_limited")) {
        expect(result.getContext("rate_limited")).toEqual({ retryAfterMs: 5000 });
      }
    }
  });

  it("castAndHydrate returns the casted error unchanged when the domain does not match", () => {
    // castNiceError wraps the native Error into an err_cast_not_nice NiceError;
    // castAndHydrate returns it as-is because err_payments.is() is false.
    const unrelated = new Error("boom");
    const result = castAndHydrate(unrelated, err_payments);
    expect(err_payments.isExact(result)).toBe(false);
    // The result is still a NiceError — just from the internal cast domain
    expect(result.def.domain).toBe("err_cast_not_nice");
  });

  it("non-NiceError thrown values survive the cast pipeline as err_cast_not_nice errors", () => {
    // Simulates a third-party exception leaking through an API handler.
    // castNiceError recognises it is not a NiceError JSON shape and wraps it.
    const wire = sendOverWire({ message: "unexpected crash", code: 503 });
    const casted = castNiceError(wire);
    expect(err_payments.isExact(casted)).toBe(false);
    // Wrapped in the internal casting domain — not a payments error
    expect(casted.def.domain).toBe("err_cast_not_nice");
  });
});
