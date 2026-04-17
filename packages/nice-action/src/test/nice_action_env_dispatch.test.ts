/**
 * Tests for envId-based dispatch and the fallback-to-default-handler behaviour.
 *
 * Key invariant: a domain's own registered default handler always takes priority over
 * an envId that is not registered on that domain. This lets child-domain-specific
 * handlers win over parent-level envId handlers that were never registered here.
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionDomain } from "../ActionDomain/createActionDomain";
import { createDomainResolver } from "../ActionRequestResponse/ActionResponder/NiceActionResponder";
import { action } from "../ActionSchema/action";

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUserDomain = () =>
  createActionDomain({
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
  it("execute with envId routes to the envId-keyed requester", async () => {
    const domain = makeUserDomain();

    domain
      .setActionRequester(undefined, { envId: "remote" })
      .forActionId(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "remote",
      }));

    domain
      .setActionRequester()
      .forActionId(domain, "getUser", (act) => ({
        id: act.input.userId,
        source: "local",
      }));

    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "remote" });
  });

  it("execute without envId routes to the default requester", async () => {
    const domain = makeUserDomain();

    domain
      .setActionRequester(undefined, { envId: "remote" })
      .forActionId(domain, "getUser", (act) => ({ id: act.input.userId, source: "remote" }));

    domain
      .setActionRequester()
      .forActionId(domain, "getUser", (act) => ({ id: act.input.userId, source: "local" }));

    const result = await domain.action("getUser").execute({ userId: "u1" });
    expect(result).toEqual({ id: "u1", source: "local" });
  });
});

// ── 2. Default handler wins when envId is not registered on this domain ───────

describe("envId dispatch — falls back to default handler when envId absent", () => {
  it("default requester is used when envId is not registered", async () => {
    const domain = makeUserDomain();

    domain
      .setActionRequester()
      .forActionId(domain, "getUser", (act) => ({ id: act.input.userId, source: "local" }));

    // "remote" is never registered on domain — should fall back to default
    const result = await domain.action("getUser").execute({ userId: "u1" }, "remote");
    expect(result).toEqual({ id: "u1", source: "local" });
  });

  it("default responder is used when envId requester absent and no default requester", async () => {
    const domain = makeUserDomain();

    domain.registerResponder(
      createDomainResolver(domain).resolveAction("getUser", (input) => ({
        id: input.userId,
        source: "default-resolver",
      })),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, "unknownEnv");
    expect(result).toEqual({ id: "u1", source: "default-resolver" });
  });

  it("envId-keyed responder still wins over default requester", async () => {
    const domain = makeUserDomain();

    // envId-keyed responder
    domain.registerResponder(
      createDomainResolver(domain).resolveAction("getUser", (input) => ({
        id: input.userId,
        source: "env-resolver",
      })),
      { envId: "solver" },
    );

    // default requester (would also match)
    domain
      .setActionRequester()
      .forActionId(domain, "getUser", (act) => ({ id: act.input.userId, source: "default-req" }));

    const result = await domain.action("getUser").execute({ userId: "u1" }, "solver");
    expect(result).toEqual({ id: "u1", source: "env-resolver" });
  });
});

// ── 3. Throws when no handler is found at all ────────────────────────────────

describe("envId dispatch — error when no handler found", () => {
  it("throws action_environment_not_found when envId given and no handler at all", async () => {
    const domain = makeUserDomain();

    await expect(
      domain.action("getUser").execute({ userId: "u1" }, "ghost"),
    ).rejects.toThrow(/environment id "ghost"/i);
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
    const root = createActionDomain({
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
    root
      .setActionRequester(undefined, { envId: "remote" })
      .forDomain(root, () => ({ result: "from-root-remote" }));

    // Child has only a default handler
    child
      .setActionRequester()
      .forActionId(child, "pong", (act) => ({ result: `child:${act.input.v}` }));

    // Child dispatch with "remote" envId — child's default handler should win
    const result = await child.action("pong").execute({ v: "hello" }, "remote");
    expect(result).toEqual({ result: "child:hello" });
  });

  it("child envId handler wins when both child default and child envId are registered", async () => {
    const root = createActionDomain({
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
    child
      .setActionRequester(undefined, { envId: "remote" })
      .forActionId(child, "pong", (act) => ({ result: `remote:${act.input.v}` }));

    child
      .setActionRequester()
      .forActionId(child, "pong", (act) => ({ result: `local:${act.input.v}` }));

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

    domain
      .setActionRequester()
      .forActionId(domain, "getUser", (act) => ({ id: act.input.userId, source: "local" }));

    await domain.action("getUser").execute({ userId: "u1" }, "unregistered-env");

    expect(listenerCalls).toHaveBeenCalledWith("getUser");
  });
});
