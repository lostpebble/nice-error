/**
 * Integration: custom serialization lifecycle
 *
 * Covers the hydration state machine for context types that are not JSON-safe.
 * Uses a `Date`-containing context to force use of custom serializers.
 *
 * State transitions under test:
 *   (creation) → "hydrated"
 *   (toJsonObject) → "unhydrated"  [serialized form in JSON]
 *   (castNiceError) → still "unhydrated"
 *   (hydrate / castAndHydrate) → "hydrated" again with typed value reconstructed
 */

import { describe, expect, it } from "vitest";
import { castAndHydrate, castNiceError, defineNiceError, err } from "../../index";

// ---------------------------------------------------------------------------
// Domain setup — context contains a Date and a Set (non-JSON-safe)
// ---------------------------------------------------------------------------

type TJobError = {
  jobId: string;
  failedAt: Date;
  attemptedPaths: Set<string>;
};

const err_jobs = defineNiceError({
  domain: "err_jobs",
  schema: {
    job_failed: err<TJobError>({
      message: ({ jobId, failedAt }) =>
        `Job ${jobId} failed at ${failedAt.toISOString()}`,
      httpStatusCode: 500,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ jobId, failedAt, attemptedPaths }) => ({
            jobId,
            failedAt: failedAt.toISOString(),
            attemptedPaths: Array.from(attemptedPaths),
          }),
          fromJsonSerializable: ({ jobId, failedAt, attemptedPaths }) => ({
            jobId,
            failedAt: new Date(failedAt as string),
            attemptedPaths: new Set(attemptedPaths as string[]),
          }),
        },
      },
    }),
    job_timeout: err<{ jobId: string; timeoutMs: number }>({
      message: ({ jobId, timeoutMs }) => `Job ${jobId} timed out after ${timeoutMs}ms`,
      httpStatusCode: 504,
      context: { required: true },
    }),
  },
} as const);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function wireTransit(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const JOB_DATE = new Date("2024-06-15T12:00:00.000Z");
const JOB_PATHS = new Set(["/tmp/work", "/var/cache"]);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("custom serialization — hydrated state at creation", () => {
  it("message uses the typed context immediately after creation", () => {
    const error = err_jobs.fromId("job_failed", {
      jobId: "job-001",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    expect(error.message).toBe("Job job-001 failed at 2024-06-15T12:00:00.000Z");
  });

  it("getContext returns the original typed value before serialization", () => {
    const error = err_jobs.fromId("job_failed", {
      jobId: "job-001",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const ctx = error.getContext("job_failed");
    expect(ctx.failedAt).toBeInstanceOf(Date);
    expect(ctx.failedAt.toISOString()).toBe("2024-06-15T12:00:00.000Z");
    expect(ctx.attemptedPaths).toBeInstanceOf(Set);
    expect(ctx.attemptedPaths.has("/tmp/work")).toBe(true);
  });
});

describe("custom serialization — unhydrated state after wire transit", () => {
  it("context state is 'unhydrated' after castNiceError on wire payload", () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "job-002",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    if (err_jobs.is(casted) && casted.hasId("job_failed")) {
      const data = casted.getErrorDataForId("job_failed");
      expect(data?.contextState.kind).toBe("unhydrated");
    }
  });

  it("getContext throws on unhydrated context — must call hydrate() first", () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "job-003",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    if (err_jobs.is(casted) && casted.hasId("job_failed")) {
      expect(() => casted.getContext("job_failed")).toThrow("unhydrated");
    }
  });

  it("message and httpStatusCode survive wire transit without hydration", () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "job-004",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    // These come from the top-level JSON fields — no hydration required
    expect(casted.message).toBe("Job job-004 failed at 2024-06-15T12:00:00.000Z");
    expect(casted.httpStatusCode).toBe(500);
  });
});

describe("custom serialization — re-hydrated after explicit hydrate()", () => {
  it("hydrate() reconstructs the typed Date and Set from the serialized form", () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "job-005",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    if (!err_jobs.is(casted)) throw new Error("domain mismatch");

    const hydrated = err_jobs.hydrate(casted);
    const ctx = hydrated.getContext("job_failed");

    expect(ctx.failedAt).toBeInstanceOf(Date);
    expect(ctx.failedAt.toISOString()).toBe("2024-06-15T12:00:00.000Z");
    expect(ctx.attemptedPaths).toBeInstanceOf(Set);
    expect([...ctx.attemptedPaths].sort()).toEqual(["/tmp/work", "/var/cache"].sort());
  });

  it("castAndHydrate reconstructs typed context in a single call", () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "job-006",
      failedAt: JOB_DATE,
      attemptedPaths: JOB_PATHS,
    });
    const wire = wireTransit(serverErr.toJsonObject());

    const result = castAndHydrate(wire, err_jobs);
    expect(err_jobs.is(result)).toBe(true);

    if (err_jobs.is(result) && result.hasId("job_failed")) {
      const ctx = result.getContext("job_failed");
      expect(ctx.jobId).toBe("job-006");
      expect(ctx.failedAt).toBeInstanceOf(Date);
    }
  });

  it("mixed error: one id with custom serializer, one without — both survive transit", () => {
    const serverErr = err_jobs
      .fromId("job_failed", {
        jobId: "job-007",
        failedAt: JOB_DATE,
        attemptedPaths: JOB_PATHS,
      })
      .addId("job_timeout", { jobId: "job-007", timeoutMs: 30000 });

    const wire = wireTransit(serverErr.toJsonObject());
    const casted = castNiceError(wire);

    if (!err_jobs.is(casted)) throw new Error("domain mismatch");

    // job_timeout has no custom serializer — context accessible without hydration
    if (casted.hasId("job_timeout")) {
      expect(casted.getContext("job_timeout")).toEqual({ jobId: "job-007", timeoutMs: 30000 });
    }

    // job_failed has custom serializer — must hydrate first
    const hydrated = err_jobs.hydrate(casted);
    if (hydrated.hasId("job_failed")) {
      const ctx = hydrated.getContext("job_failed");
      expect(ctx.failedAt).toBeInstanceOf(Date);
    }
  });

  it("hydrate() throws when the domain does not match", () => {
    const err_other = defineNiceError({
      domain: "err_other",
      schema: { oops: err({ message: "oops" }) },
    } as const);
    const wrongDomainErr = err_other.fromId("oops");

    expect(() => err_jobs.hydrate(wrongDomainErr as any)).toThrow("Domain mismatch");
  });
});
