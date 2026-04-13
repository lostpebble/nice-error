/**
 * Tests for NiceActionResponse and NiceAction.executeToResponse.
 *
 * NiceActionResponse is the transport container for cross-boundary RPC:
 * - Carries the original primed action (domain + actionId + input)
 * - Carries the result: { ok: true; output } | { ok: false; error }
 * - Serializes to ISerializedNiceActionResponse via toJsonObject()
 * - Reconstructed via domain.hydrateResponse(wire)
 */
import { castNiceError, defineNiceError, err, forDomain, forIds } from "@nice-error/core";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import { action } from "../ActionSchema/action";
import type { TNiceActionResponse_JsonObject } from "../NiceAction/NiceAction.types";
import { NiceActionResponse } from "../NiceAction/NiceActionResponse";

// ---------------------------------------------------------------------------
// Shared error domains
// ---------------------------------------------------------------------------

const err_user = defineNiceError({
  domain: "err_user",
  schema: {
    not_found: err({ message: "User not found", httpStatusCode: 404 }),
    forbidden: err({ message: "Access denied", httpStatusCode: 403 }),
  },
});

// ---------------------------------------------------------------------------
// Shared domain factory
// ---------------------------------------------------------------------------

const makeUserDomain = () =>
  createActionDomain({
    domain: "user",
    schema: {
      getUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .output({ schema: v.object({ id: v.string(), name: v.string() }) })
        .throws(err_user),

      deleteUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .throws(err_user),
    },
  });

// ---------------------------------------------------------------------------
// Helper: simulate wire transport (stringify → parse)
// ---------------------------------------------------------------------------

function sendOverWire<T>(output: T): T {
  return JSON.parse(JSON.stringify(output)) as T;
}

// ---------------------------------------------------------------------------
// 1. executeToResponse — success path
// ---------------------------------------------------------------------------

describe("NiceAction.executeToResponse — success", () => {
  it("returns a NiceActionResponse with ok: true and the output value", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Alice",
    }));

    const response = await dom.action("getUser").executeToResponse({ userId: "u1" });

    expect(response).toBeInstanceOf(NiceActionResponse);
    expect(response.result.ok).toBe(true);
    if (response.result.ok) {
      expect(response.result.output).toEqual({ id: "u1", name: "Alice" });
    }
  });

  it("primed carries the original input", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Bob",
    }));

    const response = await dom.action("getUser").executeToResponse({ userId: "u2" });

    expect(response.primed.input).toEqual({ userId: "u2" });
    expect(response.primed.coreAction.id).toBe("getUser");
    expect(response.primed.domain).toBe("user");
  });
});

// ---------------------------------------------------------------------------
// 2. executeToResponse — failure path
// ---------------------------------------------------------------------------

describe("NiceAction.executeToResponse — failure", () => {
  it("returns a NiceActionResponse with ok: false when handler throws a NiceError", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", () => {
      throw err_user.fromId("not_found");
    });

    const response = await dom.action("getUser").executeToResponse({ userId: "missing" });

    expect(response.result.ok).toBe(false);
    if (!response.result.ok && err_user.isExact(response.result.error)) {
      expect(response.result.error.hasId("not_found")).toBe(true);
    } else {
      expect.fail("expected err_user.not_found");
    }
  });

  it("captures non-NiceError throws as err_cast_not_nice", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", () => {
      throw new Error("unexpected failure");
    });

    const response = await dom.action("getUser").executeToResponse({ userId: "u3" });

    expect(response.result.ok).toBe(false);
    if (!response.result.ok) {
      expect(response.result.error).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. toJsonObject — serialization
// ---------------------------------------------------------------------------

describe("NiceActionResponse.toJsonObject — serialization", () => {
  it("serializes a success response to wire format", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Charlie",
    }));

    const response = await dom.action("getUser").executeToResponse({ userId: "u4" });
    const wire = response.toJsonObject();

    expect(wire.domain).toBe("user");
    expect(wire.id).toBe("getUser");
    expect(wire.input).toEqual({ userId: "u4" });
    expect(wire.ok).toBe(true);
    if (wire.ok) {
      expect(wire.output).toEqual({ id: "u4", name: "Charlie" });
    }
  });

  it("serializes a failure response with NiceError wire format", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", () => {
      throw err_user.fromId("forbidden");
    });

    const response = await dom.action("getUser").executeToResponse({ userId: "u5" });
    const wire = response.toJsonObject();

    expect(wire.domain).toBe("user");
    expect(wire.id).toBe("getUser");
    expect(wire.input).toEqual({ userId: "u5" });
    expect(wire.ok).toBe(false);
    if (!wire.ok) {
      expect(wire.error.name).toBe("NiceError");
      expect(wire.error.def.domain).toBe("err_user");
      expect(wire.error.ids).toEqual(["forbidden"]);
    }
  });

  it("wire format is fully JSON-serializable (survives stringify → parse)", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Dave",
    }));

    const response = await dom.action("getUser").executeToResponse({ userId: "u6" });
    const wire = sendOverWire(response.toJsonObject());

    expect(wire.ok).toBe(true);
    if (wire.ok) {
      expect(wire.output).toEqual({ id: "u6", name: "Dave" });
    }
  });
});

