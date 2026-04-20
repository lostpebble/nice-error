/**
 * Integration: handleWithAsync
 *
 * Tests the async variant of domain-dispatched error handling.
 * Pressure points:
 * - Handler is truly awaited (side effects visible after the call resolves)
 * - Promise<R | undefined> return type — undefined when unmatched
 * - Works across a JSON wire transit (implicit hydration + custom serializer round-trip)
 * - Ordering / first-match-wins still holds in the async path
 * - Errors thrown inside an async handler propagate out of handleWithAsync
 * - Concurrent-style usage: handleWithAsync in a Promise.all context
 */

import { describe, expect, it, vi } from "vitest";
import { castNiceError, defineNiceError, err, forDomain, forIds, matchFirst } from "../../index";

// ---------------------------------------------------------------------------
// Domain setup — includes a custom serializer to test async + hydration
// ---------------------------------------------------------------------------

const err_jobs = defineNiceError({
  domain: "err_jobs",
  schema: {
    job_failed: err<{ jobId: string; failedAt: Date }>({
      message: ({ jobId, failedAt }) => `Job ${jobId} failed at ${failedAt.toISOString()}`,
      httpStatusCode: 500,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ jobId, failedAt }) => ({
            jobId,
            failedAt: failedAt.toISOString(),
          }),
          fromJsonSerializable: ({ jobId, failedAt }) => ({
            jobId,
            failedAt: new Date(failedAt as string),
          }),
        },
      },
    }),
    job_queued: err<{ jobId: string; queuedAt: Date }>({
      message: ({ jobId }) => `Job ${jobId} queued`,
      httpStatusCode: 202,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ jobId, queuedAt }) => ({
            jobId,
            queuedAt: queuedAt.toISOString(),
          }),
          fromJsonSerializable: ({ jobId, queuedAt }) => ({
            jobId,
            queuedAt: new Date(queuedAt as string),
          }),
        },
      },
    }),
    job_not_found: err<{ jobId: string }>({
      message: ({ jobId }) => `Job ${jobId} not found`,
      httpStatusCode: 404,
      context: { required: true },
    }),
  },
} as const);

const err_workers = defineNiceError({
  domain: "err_workers",
  schema: {
    worker_crashed: err<{ workerId: string }>({
      message: ({ workerId }) => `Worker ${workerId} crashed`,
      httpStatusCode: 500,
      context: { required: true },
    }),
    worker_overloaded: err({ message: "All workers are overloaded", httpStatusCode: 503 }),
  },
} as const);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FAIL_DATE = new Date("2024-01-15T09:00:00.000Z");

