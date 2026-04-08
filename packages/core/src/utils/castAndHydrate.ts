import { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDefinedProps } from "../NiceError/NiceError.types";
import { NiceErrorExtendable } from "../NiceError/NiceErrorExtendable";
import type { NiceErrorDefined } from "../NiceErrorDefined/NiceErrorDefined";
import { castNiceError } from "./castNiceError";

/**
 * Combines `castNiceError`, `is()`, and `hydrate()` in a single call — the
 * idiomatic way to handle an unknown value arriving from a remote boundary
 * (API response, message queue, IPC, etc.) when you have a specific domain in mind.
 *
 * - Casts `value` to a `NiceError` using `castNiceError`.
 * - If the result belongs to `niceErrorDefined`'s domain (`is()` returns `true`),
 *   hydrates it and returns a fully-typed `NiceErrorExtendable`.
 * - Otherwise returns the raw cast `NiceError` (which may be a `wasntNice` error
 *   if `value` was not a NiceError at all).
 *
 * @example
 * ```ts
 * // In an Express error handler:
 * app.use((err, req, res, next) => {
 *   const error = castAndHydrate(err, err_user_auth);
 *
 *   if (err_user_auth.is(error)) {
 *     // error is NiceErrorExtendable — getContext / addId available
 *     const result = matchFirst(error, {
 *       invalid_credentials: ({ username }) => res.status(401).json({ username }),
 *       account_locked:      ()             => res.status(403).json({ locked: true }),
 *     });
 *     if (result) return;
 *   }
 *
 *   next(err);
 * });
 * ```
 */
export function castAndHydrate<ERR_DEF extends INiceErrorDefinedProps>(
  value: unknown,
  niceErrorDefined: NiceErrorDefined<ERR_DEF>,
): NiceErrorExtendable<ERR_DEF, keyof ERR_DEF["schema"]> | NiceError {
  const casted = castNiceError(value);
  if (niceErrorDefined.is(casted)) {
    return niceErrorDefined.hydrate(casted);
  }
  return casted;
}
