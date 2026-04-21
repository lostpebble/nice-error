/**
 * Tests for envId-based dispatch and the fallback-to-default-handler behaviour.
 *
 * Key invariant: a domain's own registered default handler always takes priority over
 * an envId that is not registered on that domain. This lets child-domain-specific
 * handlers win over parent-level envId handlers that were never registered here.
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUserDomain = () =>
  createActionRootDomain({
    domain: "user",
    actions: {
      getUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .output({ schema: v.object({ id: v.string(), source: v.string() }) }),
      deleteUser: action().input({ schema: v.object({ userId: v.string() }) }),
    },
  });

// ── 1. envId-specific handler still wins when registered ─────────────────────

describe("envId dispatch — named handler is used when registered", () => {
  it("execute with envId routes to the envId-keyed handler", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "remote",
      })),
      { envId: "remote" },
    );

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "local",
      })),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "remote" });
  });

  it("execute without envId routes to the default handler", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "remote",
      })),
      { envId: "remote" },
    );

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "local",
      })),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" });
    expect(result).toEqual({ id: "u1", source: "local" });
  });
});

// ── 2. Default handler wins when envId is not registered on this domain ───────

describe("envId dispatch — falls back to default handler when envId absent", () => {
  it("default handler is used when envId is not registered", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "local",
      })),
    );

    // "remote" is never registered on domain — should fall back to default
    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "local" });
  });

  it("default handler with resolve() is used when envId is not registered", async () => {
    const domain = makeUserDomain();

    domain.setHandler(
      new ActionHandler().resolve(domain, "getUser", (input) => ({
        id: input.userId,
        source: "default-resolver",
      })),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "unknownEnv");
    expect(result).toEqual({ id: "u1", source: "default-resolver" });
  });

  it("envId-keyed handler wins over default handler", async () => {
    const domain = makeUserDomain();

    // envId-keyed handler
    domain.setHandler(
      new ActionHandler().resolve(domain, "getUser", (input) => ({
        id: input.userId,
        source: "env-resolver",
      })),
      { envId: "solver" },
    );

    // default handler (would also match)
    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "default-req",
      })),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "solver");
    expect(result).toEqual({ id: "u1", source: "env-resolver" });
  });
});

// ── 3. Throws when no handler is found at all ────────────────────────────────

describe("envId dispatch — error when no handler found", () => {
  it("throws action_environment_not_found when envId given and no handler at all", async () => {
    const domain = makeUserDomain();

    await expect(domain.action("getUser").execute({ userId: "u1" }, "ghost")).rejects.toThrow(
      /environment id "ghost"/i,
    );
  });

  it("throws domain_no_handler when no envId given and no handler registered", async () => {
    const domain = makeUserDomain();

    await expect(domain.action("getUser").execute({ userId: "u1" })).rejects.toThrow(
      /no action handler/i,
    );
  });
});

// ── 4. Child domain handler wins over unregistered envId ─────────────────────

describe("child domain — own handler takes priority", () => {
  it("child default handler is used when the envId is only registered on the parent", async () => {
    const root = createActionRootDomain({
      domain: "root",
      actions: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = root.createChildDomain({
      domain: "child",
      actions: {
        pong: action()
          .input({ schema: v.object({ v: v.string() }) })
          .output({ schema: v.object({ result: v.string() }) }),
      },
    });

    // "remote" envId is registered on root but NOT on child
    root.setHandler(
      new ActionHandler().forDomain(root, () => ({ result: "from-root-remote" })),
      {
        envId: "remote",
      },
    );

    // Child has only a default handler
    child.setHandler(
      new ActionHandler().forAction(child, "pong", (act) => ({ result: `child:${act.input.v}` })),
    );

    // Child dispatch with "remote" envId — child's default handler should win
    const result = await child.action("pong").execute({ v: "hello" }, "remote");
    expect(result).toEqual({ result: "child:hello" });
  });

  it("child envId handler wins when both child default and child envId are registered", async () => {
    const root = createActionRootDomain({
      domain: "root",
      actions: { ping: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const child = root.createChildDomain({
      domain: "child",
      actions: {
        pong: action()
          .input({ schema: v.object({ v: v.string() }) })
          .output({ schema: v.object({ result: v.string() }) }),
      },
    });

    // child has BOTH a "remote" envId handler AND a default handler
    child.setHandler(
      new ActionHandler().forAction(child, "pong", (act) => ({ result: `remote:${act.input.v}` })),
      { envId: "remote" },
    );

    child.setHandler(
      new ActionHandler().forAction(child, "pong", (act) => ({ result: `local:${act.input.v}` })),
    );

    const remoteResult = await child.action("pong").execute({ v: "x" }, "remote");
    const localResult = await child.action("pong").execute({ v: "x" });

    expect(remoteResult).toEqual({ result: "remote:x" });
    expect(localResult).toEqual({ result: "local:x" });
  });
});

// ── 5. Listeners fire on fallback path ───────────────────────────────────────

describe("envId fallback — action listeners still fire", () => {
  it("listener is called when default handler is reached via envId fallback", async () => {
    const domain = makeUserDomain();
    const listenerCalls = vi.fn();

    domain.addActionListener((act) => listenerCalls(act.id));

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "local",
      })),
    );

    await domain.action("getUser").execute({ userId: "u1" }, "unregistered-env");

    expect(listenerCalls).toHaveBeenCalledWith("getUser");
  });
});
