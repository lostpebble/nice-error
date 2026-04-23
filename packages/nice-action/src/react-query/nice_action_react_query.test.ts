/**
 * Tests for the react-query integration layer.
 *
 * Hooks are tested by intercepting useQuery/useMutation via vi.mock so they can
 * run outside a React tree. Integration tests use QueryClient.fetchQuery directly,
 * exercising the full domain → action → queryFn pipeline without React.
 */
import { defineNiceError, err, forDomain } from "@nice-code/error";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { ActionHandler } from "../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { action } from "../ActionSchema/action";
import { niceActionQueryKey, useNiceMutation, useNiceQuery } from "./index";

// ── Mock useQuery / useMutation so hooks run without a React context ─────────

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({ data: undefined, isPending: true, isSuccess: false }),
    useMutation: vi
      .fn()
      .mockReturnValue({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  };
});

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);

// ── Shared error domains ─────────────────────────────────────────────────────

const err_user = defineNiceError({
  domain: "err_user",
  schema: {
    not_found: err({ message: "User not found", httpStatusCode: 404 }),
    forbidden: err({ message: "Access denied", httpStatusCode: 403 }),
  },
});

const err_post = defineNiceError({
  domain: "err_post",
  schema: {
    duplicate_title: err<{ title: string }>({
      message: ({ title }) => `Post titled "${title}" already exists`,
      httpStatusCode: 409,
      context: { required: true },
    }),
  },
});

// ── Shared domain factory ────────────────────────────────────────────────────

const makeDomain = () => {
  return createActionRootDomain({ domain: "test_domain_root" }).createChildDomain({
    domain: "test_domain",
    actions: {
      getUser: action()
        .input({ schema: v.object({ userId: v.string() }) })
        .output({ schema: v.object({ id: v.string(), name: v.string() }) })
        .throws(err_user, ["not_found", "forbidden"] as const),

      createPost: action()
        .input({ schema: v.object({ title: v.string(), body: v.string() }) })
        .output({ schema: v.object({ postId: v.string() }) })
        .throws(err_post),

      getSchedule: action()
        .input(
          { schema: v.object({ date: v.date() }) },
          ({ date }) => ({ iso: date.toISOString() }),
          ({ iso }) => ({ date: new Date(iso) }),
        )
        .output({ schema: v.object({ slots: v.array(v.string()) }) }),
    },
  });
};

beforeEach(() => {
  mockUseQuery.mockClear();
  mockUseMutation.mockClear();
});

// ── 1. niceActionQueryKey ────────────────────────────────────────────────────

describe("niceActionQueryKey — structure", () => {
  it("base key (no input) is a 4-element tuple", () => {
    const domain = makeDomain();
    const key = niceActionQueryKey(domain.action("getUser"));
    expect(key).toHaveLength(4);
  });

  it("full key (with input) is a 5-element tuple", () => {
    const domain = makeDomain();
    const key = niceActionQueryKey(domain.action("getUser"), { userId: "u1" });
    expect(key).toHaveLength(5);
  });

  it("position [0] is always the 'nice-action' tag", () => {
    const domain = makeDomain();
    expect(niceActionQueryKey(domain.action("getUser"))[0]).toBe("nice-action");
    expect(niceActionQueryKey(domain.action("getUser"), { userId: "u1" })[0]).toBe("nice-action");
  });

  it("position [1] is the domain id, [2] is allDomains, [3] is the action id", () => {
    const domain = makeDomain();
    const key = niceActionQueryKey(domain.action("createPost"));
    expect(key[1]).toBe("test_domain");
    expect(key[2]).toEqual(["test_domain", "test_domain_root"]);
    expect(key[3]).toBe("createPost");
  });

  it("position [4] carries the input object", () => {
    const domain = makeDomain();
    const input = { userId: "abc" };
    const key = niceActionQueryKey(domain.action("getUser"), input);
    expect(key[4]).toBe(input);
  });

  it("different inputs produce distinct keys", () => {
    const domain = makeDomain();
    const k1 = niceActionQueryKey(domain.action("getUser"), { userId: "u1" });
    const k2 = niceActionQueryKey(domain.action("getUser"), { userId: "u2" });
    expect(k1).not.toEqual(k2);
  });

  it("different action ids produce distinct base keys", () => {
    const domain = makeDomain();
    const k1 = niceActionQueryKey(domain.action("getUser"));
    const k2 = niceActionQueryKey(domain.action("createPost"));
    expect(k1).not.toEqual(k2);
  });

  it("base key is a prefix of the full key — supports invalidateQueries pattern", () => {
    const domain = makeDomain();
    const base = niceActionQueryKey(domain.action("getUser"));
    const full = niceActionQueryKey(domain.action("getUser"), { userId: "u1" });
    expect(full.slice(0, base.length)).toEqual([...base]);
  });

  it("child domain allDomains chain is reflected in the key", () => {
    const root = createActionRootDomain({ domain: "root" });
    const child = root.createChildDomain({
      domain: "child",
      actions: { pong: action().input({ schema: v.object({ v: v.string() }) }) },
    });

    const key = niceActionQueryKey(child.action("pong"));
    expect(key[1]).toBe("child");
    expect(key[2]).toEqual(["child", "root"]);
  });
});

