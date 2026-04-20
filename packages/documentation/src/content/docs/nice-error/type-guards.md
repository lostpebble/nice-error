---
title: Type guards
description: The type guards nice-code provides, and when to use each.
---

nice-code exposes type guards at several levels. Pick the narrowest one you need.

## 1. Is it from a specific domain?

```ts
err_billing.isExact(error)
```

Returns `true` if `error` is a `NiceError` whose domain exactly matches `err_billing`. After the guard, TypeScript knows the error is from that domain — use `hydrate` to get full typed access.

```ts
if (err_billing.isExact(error)) {
  const hydrated = err_billing.hydrate(error)
  // hydrated.getContext, addId, addContext all available
}
```

## 2. Is it from this domain or a child?

```ts
err_app.isThisOrChild(error)
```

Returns `true` if the error's domain is `err_app` OR any domain that was created via `err_app.createChildDomain(...)`. Useful for broad matching across a domain family.

```ts
if (err_app.isThisOrChild(error)) {
  res.status(error.httpStatusCode).json({ error: error.message })
}
```

## 3. Is this domain a parent?

```ts
err_app.isParentOf(err_auth)     // NiceErrorDomain
err_app.isParentOf(someError)    // NiceError instance
```

Returns `true` if `err_app` appears in the target's ancestry chain. Useful for checking relationships between domain definitions at runtime.

## 4. Narrow to a specific ID

```ts
error.hasId("payment_failed")
```

Returns `true` if this error has `"payment_failed"` as an active ID. After the guard, `error.getContext("payment_failed")` is typed.

```ts
if (error.hasId("payment_failed")) {
  const { reason } = error.getContext("payment_failed")  // string — typed
}
```

## 5. Narrow to a subset of IDs

```ts
error.hasOneOfIds(["card_expired", "insufficient_funds"])
```

Returns `true` if the error has at least one of the given IDs active. `ACTIVE_IDS` narrows to the matching subset.

```ts
if (error.hasOneOfIds(["card_expired", "insufficient_funds"])) {
  res.status(402).json({ error: error.message })
}
```

## 6. Is it a serialized NiceError JSON?

```ts
import { isNiceErrorObject } from "@nice-code/error"

isNiceErrorObject(value)
```

Returns `true` if `value` looks like a serialized `NiceError` plain object (has the expected `name`, `def`, `ids` fields). Useful before calling `castNiceError` on untrusted input.

## In handlers

Inside `forDomain` / `forId` / `forIds` handlers, the error is already hydrated — use `hasId` and `getContext` freely:

```ts
error.handleWithSync([
  forDomain(err_billing, (h) => {
    if (h.hasId("payment_failed")) {
      const { reason } = h.getContext("payment_failed")
      return res.status(402).json({ reason })
    }
    return res.status(h.httpStatusCode).json({ error: h.message })
  }),
])
```

## `castNiceError` — catch-all

```ts
import { castNiceError } from "@nice-code/error"

const error = castNiceError(unknownValue)
```

Accepts any value and always returns a `NiceError`. Handles:
- A `NiceError` instance — returned as-is
- A serialized `NiceError` JSON object — reconstructed
- A packed error (msg_pack / cause_pack) — unpacked automatically
- A regular `Error` — wrapped with `wasntNice: true`
- Anything else — wrapped with `wasntNice: true`

Never throws.

## `castAndHydrate` — one-step cast + domain check + hydrate

```ts
import { castAndHydrate } from "@nice-code/error"

const hydrated = castAndHydrate(unknownValue, err_billing)
```

Returns a `NiceErrorHydrated` if the value is from `err_billing`, or `null` otherwise. Equivalent to `castNiceError` + `isExact` + `hydrate`, but in one call.
