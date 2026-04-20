---
title: Handling & matching
description: Idiomatic patterns for catching, narrowing, and handling nice-code errors.
---

## Pattern matching with `handleWithSync`

Route an error to the first matching case. Cases are evaluated in order — first match wins, rest are skipped.

```ts
import { castNiceError, forDomain, forId, forIds } from "@nice-code/error"

const error = castNiceError(caught)

const handled = error.handleWithSync([
  forId(err_billing, "payment_failed", (h) => {
    const { reason } = h.getContext("payment_failed")
    res.status(402).json({ reason })
  }),
  forIds(err_billing, ["card_expired", "insufficient_funds"], (h) => {
    res.status(402).json({ error: h.message })
  }),
  forDomain(err_auth, (h) => res.status(401).json({ error: "Unauthorized" })),
])

if (!handled) next(error)
```

`handleWithSync` returns the handler's return value, or `undefined` if no case matched.

## Case builders

| Function | Matches when… |
|---|---|
| `forDomain(domain, handler)` | Error's domain exactly matches `domain` |
| `forId(domain, id, handler)` | Domain matches and error has the given ID active |
| `forIds(domain, ids, handler)` | Domain matches and at least one of `ids` is active |

All three hydrate the error before passing it to the handler — `getContext`, `addId`, and `addContext` are all available inside.

## Async handlers

Use `handleWithAsync` when handlers perform async work:

```ts
const handled = await error.handleWithAsync([
  forDomain(err_payments, async (h) => {
    await db.logFailedPayment(h)
    await notifyOps(h.message)
  }),
])
```

`handleWithAsync` awaits the handler's returned Promise before resolving.

## `NiceErrorHandler` class

For reusable routing logic, build a `NiceErrorHandler` instance and pass it directly:

```ts
import { NiceErrorHandler } from "@nice-code/error"

const appErrorHandler = new NiceErrorHandler()
  .forDomain(err_billing, (h) => res.status(h.httpStatusCode).json({ error: h.message }))
  .forDomain(err_auth,    (h) => res.status(401).json({ error: "Unauthorized" }))
  .setDefaultHandler((h) => res.status(500).json({ error: "Internal error" }))

// Reuse the same handler for multiple errors
error1.handleWithSync(appErrorHandler)
error2.handleWithSync(appErrorHandler)
```

`setDefaultHandler` fires when no `forDomain` / `forId` / `forIds` case matched.

## `throwOnUnhandled` option

Throw the original error when nothing matched:

```ts
error.handleWithSync([
  forDomain(err_billing, (h) => { /* … */ }),
], { throwOnUnhandled: true })
```

## `matchFirst` — inline value mapping

Map an error to a return value by ID, without building a full handler:

```ts
import { matchFirst } from "@nice-code/error"

const message = matchFirst(error, {
  payment_failed:  ({ reason }) => `Payment failed: ${reason}`,
  card_expired:    ()           => "Your card has expired",
  _:               ()           => "A billing error occurred",
})
```

`_` is the fallback — runs when no ID-specific handler matched. Returns `undefined` if neither the handlers nor fallback fire.

## Manual ID checks

For simple branching without handler machinery:

```ts
const error = castNiceError(caught)

if (err_billing.isExact(error)) {
  const hydrated = err_billing.hydrate(error)

  if (hydrated.hasId("payment_failed")) {
    const { reason } = hydrated.getContext("payment_failed")
    // reason is typed as string
  }

  if (hydrated.hasOneOfIds(["card_expired", "insufficient_funds"])) {
    // narrowed to those two IDs
  }
}
```

## The full pipeline with `executeSafe`

```ts
const result = await domain.action("chargeCard").executeSafe({ amount: 500 })

if (!result.ok) {
  result.error.handleWithSync([
    forId(err_billing, "payment_failed", (h) => {
      showError(h.getContext("payment_failed").reason)
    }),
    forDomain(err_billing, (h) => showError(h.message)),
  ])
  return
}

console.log(result.output)
```

## Anti-patterns

- **Don't match on `e.message`.** Messages are human-readable and may change.
- **Don't catch raw `Error`.** Use `castNiceError(e)` to get a typed `NiceError` before routing.
