import { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDefinedProps, TExtractContextType } from "../NiceError/NiceError.types";

/**
 * Handler map for `matchFirst`. Each key is an error id (from `ACTIVE_IDS`) and
 * the value is a function that receives the typed context for that id.
 *
 * The `_` key is an optional fallback that runs when no id-specific handler matched.
 */
export type TMatchFirstHandlers<
  ERR_DEF extends INiceErrorDefinedProps,
  ACTIVE_IDS extends keyof ERR_DEF["schema"] & string,
  RESULT,
> = {
  [K in ACTIVE_IDS]?: (context: TExtractContextType<ERR_DEF["schema"][K]>) => RESULT;
} & { _?: () => RESULT };

/**
 * Pattern-matches an error against a map of id → handler functions, returning the
 * result of the first handler whose id is active on the error.
 *
 * - Ids are tested in the order returned by `error.getIds()`.
 * - If no id-specific handler matched and `_` is provided, the fallback is called.
 * - Returns `undefined` when neither any id handler nor the fallback fires.
 *
 * **Requires hydrated context.** If any matched id is in the `"unhydrated"` state,
 * `getContext` will throw. Call `niceErrorDefined.hydrate(error)` beforehand when
 * working with errors deserialized from a JSON payload.
 *
 * @example
 * ```ts
 * const result = matchFirst(error, {
 *   invalid_credentials: ({ username }) => `Wrong password for ${username}`,
 *   account_locked:      ()             => "Account is locked",
 *   _:                   ()             => "Unknown auth error",
 * });
 * ```
 */
export function matchFirst<
  ERR_DEF extends INiceErrorDefinedProps,
  ACTIVE_IDS extends keyof ERR_DEF["schema"] & string,
  RESULT,
>(
  error: NiceError<ERR_DEF, ACTIVE_IDS>,
  handlers: TMatchFirstHandlers<ERR_DEF, ACTIVE_IDS, RESULT>,
): RESULT | undefined {
  for (const id of error.getIds()) {
    const handler = (handlers as Record<string, unknown>)[id as string];
    if (typeof handler === "function") {
      const context = error.getContext(id);
      return (handler as (ctx: unknown) => RESULT)(context);
    }
  }

  if (typeof handlers._ === "function") {
    return handlers._();
  }

  return undefined;
}
