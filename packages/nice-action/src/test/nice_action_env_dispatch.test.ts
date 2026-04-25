/**
 * Tests for matchTag-based dispatch and the fallback-to-default-handler behaviour.
 *
 * Key invariant: a named-tag handler responds only when its tag is used; a default
 * handler responds when no tag is given. There is no fallback from an unknown tag to
 * the default handler — unknown tags throw action_tag_handler_not_found.
 */
import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { createActionRuntime } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../ActionSchema/action";

// ── helpers ──────────────────────────────────────────────────────────────────

const makeUserDomain = () => {
  const root = createActionRootDomain({ domain: "user_domain_root" });
  const domain = root.createChildDomain({
    domain: "user",
    actions: {
      getUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .output({ schema: v.object({ id: v.string(), source: v.string() }) }),
      deleteUser: action().input({ schema: v.object({ userId: v.string() }) }),
    },
  });
  return { root, domain };
};

// ── 1. matchTag-specific handler still wins when registered ─────────────────────

describe("matchTag dispatch — named handler is used when registered", () => {
  it("execute with matchTag routes to the matchTag-keyed handler", async () => {
    const { root, domain } = makeUserDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "remote" }).forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "remote" }),
        }),
        new ActionHandler().forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
        }),
      ]),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, { tag: "remote" });
    expect(result).toEqual({ id: "u1", source: "remote" });
  });

  it("execute without matchTag routes to the default handler", async () => {
    const { root, domain } = makeUserDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "remote" }).forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "remote" }),
        }),
        new ActionHandler().forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
        }),
      ]),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" });
    expect(result).toEqual({ id: "u1", source: "local" });
  });
});

// ── 2. Default handler wins when matchTag is not registered on this domain ───────

describe("matchTag dispatch — doesn't fall back to default handler when matchTag absent", () => {
  it("named-tag handler responds to its own tag", async () => {
    const { root, domain } = makeUserDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "remote" }).forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
        }),
      ]),
    );

    // "remote" IS registered on the runtime — should find the handler
    const result = await domain.action("getUser").execute({ userId: "u1" }, { tag: "remote" });
    expect(result).toEqual({ id: "u1", source: "local" });
  });

  it("default handler with forAction() is not used when matchTag is not registered", async () => {
    const { root, domain } = makeUserDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(domain, "getUser", {
          execution: (primed) =>
            primed.setResponse({ id: primed.input.userId, source: "default-handler" }),
        }),
      ]),
    );

    const result = await domain
      .action("getUser")
      .executeSafe({ userId: "u1" }, { tag: "unknownEnv" });

    expect(result.ok).toEqual(false);

    if (result.ok) {
      expect(result.output).toEqual({ id: "u1", source: "default-handler" });
    }
  });

  it("matchTag-keyed handler wins over default handler", async () => {
    const { root, domain } = makeUserDomain();

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "solver" }).forAction(domain, "getUser", {
          execution: (primed) =>
            primed.setResponse({ id: primed.input.userId, source: "env-handler" }),
        }),
        new ActionHandler().forAction(domain, "getUser", {
          execution: (primed) =>
            primed.setResponse({ id: primed.input.userId, source: "default-req" }),
        }),
      ]),
    );

    const result = await domain.action("getUser").execute({ userId: "u1" }, { tag: "solver" });
    expect(result).toEqual({ id: "u1", source: "env-handler" });
  });
});

// ── 3. Throws when no handler is found at all ────────────────────────────────

describe("matchTag dispatch — error when no handler found", () => {
  it("throws action_environment_not_found when matchTag given and no handler at all", async () => {
    const { root, domain } = makeUserDomain();
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test" }));

    await expect(
      domain.action("getUser").execute({ userId: "u1" }, { tag: "ghost" }),
    ).rejects.toThrow('No handler registered for tag "ghost" on domain "user_domain_root".');
  });

  it("throws domain_no_handler when no matchTag given and no handler registered", async () => {
    const { root, domain } = makeUserDomain();
    root.setRuntimeEnvironment(createActionRuntime({ envId: "test" }));

    await expect(domain.action("getUser").execute({ userId: "u1" })).rejects.toThrow(
      /no action handler registered/i,
    );
  });
});

// ── 4. Child domain handler wins over unregistered matchTag ─────────────────────

describe("child domain — own handler takes priority", () => {
  it("handler is used for the remote tag", async () => {
    const root = createActionRootDomain({ domain: "root" });

    const child = root.createChildDomain({
      domain: "child",
      actions: {
        pong: action()
          .input({ schema: v.object({ v: v.string() }) })
          .output({ schema: v.object({ result: v.string() }) }),
      },
    });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "remote" }).forAction(child, "pong", {
          execution: (primed) => primed.setResponse({ result: `child:${primed.input.v}` }),
        }),
      ]),
    );

    const result = await child.action("pong").execute({ v: "hello" }, { tag: "remote" });
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

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler({ tag: "remote" }).forAction(child, "pong", {
          execution: (primed) => primed.setResponse({ result: `remote:${primed.input.v}` }),
        }),
        new ActionHandler().forAction(child, "pong", {
          execution: (primed) => primed.setResponse({ result: `local:${primed.input.v}` }),
        }),
      ]),
    );

    const remoteResult = await child.action("pong").execute({ v: "x" }, { tag: "remote" });
    const localResult = await child.action("pong").execute({ v: "x" });

    expect(remoteResult).toEqual({ result: "remote:x" });
    expect(localResult).toEqual({ result: "local:x" });
  });
});

// ── 5. Listeners fire on fallback path ───────────────────────────────────────

describe("matchTag fallback — action listeners still fire", () => {
  it("listener is not called when default handler is reached via matchTag fallback", async () => {
    const { root, domain } = makeUserDomain();
    const listenerCalls = vi.fn();

    domain.addActionListener({ execution: (act) => listenerCalls(act.id) });

    root.setRuntimeEnvironment(
      createActionRuntime({ envId: "test" }).addHandlers([
        new ActionHandler().forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, source: "local" }),
        }),
      ]),
    );

    await domain.action("getUser").executeSafe({ userId: "u1" }, { tag: "unregistered-env" });

    expect(listenerCalls).not.toHaveBeenCalled();
  });
});
