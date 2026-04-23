import * as v from "valibot";
import { describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { createActionRuntime } from "../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../ActionSchema/action";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRuntime(envId = "test_env") {
  return createActionRuntime({ envId });
}

function makeRoot(domain = "root") {
  return createActionRootDomain({ domain });
}

// ── 1. Instantiation ─────────────────────────────────────────────────────────

describe("ActionRuntimeEnvironment — instantiation", () => {
  it("stores the envId", () => {
    const runtime = makeRuntime("my_env");
    expect(runtime.envId).toBe("my_env");
  });

  it("memCuid has the format envId::random", () => {
    expect(makeRuntime("my_env").memCuid).toMatch(/^my_env::.+$/);
  });

  it("timeCreated is a recent timestamp", () => {
    const before = Date.now();
    const runtime = makeRuntime();
    const after = Date.now();
    expect(runtime.timeCreated).toBeGreaterThanOrEqual(before);
    expect(runtime.timeCreated).toBeLessThanOrEqual(after);
  });

  it("toJsonObject returns correct shape", () => {
    const runtime = makeRuntime("env1");
    const json = runtime.toJsonObject();
    expect(json.envId).toBe("env1");
    expect(json.memCuid).toMatch(/^env1::.+$/);
    expect(json.timeCreated).toBe(runtime.timeCreated);
    expect(json.runtimeInfo).toMatchObject({
      assumed: expect.any(Boolean),
      runtimeName: expect.any(String),
    });
  });

  it("two instances get distinct memCuids", () => {
    const a = makeRuntime("env");
    const b = makeRuntime("env");
    expect(a.memCuid).not.toBe(b.memCuid);
  });
});

// ── 2. addHandlers / getHandlerForTag ─────────────────────────────────────────

describe("ActionRuntimeEnvironment — addHandlers / getHandlerForTag", () => {
  it("stores a default-tag handler and retrieves it", () => {
    const runtime = makeRuntime();
    const handler = new ActionHandler(); // matchTag = "_"
    runtime.addHandlers([handler]);
    expect(runtime.getHandlerForTag("_")).toBe(handler);
  });

  it("stores a custom-tag handler and retrieves it", () => {
    const runtime = makeRuntime();
    const handler = new ActionHandler({ matchTag: "remote" });
    runtime.addHandlers([handler]);
    expect(runtime.getHandlerForTag("remote")).toBe(handler);
    expect(runtime.getHandlerForTag("_")).toBeUndefined();
  });

  it("returns undefined for an unknown tag", () => {
    expect(makeRuntime().getHandlerForTag("_")).toBeUndefined();
  });

  it("multiple handlers with different tags all stored correctly", () => {
    const runtime = makeRuntime();
    const h1 = new ActionHandler({ matchTag: "a" });
    const h2 = new ActionHandler({ matchTag: "b" });
    runtime.addHandlers([h1, h2]);
    expect(runtime.getHandlerForTag("a")).toBe(h1);
    expect(runtime.getHandlerForTag("b")).toBe(h2);
  });

  it("first handler wins when multiple share the same tag", () => {
    const runtime = makeRuntime();
    const h1 = new ActionHandler();
    const h2 = new ActionHandler();
    runtime.addHandlers([h1, h2]);
    expect(runtime.getHandlerForTag("_")).toBe(h1);
  });

  it("addHandlers is chainable", () => {
    const runtime = makeRuntime();
    expect(runtime.addHandlers([])).toBe(runtime);
  });

  it("handlers can be added in multiple addHandlers calls", () => {
    const runtime = makeRuntime();
    const h1 = new ActionHandler({ matchTag: "x" });
    const h2 = new ActionHandler({ matchTag: "y" });
    runtime.addHandlers([h1]).addHandlers([h2]);
    expect(runtime.getHandlerForTag("x")).toBe(h1);
    expect(runtime.getHandlerForTag("y")).toBe(h2);
  });
});

// ── 3. setRuntimeEnvironment + basic dispatch ─────────────────────────────────

describe("ActionRuntimeEnvironment — basic dispatch via root domain", () => {
  it("action dispatched from child domain reaches the runtime handler", async () => {
    const root = makeRoot("greet_root");
    const domain = root.createChildDomain({
      domain: "greet",
      actions: {
        hello: action()
          .input({ schema: v.object({ name: v.string() }) })
          .output({ schema: v.object({ greeting: v.string() }) }),
      },
    });

    const handler = new ActionHandler().forAction(domain, "hello", {
      execution: (primed) => primed.setResponse({ greeting: `Hello, ${primed.input.name}!` }),
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    const result = await domain.action("hello").execute({ name: "World" });
    expect(result).toEqual({ greeting: "Hello, World!" });
  });

  it("handler returning void results in undefined output", async () => {
    const root = makeRoot("void_root");
    const domain = root.createChildDomain({
      domain: "side_effect",
      actions: { log: action().input({ schema: v.object({ msg: v.string() }) }) },
    });

    const called = vi.fn();
    const handler = new ActionHandler().forAction(domain, "log", {
      execution: (primed) => {
        called(primed.input.msg);
        return primed.setResponse(undefined);
      },
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    const result = await domain.action("log").execute({ msg: "test" });
    expect(called).toHaveBeenCalledWith("test");
    expect(result).toBeUndefined();
  });

  it("setRuntimeEnvironment throws when called twice", () => {
    const root = makeRoot("double_set_root");
    root.setRuntimeEnvironment(makeRuntime("env1"));
    expect(() => root.setRuntimeEnvironment(makeRuntime("env2"))).toThrow(/already/i);
  });

  it("setRuntimeEnvironment is chainable", () => {
    const root = makeRoot("chain_root");
    expect(root.setRuntimeEnvironment(makeRuntime())).toBe(root);
  });

  it("async handler is awaited and result returned correctly", async () => {
    const root = makeRoot("async_root");
    const domain = root.createChildDomain({
      domain: "async_dom",
      actions: {
        fetch: action()
          .input({ schema: v.object({ id: v.string() }) })
          .output({ schema: v.object({ data: v.string() }) }),
      },
    });

    const handler = new ActionHandler().forAction(domain, "fetch", {
      execution: async (primed) => {
        await Promise.resolve();
        return primed.setResponse({ data: `fetched:${primed.input.id}` });
      },
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    const result = await domain.action("fetch").execute({ id: "abc" });
    expect(result).toEqual({ data: "fetched:abc" });
  });
});

// ── 4. Multi-domain runtime ────────────────────────────────────────────────────

describe("ActionRuntimeEnvironment — multi-domain dispatch", () => {
  it("single runtime handles actions from multiple child domains", async () => {
    const root = makeRoot("multi_root");

    const users = root.createChildDomain({
      domain: "users",
      actions: {
        get: action()
          .input({ schema: v.object({ id: v.string() }) })
          .output({ schema: v.object({ name: v.string() }) }),
      },
    });

    const posts = root.createChildDomain({
      domain: "posts",
      actions: {
        get: action()
          .input({ schema: v.object({ id: v.string() }) })
          .output({ schema: v.object({ title: v.string() }) }),
      },
    });

    const handler = new ActionHandler()
      .forAction(users, "get", { execution: (p) => p.setResponse({ name: `User-${p.input.id}` }) })
      .forAction(posts, "get", {
        execution: (p) => p.setResponse({ title: `Post-${p.input.id}` }),
      });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    expect(await users.action("get").execute({ id: "u1" })).toEqual({ name: "User-u1" });
    expect(await posts.action("get").execute({ id: "p1" })).toEqual({ title: "Post-p1" });
  });

  it("forDomain handler routes all actions in a domain", async () => {
    const root = makeRoot("fordomain_root");

    const domain = root.createChildDomain({
      domain: "things",
      actions: {
        create: action()
          .input({ schema: v.object({ label: v.string() }) })
          .output({ schema: v.object({ created: v.boolean() }) }),
        delete: action()
          .input({ schema: v.object({ id: v.string() }) })
          .output({ schema: v.object({ deleted: v.boolean() }) }),
      },
    });

    const log = vi.fn();
    const handler = new ActionHandler().forDomain(domain, {
      execution: (act) => {
        const create = domain.matchAction(act, "create");
        if (create) {
          log("create", create.input.label);
          return act.setResponse({ created: true });
        }
        const del = domain.matchAction(act, "delete");
        if (del) {
          log("delete", del.input.id);
          return act.setResponse({ deleted: true });
        }
      },
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await domain.action("create").execute({ label: "widget" });
    await domain.action("delete").execute({ id: "x1" });

    expect(log.mock.calls).toEqual([
      ["create", "widget"],
      ["delete", "x1"],
    ]);
  });

  it("separate handlers registered by tag serve different child domains", async () => {
    const root = makeRoot("separate_root");

    const alpha = root.createChildDomain({
      domain: "alpha",
      actions: {
        run: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ result: v.number() }) }),
      },
    });

    const beta = root.createChildDomain({
      domain: "beta",
      actions: {
        run: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ result: v.number() }) }),
      },
    });

    const handler = new ActionHandler()
      .forAction(alpha, "run", { execution: (p) => p.setResponse({ result: p.input.x * 2 }) })
      .forAction(beta, "run", { execution: (p) => p.setResponse({ result: p.input.x * 3 }) });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    expect(await alpha.action("run").execute({ x: 5 })).toEqual({ result: 10 });
    expect(await beta.action("run").execute({ x: 5 })).toEqual({ result: 15 });
  });
});

// ── 5. Input validation in runtime path ──────────────────────────────────────

describe("ActionRuntimeEnvironment — input validation", () => {
  it("validation schema runs before execution in the runtime path", async () => {
    const root = makeRoot("validation_root");
    const domain = root.createChildDomain({
      domain: "validated",
      actions: {
        submit: action().input({ schema: v.object({ count: v.number() }) }),
      },
    });

    const execution = vi.fn();
    const handler = new ActionHandler().forAction(domain, "submit", { execution });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await expect(domain.action("submit").execute({ count: "not-a-number" as any })).rejects.toThrow(
      /validation/i,
    );

    expect(execution).not.toHaveBeenCalled();
  });

  it("valid input passes through to the handler", async () => {
    const root = makeRoot("valid_input_root");
    const domain = root.createChildDomain({
      domain: "typed_dom",
      actions: {
        process: action()
          .input({ schema: v.object({ amount: v.number(), label: v.string() }) })
          .output({ schema: v.object({ ok: v.boolean() }) }),
      },
    });

    let captured: { amount: number; label: string } | undefined;
    const handler = new ActionHandler().forAction(domain, "process", {
      execution: (primed) => {
        captured = primed.input;
        return primed.setResponse({ ok: true });
      },
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await domain.action("process").execute({ amount: 42, label: "test" });
    expect(captured).toEqual({ amount: 42, label: "test" });
  });
});

// ── 6. Action listeners fire via runtime path ─────────────────────────────────

describe("ActionRuntimeEnvironment — action listeners", () => {
  it("child domain listener fires when action is handled by the runtime", async () => {
    const root = makeRoot("listener_root");
    const domain = root.createChildDomain({
      domain: "listen_domain",
      actions: { ping: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    const listenerCalls = vi.fn();
    domain.addActionListener({ execution: (primed) => listenerCalls(primed.id) });

    const handler = new ActionHandler().forAction(domain, "ping", { execution: () => {} });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await domain.action("ping").execute({ n: 1 });

    expect(listenerCalls).toHaveBeenCalledOnce();
    expect(listenerCalls).toHaveBeenCalledWith("ping");
  });

  it("listener receives the correct action id and domain", async () => {
    const root = makeRoot("listener_meta_root");
    const domain = root.createChildDomain({
      domain: "meta_domain",
      actions: {
        alpha: action().input({ schema: v.object({ x: v.number() }) }),
        beta: action().input({ schema: v.object({ x: v.number() }) }),
      },
    });

    const fired: string[] = [];
    domain.addActionListener({
      execution: (primed) => {
        fired.push(`${primed.domain}::${primed.id}`);
      },
    });

    const handler = new ActionHandler().forDomain(domain, { execution: () => {} });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await domain.action("alpha").execute({ x: 1 });
    await domain.action("beta").execute({ x: 2 });

    expect(fired).toEqual(["meta_domain::alpha", "meta_domain::beta"]);
  });

  it("listener unsubscribe stops further calls", async () => {
    const root = makeRoot("unsub_root");
    const domain = root.createChildDomain({
      domain: "unsub_domain",
      actions: { ping: action().input({ schema: v.object({ n: v.number() }) }) },
    });

    const calls = vi.fn();
    const unsubscribe = domain.addActionListener({ execution: () => calls() });
    const handler = new ActionHandler().forAction(domain, "ping", { execution: () => {} });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await domain.action("ping").execute({ n: 1 });
    unsubscribe();
    await domain.action("ping").execute({ n: 2 });

    expect(calls).toHaveBeenCalledOnce();
  });
});

// ── 7. Error cases ────────────────────────────────────────────────────────────

describe("ActionRuntimeEnvironment — error cases", () => {
  it("throws no_action_execution_handler when runtime has no handler for the action", async () => {
    const root = makeRoot("err_root");
    const domain = root.createChildDomain({
      domain: "err_domain",
      actions: { act: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    // Empty handler — no forAction registered for this action
    root.setRuntimeEnvironment(makeRuntime().addHandlers([new ActionHandler()]));

    await expect(domain.action("act").execute({ x: 1 })).rejects.toThrow(/no action.*handler/i);
  });

  it("throws domain_no_handler when no runtime and no domain handler are set", async () => {
    const root = makeRoot("no_handler_root");
    const domain = root.createChildDomain({
      domain: "no_handler",
      actions: { act: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    await expect(domain.action("act").execute({ x: 1 })).rejects.toThrow(/no action handler/i);
  });

  it("handler execution errors propagate out of execute()", async () => {
    const root = makeRoot("err_prop_root");
    const domain = root.createChildDomain({
      domain: "err_prop",
      actions: { act: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    const handler = new ActionHandler().forAction(domain, "act", {
      execution: () => {
        throw new Error("handler blew up");
      },
    });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    await expect(domain.action("act").execute({ x: 1 })).rejects.toThrow("handler blew up");
  });

  it("executeSafe wraps handler errors as ok:false", async () => {
    const root = makeRoot("safe_err_root");
    const domain = root.createChildDomain({
      domain: "safe_err",
      actions: { act: action().input({ schema: v.object({ x: v.number() }) }) },
    });

    const handler = new ActionHandler().forAction(domain, "act", {
      execution: () => {
        throw new Error("boom");
      },
    });
    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    const result = await domain.action("act").prime({ x: 1 }).executeSafe();
    expect(result.ok).toBe(false);
  });
});

// ── 8. Domain handler takes priority over runtime ─────────────────────────────

describe("ActionRuntimeEnvironment — domain handler priority", () => {
  it("domain setHandler handles the action without consulting the runtime", async () => {
    const root = makeRoot("priority_root");
    const domain = root.createChildDomain({
      domain: "priority",
      actions: {
        act: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ source: v.string() }) }),
      },
    });

    domain.setHandler(
      new ActionHandler().forAction(domain, "act", {
        execution: (act) => act.setResponse({ source: "domain" }),
      }),
    );

    const runtimeExec = vi.fn(() => ({ source: "runtime" }));
    root.setRuntimeEnvironment(
      makeRuntime().addHandlers([
        new ActionHandler().forAction(domain, "act", {
          execution: (act) => act.setResponse({ source: "runtime" }),
        }),
      ]),
    );

    const result = await domain.action("act").execute({ x: 1 });
    expect(result).toEqual({ source: "domain" });
    expect(runtimeExec).not.toHaveBeenCalled();
  });

  it("runtime is consulted for a second domain that has no domain handler", async () => {
    const root = makeRoot("mixed_root");

    const local = root.createChildDomain({
      domain: "local",
      actions: {
        run: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ source: v.string() }) }),
      },
    });

    const remote = root.createChildDomain({
      domain: "remote",
      actions: {
        run: action()
          .input({ schema: v.object({ x: v.number() }) })
          .output({ schema: v.object({ source: v.string() }) }),
      },
    });

    local.setHandler(
      new ActionHandler().forAction(local, "run", {
        execution: (act) => act.setResponse({ source: "local-handler" }),
      }),
    );

    const handler = new ActionHandler()
      .forAction(local, "run", { execution: (act) => act.setResponse({ source: "runtime-local" }) })
      .forAction(remote, "run", {
        execution: (act) => act.setResponse({ source: "runtime-remote" }),
      });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    expect(await local.action("run").execute({ x: 1 })).toEqual({ source: "local-handler" });
    expect(await remote.action("run").execute({ x: 1 })).toEqual({ source: "runtime-remote" });
  });
});

// ── 9. Serialization round-trip via runtime ───────────────────────────────────

describe("ActionRuntimeEnvironment — serialization round-trip", () => {
  it("custom SERDE input is deserialized before reaching the handler", async () => {
    const root = makeRoot("serde_root");
    const domain = root.createChildDomain({
      domain: "serde_dom",
      actions: {
        schedule: action().input(
          { schema: v.object({ at: v.date() }) },
          ({ at }) => ({ iso: at.toISOString() }),
          (s) => ({ at: new Date(s.iso) }),
        ),
      },
    });

    let received: Date | undefined;
    const handler = new ActionHandler().forAction(domain, "schedule", {
      execution: (primed) => {
        received = primed.input.at;
      },
    });

    root.setRuntimeEnvironment(makeRuntime().addHandlers([handler]));

    const ts = new Date("2024-06-15T12:00:00Z");
    await domain.action("schedule").execute({ at: ts });

    expect(received).toEqual(ts);
  });
});
