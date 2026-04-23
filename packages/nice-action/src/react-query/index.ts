import type {
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  INiceActionDomain,
  TInferInputFromSchema,
  TInferOutputFromSchema,
} from "../ActionDomain/NiceActionDomain.types";
import type { TInferActionError } from "../ActionSchema/NiceActionSchema";
import type { NiceAction } from "../NiceAction/NiceAction";

/**
 * Builds a stable TanStack Query key for a Nice Action.
 *
 * Overload 1 (no input) — returns a prefix key suitable for `queryClient.invalidateQueries`,
 * which will match every cached query for this action regardless of input.
 *
 * Overload 2 (with input) — returns the exact key used by `useNiceQuery` for the given input.
 * Use this when you need to read or invalidate a single cached result.
 *
 * @example
 * // Invalidate all cached results for an action
 * queryClient.invalidateQueries({ queryKey: niceActionQueryKey(domain.action("getUser")) });
 *
 * // Invalidate a specific cached result
 * queryClient.invalidateQueries({ queryKey: niceActionQueryKey(domain.action("getUser"), { userId: "123" }) });
 */
export function niceActionQueryKey<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
>(
  action: NiceAction<DOM, ID, DOM["actions"][ID]>,
): readonly ["nice-action", DOM["domain"], DOM["allDomains"], ID];

export function niceActionQueryKey<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
>(
  action: NiceAction<DOM, ID, DOM["actions"][ID]>,
  input: TInferInputFromSchema<DOM["actions"][ID]>["Input"],
): readonly [
  "nice-action",
  DOM["domain"],
  DOM["allDomains"],
  ID,
  TInferInputFromSchema<DOM["actions"][ID]>["Input"],
];

export function niceActionQueryKey(action: NiceAction<any, any, any>, input?: unknown) {
  if (input === undefined) {
    return ["nice-action", action.domain, action.allDomains, action.id] as const;
  }
  return ["nice-action", action.domain, action.allDomains, action.id, input] as const;
}

export type TUseNiceQueryOptions<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
  TSelect = TInferOutputFromSchema<SCH>["Output"],
> = Omit<
  UseQueryOptions<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>, TSelect, QueryKey>,
  "queryKey" | "queryFn"
> & {
  tag?: string;
};

export type TUseNiceMutationOptions<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID] = DOM["actions"][ID],
  TContext = unknown,
> = Omit<
  UseMutationOptions<
    TInferOutputFromSchema<SCH>["Output"],
    TInferActionError<SCH>,
    TInferInputFromSchema<SCH>["Input"],
    TContext
  >,
  "mutationFn"
> & {
  tag?: string;
};

/**
 * Execute a Nice Action as a TanStack Query.
 *
 * Automatically constructs a stable query key from the action's domain, id, and input.
 * Passing `null` or `undefined` as `input` disables the query (sets `enabled: false`),
 * which allows conditional execution while respecting React's rules of hooks.
 *
 * The `envId` option targets a specific named handler/resolver registered on the domain.
 *
 * Supports TanStack Query's `select` option with full type inference — if you pass a
 * `select` transformer, `data` will be typed as the transformer's return type.
 *
 * @example
 * const { data, isPending, error } = useNiceQuery(
 *   domain.action("getUser"),
 *   { userId: "123" },
 * );
 *
 * @example
 * // Conditionally enabled
 * const { data } = useNiceQuery(domain.action("getUser"), userId ? { userId } : null);
 */
export function useNiceQuery<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID],
  TSelect = TInferOutputFromSchema<SCH>["Output"],
>(
  action: NiceAction<DOM, ID, SCH>,
  input: TInferInputFromSchema<SCH>["Input"] | null | undefined,
  options?: TUseNiceQueryOptions<DOM, ID, SCH, TSelect>,
): UseQueryResult<TSelect, TInferActionError<SCH>> {
  const { tag, enabled, ...queryOptions } = options ?? {};

  return useQuery({
    queryKey: ["nice-action", action.domain, action.allDomains, action.id, input],
    queryFn: () => action.execute(input!, tag),
    enabled: input != null && (enabled ?? true),
    ...queryOptions,
  } as UseQueryOptions<TInferOutputFromSchema<SCH>["Output"], TInferActionError<SCH>, TSelect>);
}

/**
 * Execute a Nice Action as a TanStack Mutation.
 *
 * Ideal for actions that change server state — form submissions, updates, deletes, etc.
 * The input is provided at call time via `mutation.mutate(input)` or `mutation.mutateAsync(input)`.
 *
 * The `envId` option targets a specific named handler/resolver registered on the domain.
 *
 * @example
 * const mutation = useNiceMutation(domain.action("createUser"));
 *
 * function handleSubmit(data: CreateUserInput) {
 *   mutation.mutate(data, {
 *     onSuccess: (user) => router.push(`/users/${user.id}`),
 *   });
 * }
 */
export function useNiceMutation<
  DOM extends INiceActionDomain,
  ID extends keyof DOM["actions"] & string,
  SCH extends DOM["actions"][ID],
  TContext = unknown,
>(
  action: NiceAction<DOM, ID, SCH>,
  options?: TUseNiceMutationOptions<DOM, ID, SCH, TContext>,
): UseMutationResult<
  TInferOutputFromSchema<SCH>["Output"],
  TInferActionError<SCH>,
  TInferInputFromSchema<SCH>["Input"],
  TContext
> {
  const { tag, ...mutationOptions } = options ?? {};

  return useMutation({
    mutationFn: (input: TInferInputFromSchema<SCH>["Input"]) => action.execute(input, tag),
    ...mutationOptions,
  });
}
