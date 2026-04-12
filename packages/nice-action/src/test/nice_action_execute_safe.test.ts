/**
 * Tests for NiceAction.executeSafe and NiceActionPrimed.executeSafe.
 *
 * executeSafe wraps execute in a try/catch and returns a NiceActionResult
 * discriminated union: { ok: true; value } | { ok: false; error }.
 * The error type is the union derived from .throws() declarations on the schema.
 */
import { defineNiceError, err, forDomain, forIds } from "@nice-error/core";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";
import { NiceActionPrimed } from "../NiceAction/NiceActionPrimed";

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

const err_validation = defineNiceError({
  domain: "err_validation",
  schema: {
    invalid_input: err<{ field: string }>({
      message: ({ field }) => `Invalid value for field: ${field}`,
      httpStatusCode: 422,
      context: { required: true },
    }),
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
        .throws(err_user, ["not_found", "forbidden"] as const)
        .throws(err_validation),

      deleteUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .throws(err_user),
    },
  });

// ---------------------------------------------------------------------------
// 1. Success path — ok: true
// ---------------------------------------------------------------------------

describe("NiceAction.executeSafe — success", () => {
  it("returns { ok: true, value } when handler succeeds", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Alice",
    }));

    const result = await dom.action("getUser").executeSafe({ userId: "u1" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: "u1", name: "Alice" });
    }
  });

  it("value is undefined when handler returns nothing (void action)", async () => {
    const dom = createActionDomain({
      domain: "void_dom",
      schema: { ping: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    dom.setActionHandler().forDomain(dom, () => {});

    const result = await dom.action("ping").executeSafe({ x: 1 });

    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Failure path — ok: false
// ---------------------------------------------------------------------------

describe("NiceAction.executeSafe — failure", () => {
  it("returns { ok: false, error } when handler throws a NiceError", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_user.fromId("not_found");
    });

    const result = await dom.action("getUser").executeSafe({ userId: "missing" });

    expect(result.ok).toBe(false);
    // Narrow with isExact before accessing domain-specific ids
    if (!result.ok && err_user.isExact(result.error)) {
      expect(result.error.hasId("not_found")).toBe(true);
    } else {
      expect.fail("expected err_user.not_found");
    }
  });

  it("returns { ok: false, error } when handler throws a NiceError with context", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_validation.fromId("invalid_input", { field: "userId" });
    });

    const result = await dom.action("getUser").executeSafe({ userId: "" });

    expect(result.ok).toBe(false);
    if (!result.ok && err_validation.isExact(result.error)) {
      expect(result.error.hasId("invalid_input")).toBe(true);
    } else {
      expect.fail("expected err_validation.invalid_input");
    }
  });

  it("returns { ok: false, error } for non-NiceError throws", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw new Error("unexpected failure");
    });

    const result = await dom.action("getUser").executeSafe({ userId: "u1" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. error.handleWith integration
// ---------------------------------------------------------------------------

describe("NiceAction.executeSafe — handleWith integration", () => {
  it("error from result can be routed with forDomain", async () => {
    const dom = makeUserDomain();
    const handled: string[] = [];

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_user.fromId("forbidden");
    });

    const result = await dom.action("getUser").executeSafe({ userId: "u2" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWith([
        forDomain(err_user, (h) => {
          handled.push(h.getIds().join(","));
        }),
      ]);
    }

    expect(handled).toEqual(["forbidden"]);
  });

  it("error from result can be routed with forIds", async () => {
    const dom = makeUserDomain();
    const handled: string[] = [];

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_user.fromId("not_found");
    });

    const result = await dom.action("getUser").executeSafe({ userId: "u3" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const wasHandled = result.error.handleWith([
        forIds(err_user, ["not_found"], (h) => {
          handled.push("not_found");
          expect(h.hasId("not_found")).toBe(true);
        }),
      ]);
      expect(wasHandled).toBe(true);
    }

    expect(handled).toEqual(["not_found"]);
  });

  it("unmatched forIds falls through to forDomain", async () => {
    const dom = makeUserDomain();
    const handled: string[] = [];

    dom.setActionHandler().forActionId(dom, "deleteUser", () => {
      throw err_user.fromId("forbidden");
    });

    const result = await dom.action("deleteUser").executeSafe({ userId: "u4" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      result.error.handleWith([
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
});

// ---------------------------------------------------------------------------
// 4. NiceActionPrimed.executeSafe
// ---------------------------------------------------------------------------

describe("NiceActionPrimed.executeSafe", () => {
  it("returns { ok: true, value } on success", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", (act) => ({
      id: act.input.userId,
      name: "Bob",
    }));

    const primed = new NiceActionPrimed(dom.action("getUser"), { userId: "u5" });
    const result = await primed.executeSafe();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ id: "u5", name: "Bob" });
    }
  });

  it("returns { ok: false, error } on failure", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_user.fromId("not_found");
    });

    const primed = new NiceActionPrimed(dom.action("getUser"), { userId: "u6" });
    const result = await primed.executeSafe();

    expect(result.ok).toBe(false);
    if (!result.ok && err_user.isExact(result.error)) {
      expect(result.error.hasId("not_found")).toBe(true);
    } else {
      expect.fail("expected err_user.not_found");
    }
  });

  it("hydrated primed action can use executeSafe after round-trip", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", () => {
      throw err_user.fromId("forbidden");
    });

    const wire = new NiceActionPrimed(dom.action("getUser"), { userId: "u7" }).toJsonObject();
    const hydrated = dom.hydrateAction(wire);

    const result = await hydrated.executeSafe();

    // hydrateAction returns a loosely-typed primed action; use handleWith to assert
    expect(result.ok).toBe(false);
    if (!result.ok) {
      let matched = false;
      result.error.handleWith([
        forDomain(err_user, (h) => {
          matched = h.hasId("forbidden");
        }),
      ]);
      expect(matched).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Async handler
// ---------------------------------------------------------------------------

describe("NiceAction.executeSafe — async handler", () => {
  it("handles a thrown error from an async handler", async () => {
    const dom = makeUserDomain();

    dom.setActionHandler().forActionId(dom, "getUser", async () => {
      await Promise.resolve();
      throw err_user.fromId("not_found");
    });

    const result = await dom.action("getUser").executeSafe({ userId: "u8" });

    expect(result.ok).toBe(false);
    if (!result.ok && err_user.isExact(result.error)) {
      expect(result.error.hasId("not_found")).toBe(true);
    } else {
      expect.fail("expected err_user.not_found");
    }
  });
});