// ── 2. useNiceQuery ──────────────────────────────────────────────────────────

describe("useNiceQuery — queryKey", () => {
  it("queryKey passed to useQuery matches niceActionQueryKey(action, input)", () => {
    const domain = makeDomain();
    const input = { userId: "u1" };
    useNiceQuery(domain.action("getUser"), input);

    const opts = mockUseQuery.mock.lastCall![0] as any;
    expect(opts.queryKey).toEqual(niceActionQueryKey(domain.action("getUser"), input));
  });

  it("queryKey differs when input changes", () => {
    const domain = makeDomain();

    useNiceQuery(domain.action("getUser"), { userId: "a" });
    const key1 = (mockUseQuery.mock.lastCall![0] as any).queryKey;

    useNiceQuery(domain.action("getUser"), { userId: "b" });
    const key2 = (mockUseQuery.mock.lastCall![0] as any).queryKey;

    expect(key1).not.toEqual(key2);
  });
});

describe("useNiceQuery — enabled behaviour", () => {
  it("enabled=true when a valid input object is supplied", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), { userId: "u1" });

    const { enabled } = mockUseQuery.mock.lastCall![0] as any;
    expect(enabled).toBe(true);
  });

  it("enabled=false when input is null", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), null);

    const { enabled } = mockUseQuery.mock.lastCall![0] as any;
    expect(enabled).toBe(false);
  });

  it("enabled=false when input is undefined", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), undefined);

    const { enabled } = mockUseQuery.mock.lastCall![0] as any;
    expect(enabled).toBe(false);
  });

  it("enabled=false when options.enabled=false even with valid input", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), { userId: "u1" }, { enabled: false });

    const { enabled } = mockUseQuery.mock.lastCall![0] as any;
    expect(enabled).toBe(false);
  });
});

describe("useNiceQuery — options passthrough", () => {
  it("staleTime is forwarded to useQuery", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), { userId: "u1" }, { staleTime: 30_000 });

    const { staleTime } = mockUseQuery.mock.lastCall![0] as any;
    expect(staleTime).toBe(30_000);
  });

  it("retry is forwarded to useQuery", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), { userId: "u1" }, { retry: 0 });

    const { retry } = mockUseQuery.mock.lastCall![0] as any;
    expect(retry).toBe(0);
  });

  it("select is forwarded to useQuery", () => {
    const domain = makeDomain();
    const selectFn = (data: { id: string; name: string }) => data.name;
    useNiceQuery(domain.action("getUser"), { userId: "u1" }, { select: selectFn });

    const { select } = mockUseQuery.mock.lastCall![0] as any;
    expect(select).toBe(selectFn);
  });

  it("envId is NOT forwarded as a useQuery option", () => {
    const domain = makeDomain();
    useNiceQuery(domain.action("getUser"), { userId: "u1" }, { tag: "workerEnv" });

    const opts = mockUseQuery.mock.lastCall![0] as any;
    expect(opts).not.toHaveProperty("envId");
  });
});

describe("useNiceQuery — queryFn execution", () => {
  it("queryFn calls action.execute with the supplied input", async () => {
    const domain = makeDomain();
    const calls = vi.fn();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => {
          calls(primed.input.userId);
          return primed.setResponse({ id: primed.input.userId, name: "Alice" });
        },
      }),
    );

    useNiceQuery(domain.action("getUser"), { userId: "u1" });

    const { queryFn } = mockUseQuery.mock.lastCall![0] as any;
    const result = await queryFn();

    expect(calls).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ id: "u1", name: "Alice" });
  });

  it("queryFn routes through the named envId when specified", async () => {
    const domain = makeDomain();
    const envCalls = vi.fn<(userId: string) => void>();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => {
          envCalls(primed.input.userId);
          return primed.setResponse({ id: primed.input.userId, name: "Worker Alice" });
        },
      }),
      { matchTag: "workerEnv" },
    );

    useNiceQuery(domain.action("getUser"), { userId: "u2" }, { tag: "workerEnv" });

    const { queryFn } = mockUseQuery.mock.lastCall![0] as any;
    const result = await queryFn();

    expect(envCalls).toHaveBeenCalledWith("u2");
    expect(result).toEqual({ id: "u2", name: "Worker Alice" });
  });

  it("queryFn propagates thrown NiceErrors", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: () => {
          throw err_user.fromId("not_found");
        },
      }),
    );

    useNiceQuery(domain.action("getUser"), { userId: "missing" });

    const { queryFn } = mockUseQuery.mock.lastCall![0] as any;

    await expect(queryFn()).rejects.toSatisfy((e: unknown) => err_user.isExact(e));
  });
});

