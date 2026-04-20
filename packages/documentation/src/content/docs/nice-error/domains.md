---
title: Error domains
description: Declare a family of typed errors once, with shared identity.
---

An **error domain** is a namespace of related error IDs declared in a single call.

```ts
import { defineNiceError, err } from "@nice-code/error"

export const err_auth = defineNiceError({
  domain: "err_auth",
  schema: {
    unauthorized:    err({ message: "Unauthorized", httpStatusCode: 401 }),
    session_expired: err<{ expiredAt: Date }>({
      message: ({ expiredAt }) => `Session expired at ${expiredAt.toISOString()}`,
      httpStatusCode: 401,
      context: { required: true },
    }),
    forbidden:    err({ message: "Forbidden", httpStatusCode: 403 }),
    rate_limited: err<{ retryAfter: number }>({
      message: (ctx) => ctx ? `Retry after ${ctx.retryAfter}s` : "Rate limited",
      httpStatusCode: 429,
      context: {},
    }),
  },
})
```

The `domain` string is the namespace — two domains can declare the same error ID (`not_found`) without colliding. The `schema` maps error IDs to their metadata.

## The `err()` helper

`err<C>(meta?)` declares a single schema entry:

| Option | Type | Description |
|---|---|---|
| `message` | `string \| (ctx: C) => string` | Error message. |
| `httpStatusCode` | `number \| (ctx: C) => number` | HTTP status code. Defaults to domain's `defaultHttpStatusCode` or 500. |
| `context` | `{}` | Mark context as present but optional at the call site. |
| `context.required` | `true` | Require context — `fromId("id", ctx)` is mandatory. |
| `context.serialization` | `{ toJsonSerializable, fromJsonSerializable }` | Custom serde for non-JSON-safe context (e.g. `Date`, `Buffer`). |

## Creating errors

```ts
// No context — second arg omitted
const error = err_auth.fromId("unauthorized")

// Required context — second arg required at compile time
const error2 = err_auth.fromId("session_expired", { expiredAt: new Date() })

// Optional context — second arg optional
const error3 = err_auth.fromId("rate_limited")
const error4 = err_auth.fromId("rate_limited", { retryAfter: 30 })
```

### Context `required` semantics

| Schema entry | `fromId("id")` | `fromId("id", ctx)` |
|---|---|---|
| `err()` or `err({ message: "..." })` | ✓ | ✗ context not declared |
| `err<C>({ context: {} })` | ✓ or omit | ✓ optional |
| `err<C>({ context: { required: true } })` | ✗ | ✓ required |

## Instance properties

```ts
const error = err_auth.fromId("unauthorized")

error.message        // "Unauthorized" — standard Error.message
error.httpStatusCode // 401
error.hasMultiple    // false (single ID)
error.wasntNice      // false (set to true for non-nice values cast via castNiceError)
error.timeCreated    // number (unix ms)
```

## Type guards

```ts
// Narrow to a specific ID
if (error.hasId("session_expired")) {
  error.getContext("session_expired").expiredAt  // Date — typed
}

// Narrow to a subset of IDs
if (error.hasOneOfIds(["unauthorized", "forbidden"])) {
  // error.getContext() narrows to union of those IDs' context types
}
```

## Custom serialization

When context contains values that don't survive `JSON.stringify` (e.g. `Date`, `Buffer`):

```ts
const err_order = defineNiceError({
  domain: "err_order",
  schema: {
    already_shipped: err<{ orderId: string; shippedAt: Date }>({
      message: ({ orderId }) => `Order ${orderId} already shipped`,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ orderId, shippedAt }) => ({
            orderId,
            shippedAt: shippedAt.toISOString(),
          }),
          fromJsonSerializable: ({ orderId, shippedAt }) => ({
            orderId,
            shippedAt: new Date(shippedAt),
          }),
        },
      },
    }),
  },
})
```

After deserializing from JSON, call `domain.hydrate(error)` to invoke `fromJsonSerializable` and restore the typed context.

## Domain-level defaults

```ts
const err_billing = defineNiceError({
  domain: "err_billing",
  defaultHttpStatusCode: 402,  // fallback for entries with no httpStatusCode
  defaultMessage: "A billing error occurred",
  schema: {
    payment_failed: err<{ reason: string }>({
      message: ({ reason }) => `Payment failed: ${reason}`,
      // inherits defaultHttpStatusCode: 402
    }),
  },
})
```

## Naming conventions

- **Domain**: `err_` prefix, snake_case. Reflects the bounded context: `err_auth`, `err_billing`, `err_graph_ingest`.
- **Error ID**: snake_case. Reads descriptively: `not_found`, `already_exists`, `rate_limited`.