// ---------------------------------------------------------------------------
// 4. hydrateResponse — round-trip success
// ---------------------------------------------------------------------------

describe("NiceActionDomain.hydrateResponse — round-trip success", () => {
  it("hydrates a success response and result.output is accessible", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Eve",
    }));

    const wire = sendOverWire(
      (await dom.action("getUser").executeToResponse({ userId: "u7" })).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);

    expect(hydrated.result.ok).toBe(true);
    if (hydrated.result.ok) {
      expect(hydrated.result.output).toEqual({ id: "u7", name: "Eve" });
    }
    expect(hydrated.primed.input).toEqual({ userId: "u7" });
  });

  it("hydrates a failure response and error can be routed with handleWith", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", () => {
      throw err_user.fromId("not_found");
    });

    const wire = sendOverWire(
      (await dom.action("getUser").executeToResponse({ userId: "u8" })).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);

    expect(hydrated.result.ok).toBe(false);
    if (!hydrated.result.ok) {
      let matched = false;
      hydrated.result.error.handleWith([
        forDomain(err_user, (h) => {
          matched = h.hasId("not_found");
        }),
      ]);
      expect(matched).toBe(true);
    }
  });

  it("hydrates a failure response and error can be routed with forIds", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "deleteUser", () => {
      throw err_user.fromId("forbidden");
    });

    const wire = sendOverWire(
      (await dom.action("deleteUser").executeToResponse({ userId: "u9" })).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);
    const handled: string[] = [];

    expect(hydrated.result.ok).toBe(false);
    if (!hydrated.result.ok) {
      hydrated.result.error.handleWith([
        forIds(err_user, ["not_found"], () => {
          handled.push("not_found");
        }),
        forDomain(err_user, () => {
          handled.push("catchall");
        }),
      ]);
    }

    expect(handled).toEqual(["catchall"]);
  });

  it("hydrated response carries the original input from the wire", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "deleteUser", () => {});

    const wire = sendOverWire(
      (await dom.action("deleteUser").executeToResponse({ userId: "u10" })).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);

    expect(hydrated.primed.input).toEqual({ userId: "u10" });
    expect(hydrated.primed.coreAction.id).toBe("deleteUser");
  });
});

// ---------------------------------------------------------------------------
// 5. hydrateResponse — error cases
// ---------------------------------------------------------------------------