// ── 3. useNiceMutation ───────────────────────────────────────────────────────

describe("useNiceMutation — mutationFn execution", () => {
  it("mutationFn calls action.execute with the input passed at mutation time", async () => {
    const domain = makeDomain();
    const calls = vi.fn();

    domain.setHandler(
      new ActionHandler().forAction(domain, "createPost", {
        execution: (primed) => {
          calls(primed.input.title, primed.input.body);
          return primed.setResponse({ postId: "p1" });
        },
      }),
    );

    useNiceMutation(domain.action("createPost"));

    const { mutationFn } = mockUseMutation.mock.lastCall![0] as any;
    const result = await mutationFn({ title: "Hello", body: "World" });

    expect(calls).toHaveBeenCalledWith("Hello", "World");
    expect(result).toEqual({ postId: "p1" });
  });

  it("mutationFn routes through the named envId when specified", async () => {
    const domain = makeDomain();
    const envCalls = vi.fn();

    domain.setHandler(
      new ActionHandler().forAction(domain, "createPost", {
        execution: (primed) => {
          envCalls(primed.input.title);
          return primed.setResponse({ postId: "p2" });
        },
      }),
      { matchTag: "serverEnv" },
    );

    useNiceMutation(domain.action("createPost"), { tag: "serverEnv" });

    const { mutationFn } = mockUseMutation.mock.lastCall![0] as any;
    await mutationFn({ title: "From server", body: "body" });

    expect(envCalls).toHaveBeenCalledWith("From server");
  });

  it("envId is NOT forwarded as a useMutation option", () => {
    const domain = makeDomain();
    useNiceMutation(domain.action("createPost"), { tag: "serverEnv" });

    const opts = mockUseMutation.mock.lastCall![0] as any;
    expect(opts).not.toHaveProperty("envId");
  });

  it("onSuccess callback is forwarded to useMutation", () => {
    const domain = makeDomain();
    const onSuccess = vi.fn();
    useNiceMutation(domain.action("createPost"), { onSuccess });

    const opts = mockUseMutation.mock.lastCall![0] as any;
    expect(opts.onSuccess).toBe(onSuccess);
  });

  it("onError callback is forwarded to useMutation", () => {
    const domain = makeDomain();
    const onError = vi.fn();
    useNiceMutation(domain.action("createPost"), { onError });

    const opts = mockUseMutation.mock.lastCall![0] as any;
    expect(opts.onError).toBe(onError);
  });

  it("mutationFn propagates thrown NiceErrors", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "createPost", {
        execution: (primed) => {
          throw err_post.fromId("duplicate_title", { title: primed.input.title });
        },
      }),
    );

    useNiceMutation(domain.action("createPost"));

    const { mutationFn } = mockUseMutation.mock.lastCall![0] as any;

    await expect(mutationFn({ title: "Duplicate", body: "body" })).rejects.toSatisfy((e: unknown) =>
      err_post.isExact(e),
    );
  });
});

// ── 4. Integration — QueryClient without React ───────────────────────────────