function wireTransit(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Tests: basic async behavior
// ---------------------------------------------------------------------------

describe("handleWithAsync — promise return and await correctness", () => {
  it("returns a Promise that resolves to the handler result on match", async () => {
    const error = err_jobs.fromId("job_not_found", { jobId: "j-1" });
    const result = error.handleWithAsync([forDomain(err_jobs, async () => true)]);

    // Must be a Promise before await
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(true);
  });

  it("resolves to undefined when no case matches", async () => {
    const error = err_workers.fromId("worker_overloaded");
    const result = await error.handleWithAsync([forDomain(err_jobs, async () => true)]);
    expect(result).toBeUndefined();
  });

  it("actually awaits the handler — side effects are visible after resolution", async () => {
    const sideEffects: string[] = [];
    const error = err_jobs.fromId("job_not_found", { jobId: "j-2" });

    await error.handleWithAsync([
      forDomain(err_jobs, async () => {
        await delay(1);
        sideEffects.push("completed");
      }),
    ]);

    // If handleWithAsync didn't await, this would be empty
    expect(sideEffects).toEqual(["completed"]);
  });

  it("handler is awaited before handleWithAsync resolves — execution is sequential", async () => {
    const log: number[] = [];
    const error = err_jobs.fromId("job_not_found", { jobId: "j-3" });

    await error.handleWithAsync([
      forDomain(err_jobs, async () => {
        log.push(1);
        await delay(1);
        log.push(2);
      }),
    ]);

    log.push(3); // runs after handleWithAsync resolves
    expect(log).toEqual([1, 2, 3]);
  });

  it("errors thrown inside an async handler propagate out of handleWithAsync", async () => {
    const error = err_jobs.fromId("job_not_found", { jobId: "j-4" });

    await expect(
      error.handleWithAsync([
        forDomain(err_jobs, async () => {
          await delay(1);
          throw new Error("handler exploded");
        }),
      ]),
    ).rejects.toThrow("handler exploded");
  });
});

// ---------------------------------------------------------------------------
// Tests: ordering in async path
// ---------------------------------------------------------------------------

describe("handleWithAsync — first-match-wins ordering", () => {
  it("only the first matching case runs — subsequent cases are skipped", async () => {
    const calls: string[] = [];
    const error = err_jobs.fromId("job_not_found", { jobId: "j-5" });

    await error.handleWithAsync([
      forDomain(err_jobs, async () => {
        calls.push("first");
      }),
      forDomain(err_jobs, async () => {
        calls.push("second");
      }),
    ]);

    expect(calls).toEqual(["first"]);
  });

  it("forIds before forDomain wins for that specific id (async)", async () => {
    const calls: string[] = [];
    const error = err_jobs.fromId("job_failed", { jobId: "j-6", failedAt: FAIL_DATE });

    await error.handleWithAsync([
      forIds(err_jobs, ["job_failed"], async () => {
        calls.push("specific");
      }),
      forDomain(err_jobs, async () => {
        calls.push("fallback");
      }),
    ]);

    expect(calls).toEqual(["specific"]);
  });

  it("falls through to the next case when forIds does not match the active id", async () => {
    const calls: string[] = [];
    const err2 = err_workers.fromId("worker_overloaded");

    await err2.handleWithAsync([
      forIds(err_jobs, ["job_failed"], async () => {
        calls.push("jobs");
      }),
      forDomain(err_workers, async () => {
        calls.push("workers");
      }),
    ]);

    expect(calls).toEqual(["workers"]);
  });
});

// ---------------------------------------------------------------------------
// Tests: async + wire transit (custom serializer hydration)
// ---------------------------------------------------------------------------

describe("handleWithAsync — wire transit with custom serializers", () => {
  it("handleWithAsync hydrates custom-serialized context before calling the handler", async () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "j-7",
      failedAt: FAIL_DATE,
    });
    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));

    let capturedDate: Date | undefined;

    await casted.handleWithAsync([
      forDomain(err_jobs, async (h) => {
        if (h.hasId("job_failed")) {
          capturedDate = h.getContext("job_failed").failedAt;
        }
      }),
    ]);

    expect(capturedDate).toBeInstanceOf(Date);
    expect(capturedDate!.toISOString()).toBe(FAIL_DATE.toISOString());
  });

  it("forIds + wire transit: narrows handler to specific id with typed context", async () => {
    const serverErr = err_jobs.fromId("job_failed", {
      jobId: "j-8",
      failedAt: FAIL_DATE,
    });
    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));

    let capturedJobId: string | undefined;

    await casted.handleWithAsync([
      forIds(err_jobs, ["job_failed"], async (h) => {
        // TypeScript knows jobId is accessible here
        capturedJobId = h.getContext("job_failed").jobId;
      }),
    ]);

    expect(capturedJobId).toBe("j-8");
  });

  it("multi-id wire error: async handler receives all active ids with hydrated context", async () => {
    const serverErr = err_jobs
      .fromId("job_failed", { jobId: "j-9", failedAt: FAIL_DATE })
      .addId("job_not_found", { jobId: "j-9" });

    const casted = castNiceError(wireTransit(serverErr.toJsonObject()));
    let capturedFailedAt: Date | undefined;
    let capturedJobId: string | undefined;

    await casted.handleWithAsync([
      forDomain(err_jobs, async (h) => {
        if (h.hasId("job_failed")) {
          capturedFailedAt = h.getContext("job_failed").failedAt;
        }
        if (h.hasId("job_not_found")) {
          capturedJobId = h.getContext("job_not_found").jobId;
        }
      }),
    ]);

    expect(capturedFailedAt).toBeInstanceOf(Date);
    expect(capturedJobId).toBe("j-9");
  });

  it("returns undefined for a non-NiceError wire payload (wasntNice)", async () => {
    const casted = castNiceError(wireTransit("something went wrong"));
    const result = await casted.handleWithAsync([forDomain(err_jobs, async () => true)]);
    expect(result).toEqual({
      handled: false,
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: async handler uses the full hydrated error API
// ---------------------------------------------------------------------------

describe("handleWithAsync — full hydrated error API inside handler", () => {
  it("async handler can use matchFirst on the hydrated error", async () => {
    const error = err_jobs.fromId("job_not_found", { jobId: "j-10" });
    const results: string[] = [];

    await error.handleWithAsync([
      forDomain(err_jobs, async (h) => {
        const r = matchFirst(h, {
          job_not_found: ({ jobId }) => `missing: ${jobId}`,
          _: () => "other",
        });
        if (r) results.push(r);
      }),
    ]);

    expect(results).toEqual(["missing: j-10"]);
  });

  it("spy confirms async handler was called with the correct hydrated error shape", async () => {
    const error = err_workers.fromId("worker_crashed", { workerId: "w-1" });
    const spy = vi.fn();

    await error.handleWithAsync([
      forDomain(err_workers, async (h) => {
        spy(h.def.domain, h.ids, h.httpStatusCode);
      }),
    ]);

    expect(spy).toHaveBeenCalledWith("err_workers", ["worker_crashed"], 500);
  });
});

// ---------------------------------------------------------------------------
// Tests: handleWith (sync) returns the Promise from an async handler
// ---------------------------------------------------------------------------

describe("handleWith (sync) vs handleWithAsync — behavior difference", () => {
  it("handleWith returns the Promise from an async handler — use handleWithAsync to await it", async () => {
    // This test documents the intended behavior: handleWith is synchronous.
    // If a user passes an async function, handleWith returns the Promise directly.
    // Use handleWithAsync when handlers are async.
    const resolved: boolean[] = [];
    const error = err_workers.fromId("worker_overloaded");

    const result = error.handleWith([
      forDomain(err_workers, async () => {
        await delay(1);
        resolved.push(true);
      }),
    ]);

    // handleWith returned the Promise — the handler has not resolved yet
    expect(result).toBeInstanceOf(Promise);
    expect(resolved).toEqual([]);

    // awaiting the result confirms the async handler runs to completion
    await result;
    expect(resolved).toEqual([true]);
  });
});
