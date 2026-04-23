/**
 * Tests for matchTag-based dispatch and the fallback-to-default-handler behaviour.
 *
 * Key invariant: a domain's own registered default handler always takes priority over
 * an matchTag that is not registered on that domain. This lets child-domain-specific
 * handlers win over parent-level matchTag handlers that were never registered here.
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUserDomain = () =>
  createActionRootDomain({
    domain: "user_domain_root",
  }).createChildDomain({
    domain: "user",
    actions: {
      getUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .output({ schema: v.object({ id: v.string(), source: v.string() }) }),
      deleteUser: action().input({ schema: v.object({ userId: v.string() }) }),
    },
  });

// ── 1. matchTag-specific handler still wins when registered ─────────────────────

describe("matchTag dispatch — named handler is used when registered", () => {
  it("execute with matchTag routes to the matchTag-keyed handler", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "remote" }),
      }),
      { matchTag: "remote" },
    );

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
      }),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "remote" });
  });

  it("execute without matchTag routes to the default handler", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "remote" }),
      }),
      { matchTag: "remote" },
    );

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
      }),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" });
    expect(result).toEqual({ id: "u1", source: "local" });
  });
});

// ── 2. Default handler wins when matchTag is not registered on this domain ───────

describe("matchTag dispatch — doesn't fall back to default handler when matchTag absent", () => {
  it("default handler is used when matchTag is not registered", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler({ matchTag: "remote" }).forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
      }),
    );

    // "remote" is never registered on domain — should fall back to default
    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "local" });
  });

  it("default handler with forAction() is not used when matchTag is not registered", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) =>
          primed.setResponse({ id: primed.input.userId, source: "default-handler" }),
      }),
    );

    const result = await domain.action("getUser").executeSafe({ userId: "u1" }, "unknownEnv");
    expect(result).toEqual({ id: "u1", source: "default-handler" });
  });

  it("matchTag-keyed handler wins over default handler", async () => {
    const domain = makeUserDomain();

    // matchTag-keyed handler
    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) =>
          primed.setResponse({ id: primed.input.userId, source: "env-handler" }),
      }),
      { matchTag: "solver" },
    );

    // default handler (would also match)
    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) =>
          primed.setResponse({ id: primed.input.userId, source: "default-req" }),
      }),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "solver");
    expect(result).toEqual({ id: "u1", source: "env-handler" });
  });
});

// ── 3. Throws when no handler is found at all ────────────────────────────────

describe("matchTag dispatch — error when no handler found", () => {
  it("throws action_environment_not_found when matchTag given and no handler at all", async () => {
    const domain = makeUserDomain();

    await expect(domain.action("getUser").execute({ userId: "u1" }, "ghost")).rejects.toThrow(
      /environment id "ghost"/i,
    );
  });

  it("throws domain_no_handler when no matchTag given and no handler registered", async () => {
    const domain = makeUserDomain();

    await expect(domain.action("getUser").execute({ userId: "u1" })).rejects.toThrow(
      /no action handler/i,
    );
  });
});

// ── 4. Child domain handler wins over unregistered matchTag ─────────────────────

describe("child domain — own handler takes priority", () => {
  it("child default handler is used when the matchTag is only registered on the parent", async () => {
    const root = createActionRootDomain({ domain: "root" });

    const child = root.createChildDomain({
      domain: "child",
      actions: {
        pong: action()
          .input({ schema: v.object({ v: v.string() }) })
          .output({ schema: v.object({ result: v.string() }) }),
      },
    });

    // Child has only a default handler — "remote" is not registered on child
    child.setHandler(
      new ActionHandler().forAction(child, "pong", {
        execution: (primed) => primed.setResponse({ result: `child:${primed.input.v}` }),
      }),
    );

    // Child dispatch with "remote" matchTag — child's default handler should win
    const result = await child.action("pong").execute({ v: "hello" }, "remote");
    expect(result).toEqual({ result: "child:hello" });
  });

  it("child matchTag handler wins when both child default and child matchTag are registered", async () => {
    const root = createActionRootDomain({ domain: "root" });

    const child = root.createChildDomain({
      domain: "child",
      actions: {
        pong: action()
          .input({ schema: v.object({ v: v.string() }) })
          .output({ schema: v.object({ result: v.string() }) }),
      },
    });

    // child has BOTH a "remote" matchTag handler AND a default handler
    child.setHandler(
      new ActionHandler().forAction(child, "pong", {
        execution: (primed) => primed.setResponse({ result: `remote:${primed.input.v}` }),
      }),
      { matchTag: "remote" },
    );

    child.setHandler(
      new ActionHandler().forAction(child, "pong", {
        execution: (primed) => primed.setResponse({ result: `local:${primed.input.v}` }),
      }),
    );

    const remoteResult = await child.action("pong").execute({ v: "x" }, "remote");
    const localResult = await child.action("pong").execute({ v: "x" });

    expect(remoteResult).toEqual({ result: "remote:x" });
    expect(localResult).toEqual({ result: "local:x" });
  });
});

// ── 5. Listeners fire on fallback path ───────────────────────────────────────

describe("matchTag fallback — action listeners still fire", () => {
  it("listener is called when default handler is reached via matchTag fallback", async () => {
    const domain = makeUserDomain();
    const listenerCalls = vi.fn();

    domain.addActionListener({ execution: (act) => listenerCalls(act.id) });

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
      }),
    );

    await domain.action("getUser").execute({ userId: "u1" }, "unregistered-env");

    expect(listenerCalls).toHaveBeenCalledWith("getUser");
  });
});