describe("Integration — QueryClient.fetchQuery", () => {
  it("fetchQuery with niceActionQueryKey and action.execute returns typed output", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) =>
          primed.setResponse({
            id: primed.input.userId,
            name: "Alice",
          }),
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const input = { userId: "u1" };

    const result = await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("getUser"), input),
      queryFn: () => domain.action("getUser").execute(input),
    });

    expect(result).toEqual({ id: "u1", name: "Alice" });
  });

  it("fetchQuery re-uses cache for identical input", async () => {
    const domain = makeDomain();
    const calls = vi.fn();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) => {
          calls(primed.input.userId);
          return primed.setResponse({ id: primed.input.userId, name: "Cached" });
        },
      }),
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const input = { userId: "c1" };
    const key = niceActionQueryKey(domain.action("getUser"), input);
    const queryFn = () => domain.action("getUser").execute(input);

    await client.fetchQuery({ queryKey: key, queryFn });
    await client.fetchQuery({ queryKey: key, queryFn });

    expect(calls).toHaveBeenCalledTimes(1);
  });

  it("fetchQuery propagates NiceError from handler", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: () => {
          throw err_user.fromId("forbidden");
        },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await expect(
      client.fetchQuery({
        queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "x" }),
        queryFn: () => domain.action("getUser").execute({ userId: "x" }),
      }),
    ).rejects.toSatisfy((e: unknown) => {
      if (!err_user.isExact(e)) return false;
      let matched = false;
      e.handleWithSync([
        forDomain(err_user, (h) => {
          matched = h.hasId("forbidden");
        }),
      ]);
      return matched;
    });
  });

  it("NiceError can be inspected via handleWithSync after fetchQuery rejects", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: () => {
          throw err_user.fromId("not_found");
        },
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let errorId: string | undefined;

    try {
      await client.fetchQuery({
        queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "ghost" }),
        queryFn: () => domain.action("getUser").execute({ userId: "ghost" }),
      });
    } catch (e: unknown) {
      if (err_user.isExact(e)) {
        e.handleWithSync([
          forDomain(err_user, (h) => {
            errorId = h.getIds()[0];
          }),
        ]);
      }
    }

    expect(errorId).toBe("not_found");
  });

  it("date input survives serialization and produces correct output", async () => {
    const domain = makeDomain();
    const receivedDates: Date[] = [];

    domain.setHandler(
      new ActionHandler().forAction(domain, "getSchedule", {
        execution: (primed) => {
          receivedDates.push(primed.input.date);
          return primed.setResponse({ slots: ["09:00", "14:00"] });
        },
      }),
    );

    const date = new Date("2025-03-15T00:00:00.000Z");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const result = await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("getSchedule"), { date }),
      queryFn: () => domain.action("getSchedule").execute({ date }),
    });

    expect(result).toEqual({ slots: ["09:00", "14:00"] });
    expect(receivedDates[0]).toBeInstanceOf(Date);
    expect(receivedDates[0].toISOString()).toBe(date.toISOString());
  });
});

// ── 5. Query key invalidation pattern ────────────────────────────────────────

describe("Query key invalidation — QueryClient", () => {
  it("invalidateQueries with base key marks all entries for that action as stale", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler().forAction(domain, "getUser", {
        execution: (primed) =>
          primed.setResponse({
            id: primed.input.userId,
            name: "User",
          }),
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const queryFn = (userId: string) => () => domain.action("getUser").execute({ userId });

    await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "u1" }),
      queryFn: queryFn("u1"),
    });
    await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "u2" }),
      queryFn: queryFn("u2"),
    });

    await client.invalidateQueries({
      queryKey: niceActionQueryKey(domain.action("getUser")),
    });

    const state1 = client.getQueryState(
      niceActionQueryKey(domain.action("getUser"), { userId: "u1" }),
    );
    const state2 = client.getQueryState(
      niceActionQueryKey(domain.action("getUser"), { userId: "u2" }),
    );

    expect(state1?.isInvalidated).toBe(true);
    expect(state2?.isInvalidated).toBe(true);
  });

  it("invalidating one action's base key does not affect a different action", async () => {
    const domain = makeDomain();

    domain.setHandler(
      new ActionHandler()
        .forAction(domain, "getUser", {
          execution: (primed) => primed.setResponse({ id: primed.input.userId, name: "User" }),
        })
        .forAction(domain, "createPost", {
          execution: (primed) => primed.setResponse({ postId: "p1" }),
        }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "u1" }),
      queryFn: () => domain.action("getUser").execute({ userId: "u1" }),
    });
    await client.fetchQuery({
      queryKey: niceActionQueryKey(domain.action("createPost"), { title: "A", body: "B" }),
      queryFn: () => domain.action("createPost").execute({ title: "A", body: "B" }),
    });

    await client.invalidateQueries({
      queryKey: niceActionQueryKey(domain.action("getUser")),
    });

    const userState = client.getQueryState(
      niceActionQueryKey(domain.action("getUser"), { userId: "u1" }),
    );
    const postState = client.getQueryState(
      niceActionQueryKey(domain.action("createPost"), { title: "A", body: "B" }),
    );

    expect(userState?.isInvalidated).toBe(true);
    expect(postState?.isInvalidated).toBe(false);
  });
});