describe("NiceActionDomain.hydrateResponse — error cases", () => {
  it("throws hydration_domain_mismatch when domain does not match", async () => {
    const dom = makeUserDomain();
    const wire: TNiceActionResponse_JsonObject = {
      domain: "wrong_domain",
      allDomains: ["wrong_domain"],
      id: "getUser",
      input: { userId: "u11" },
      ok: true as const,
      output: { id: "u11", name: "X" },
    };

    expect(() => dom.hydrateResponse(wire)).toThrow();
  });

  it("throws hydration_action_id_not_found when actionId is unknown", async () => {
    const dom = makeUserDomain();
    const wire: TNiceActionResponse_JsonObject = {
      domain: "user",
      allDomains: ["user"],
      id: "nonExistentAction",
      input: {},
      ok: true as const,
      output: {},
    };

    expect(() => dom.hydrateResponse(wire)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Custom serialization — non-JSON-native input and output (Date)
// ---------------------------------------------------------------------------

/**
 * Domain with non-JSON-native input AND output.
 *
 * Input:  { requestedAt: Date }   →  wire: { requestedAtIso: string }
 * Output: { user: { id: string; name: string }; createdAt: Date }
 *         →  wire: { user: { id: string; name: string }; createdAtIso: string }
 */
const makeSerializedDomain = () =>
  createActionDomain({
    domain: "serde_dom",
    schema: {
      createUser: action()
        .input({
          schema: v.object({ requestedAt: v.date(), name: v.string() }),
          serialization: {
            serialize: ({ requestedAt, name }) => ({
              requestedAtIso: requestedAt.toISOString(),
              name,
            }),
            deserialize: (s: { requestedAtIso: string; name: string }) => ({
              requestedAt: new Date(s.requestedAtIso),
              name: s.name,
            }),
          },
        })
        .output({
          schema: v.object({
            user: v.object({ id: v.string(), name: v.string() }),
            createdAt: v.date(),
          }),
          serialization: {
            serialize: ({ user, createdAt }) => ({
              user,
              createdAtIso: createdAt.toISOString(),
            }),
            deserialize: (s: { user: { id: string; name: string }; createdAtIso: string }) => ({
              user: s.user,
              createdAt: new Date(s.createdAtIso),
            }),
          },
        })
        .throws(err_user),
    },
  });

describe("NiceActionResponse — custom input/output serialization", () => {
  it("result.output on executeToResponse carries the raw (non-serialized) output", async () => {
    const dom = makeSerializedDomain();
    const createdAt = new Date("2025-06-01T00:00:00.000Z");

    dom.setActionRequester().forDomain(dom, (act) => ({
      user: { id: "u1", name: act.input.name },
      createdAt,
    }));

    const requestedAt = new Date("2025-01-01T00:00:00.000Z");
    const response = await dom
      .action("createUser")
      .executeToResponse({ requestedAt, name: "Alice" });

    expect(response.result.ok).toBe(true);
    if (response.result.ok) {
      // Raw output — createdAt is a Date instance, not a string
      expect(response.result.output.createdAt).toBeInstanceOf(Date);
      expect(response.result.output.createdAt.toISOString()).toBe("2025-06-01T00:00:00.000Z");
      expect(response.result.output.user).toEqual({ id: "u1", name: "Alice" });
    }
  });

  it("primed.input carries the raw (non-serialized) input", async () => {
    const dom = makeSerializedDomain();

    dom.setActionRequester().forDomain(dom, (act) => ({
      user: { id: "u2", name: act.input.name },
      createdAt: new Date(),
    }));

    const requestedAt = new Date("2025-03-15T12:00:00.000Z");
    const response = await dom.action("createUser").executeToResponse({ requestedAt, name: "Bob" });

    // primed.input is the raw type — requestedAt is a Date
    expect(response.primed.input.requestedAt).toBeInstanceOf(Date);
    expect(response.primed.input.requestedAt.toISOString()).toBe("2025-03-15T12:00:00.000Z");
  });

  it("toJsonObject serializes input and output to JSON-native forms", async () => {
    const dom = makeSerializedDomain();
    const createdAt = new Date("2025-06-01T00:00:00.000Z");

    dom.setActionRequester().forDomain(dom, (act) => ({
      user: { id: "u3", name: act.input.name },
      createdAt,
    }));

    const requestedAt = new Date("2025-01-01T00:00:00.000Z");
    const wire = (
      await dom.action("createUser").executeToResponse({ requestedAt, name: "Charlie" })
    ).toJsonObject();

    // Input should be serialized
    expect(wire.input).toEqual({ requestedAtIso: "2025-01-01T00:00:00.000Z", name: "Charlie" });

    // Output should be serialized
    expect(wire.ok).toBe(true);
    if (wire.ok) {
      expect(wire.output).toEqual({
        user: { id: "u3", name: "Charlie" },
        createdAtIso: "2025-06-01T00:00:00.000Z",
      });
    }
  });

  it("wire format survives JSON stringify → parse (no Date instances on the wire)", async () => {
    const dom = makeSerializedDomain();
    const createdAt = new Date("2025-06-01T00:00:00.000Z");

    dom.setActionRequester().forDomain(dom, (act) => ({
      user: { id: "u4", name: act.input.name },
      createdAt,
    }));

    const requestedAt = new Date("2025-01-01T00:00:00.000Z");
    const wire = sendOverWire(
      (
        await dom.action("createUser").executeToResponse({ requestedAt, name: "Dave" })
      ).toJsonObject(),
    );

    // After JSON round-trip, values are plain strings — not Date instances
    expect(typeof (wire.input as any).requestedAtIso).toBe("string");
    expect(wire.ok).toBe(true);
    if (wire.ok) {
      expect(typeof (wire.output as any).createdAtIso).toBe("string");
    }
  });

  it("hydrateResponse deserializes input and output back to raw types", async () => {
    const dom = makeSerializedDomain();
    const createdAt = new Date("2025-06-01T00:00:00.000Z");

    dom.setActionRequester().forDomain(dom, (act) => ({
      user: { id: "u5", name: act.input.name },
      createdAt,
    }));

    const requestedAt = new Date("2025-01-01T00:00:00.000Z");
    const wire = sendOverWire(
      (
        await dom.action("createUser").executeToResponse({ requestedAt, name: "Eve" })
      ).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);

    // if (hydrated.primed.id === "createUser") {
    //   hydrated.primed.input.
    // }

    // Input deserialized: requestedAt is a Date again
    expect(hydrated.primed.input.requestedAt).toBeInstanceOf(Date);
    expect(hydrated.primed.input.requestedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");

    // Output deserialized: createdAt is a Date again
    expect(hydrated.result.ok).toBe(true);
    if (hydrated.result.ok) {
      expect(hydrated.result.output.createdAt).toBeInstanceOf(Date);
      expect(hydrated.result.output.createdAt.toISOString()).toBe("2025-06-01T00:00:00.000Z");
      expect(hydrated.result.output.user).toEqual({ id: "u5", name: "Eve" });
    }
  });

  it("hydrateResponse on a failure response — input is still deserialized", async () => {
    const dom = makeSerializedDomain();

    dom.setActionRequester().forDomain(dom, () => {
      throw err_user.fromId("not_found");
    });

    const requestedAt = new Date("2025-02-20T08:00:00.000Z");
    const wire = sendOverWire(
      (
        await dom.action("createUser").executeToResponse({ requestedAt, name: "Frank" })
      ).toJsonObject(),
    );

    const hydrated = dom.hydrateResponse(wire);

    // Input still deserialized even on failure
    expect(hydrated.primed.input.requestedAt).toBeInstanceOf(Date);
    expect(hydrated.primed.input.requestedAt.toISOString()).toBe("2025-02-20T08:00:00.000Z");

    expect(hydrated.result.ok).toBe(false);
    if (!hydrated.result.ok) {
      let matched = false;
      hydrated.result.error.handleWith([
        forDomain(err_user, (h) => {
          matched = h.hasId("not_found");
        }),
      ]);
      expect(matched).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. castNiceError integration on hydrated failure
// ---------------------------------------------------------------------------

describe("NiceActionResponse — castNiceError integration", () => {
  it("hydrated error from wire matches castNiceError shape", async () => {
    const dom = makeUserDomain();

    dom.setActionRequester().forActionId(dom, "getUser", () => {
      throw err_user.fromId("forbidden");
    });

    const wire = sendOverWire(
      (await dom.action("getUser").executeToResponse({ userId: "u12" })).toJsonObject(),
    );
    const hydrated = dom.hydrateResponse(wire);

    expect(hydrated.result.ok).toBe(false);
    if (!hydrated.result.ok) {
      // The error should be equivalent to casting the raw wire error directly
      const directCast = castNiceError(!wire.ok ? wire.error : undefined);
      expect(hydrated.result.error.def.domain).toBe(directCast.def.domain);
      expect(hydrated.result.error.ids).toEqual(directCast.ids);
    }
  });
});
