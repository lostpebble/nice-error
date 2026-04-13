import type { INiceErrorDefinedProps } from "../NiceError/NiceError.types";
import type { NiceErrorHydrated } from "../NiceError/NiceErrorHydrated";
import type { NiceErrorDefined } from "../NiceErrorDefined/NiceErrorDefined";

// ---------------------------------------------------------------------------
// IErrorCase — the shape stored in the cases array
// ---------------------------------------------------------------------------

/**
 * A single case in a `handleWith` / `handleWithAsync` call.
 *
 * Construct via `forDomain` or `forIds` — do not build this object directly.
 */
export interface IErrorCase<
  DEF extends INiceErrorDefinedProps,
  IDS extends keyof DEF["schema"] & string,
> {
  /**
   * Duck-typed reference to the domain definition.
   * Needs only `isExact()` and `hydrate()` at runtime — avoids any circular value import.
   * @internal
   */
  readonly _domain: Pick<NiceErrorDefined<DEF>, "isExact" | "hydrate">;
  /** When set, the case only fires if one of these ids is active on the error. @internal */
  readonly _ids: ReadonlyArray<IDS> | undefined;
  /** The handler to invoke with the hydrated error. @internal */
  readonly _handler: (error: NiceErrorHydrated<DEF, IDS>) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// forDomain — case matching any active id in the domain
// ---------------------------------------------------------------------------

/**
 * Builds a case that fires for any error whose domain exactly matches `domain`.
 * The handler receives the fully-hydrated error, narrowed to all schema ids.
 *
 * Use with `error.handleWith([...])` (sync) or `error.handleWithAsync([...])` (async).
 *
 * @example
 * ```ts
 * error.handleWith([
 *   forDomain(err_payments, (h) => {
 *     matchFirst(h, {
 *       payment_failed: ({ reason }) => res.status(402).json({ reason }),
 *       card_expired:   ()           => res.status(402).json({ expired: true }),
 *     });
 *   }),
 * ]);
 * ```
 */
export function forDomain<DEF extends INiceErrorDefinedProps>(
  domain: NiceErrorDefined<DEF>,
  handler: (error: NiceErrorHydrated<DEF, keyof DEF["schema"] & string>) => void | Promise<void>,
): IErrorCase<DEF, keyof DEF["schema"] & string> {
  return { _domain: domain, _ids: undefined, _handler: handler };
}

// ---------------------------------------------------------------------------
// forIds — case matching only when specific ids are active
// ---------------------------------------------------------------------------

/**
 * Builds a case that fires only if the error's domain matches `domain` **and**
 * at least one of `ids` is active on the error.
 * The handler receives the fully-hydrated error, narrowed to `IDS[number]`.
 *
 * @example
 * ```ts
 * error.handleWith([
 *   forIds(err_feature, ["not_found", "forbidden"], (h) => {
 *     // h.getContext("not_found") and h.getContext("forbidden") are both available
 *     if (h.hasId("not_found")) res.status(404).json({ missing: h.getContext("not_found").resource });
 *     if (h.hasId("forbidden")) res.status(403).json({ denied: true });
 *   }),
 *
 *   // Fallback: any other err_feature error
 *   forDomain(err_feature, (h) => res.status(500).json({ error: h.message })),
 * ]);
 * ```
 */
export function forIds<
  DEF extends INiceErrorDefinedProps,
  IDS extends ReadonlyArray<keyof DEF["schema"] & string>,
>(
  domain: NiceErrorDefined<DEF>,
  ids: IDS,
  handler: (error: NiceErrorHydrated<DEF, IDS[number]>) => void | Promise<void>,
): IErrorCase<DEF, IDS[number]> {
  return { _domain: domain, _ids: ids, _handler: handler };
}
