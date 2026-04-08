import type { INiceErrorContextDefinition, INiceErrorIdMetadata } from "../NiceError/NiceError.types";

/**
 * Schema entry factory — the idiomatic way to define a single error id in a
 * `NiceErrorDefined` schema.
 *
 * Using `err()` instead of writing schema entries as plain object literals
 * ensures TypeScript resolves the context argument as **required** vs **optional**
 * correctly in `fromId` / `addId` call sites.
 *
 * How `required` affects the call site:
 *
 * | Schema entry                       | `fromId("id")` | `fromId("id", ctx)` |
 * |------------------------------------|----------------|---------------------|
 * | `err()`  /  `err({ ... })`         | ✓              | ✗ (no context)      |
 * | `err<C>({ context: {} })`          | ✓              | ✓ (optional ctx)    |
 * | `err<C>({ context: { required: true } })` | ✗     | ✓ (required ctx)    |
 *
 * @example
 * ```ts
 * // No context — `fromId("not_found")` takes no second argument.
 * not_found: err({ message: "Resource not found", httpStatusCode: 404 }),
 *
 * // Optional context — second arg accepted but not required.
 * rate_limited: err<{ retryAfter: number }>({
 *   message: (ctx) => ctx ? `Retry after ${ctx.retryAfter}s` : "Rate limited",
 *   httpStatusCode: 429,
 *   context: {},
 * }),
 *
 * // Required context — `fromId("invalid_input", { field: "email" })` (second arg is required).
 * invalid_input: err<{ field: string }>({
 *   message: ({ field }) => `Invalid value for field: ${field}`,
 *   httpStatusCode: 422,
 *   context: { required: true },
 * }),
 *
 * // Required context with custom serialization (for non-JSON-safe context values).
 * fs_error: err<{ cause: NodeJS.ErrnoException }>({
 *   message: ({ cause }) => `File system error: ${cause.message}`,
 *   context: {
 *     required: true,
 *     serialization: {
 *       toJsonSerializable: ({ cause }) => ({ code: cause.code, message: cause.message }),
 *       fromJsonSerializable: (obj) => ({ cause: Object.assign(new Error(obj.message), obj) }),
 *     },
 *   },
 * }),
 * ```
 */

// Overload 1: context.required: true → the context argument will be **required** in fromId/addId.
export function err<C>(
  meta: INiceErrorIdMetadata<C> & {
    context: INiceErrorContextDefinition<C> & { required: true };
  },
): INiceErrorIdMetadata<C> & { context: { required: true } };

// Overload 2: everything else (no context, or optional context) → context arg is optional/absent.
export function err<C = never>(meta?: INiceErrorIdMetadata<C>): INiceErrorIdMetadata<C>;

// Implementation (not part of the public overload surface).
export function err<C = never>(
  meta?: INiceErrorIdMetadata<C>,
): INiceErrorIdMetadata<C> {
  return meta ?? ({} as INiceErrorIdMetadata<C>);
}
