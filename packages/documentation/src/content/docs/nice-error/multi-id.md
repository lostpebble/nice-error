---
title: Multi-ID errors
description: Combine multiple error IDs into a single error instance.
---

A `NiceError` can carry **multiple active IDs** at once — useful for compound failure states where more than one thing went wrong simultaneously.

## Creating multi-ID errors

### `fromContext` — multiple IDs at construction time

```ts
const error = err_billing.fromContext({
  payment_failed:     { reason: "card declined" },
  insufficient_funds: undefined,
})

error.getIds()    // ["payment_failed", "insufficient_funds"]
error.hasMultiple // true
```

The object keys become the active IDs. Pass `undefined` for IDs with no context.

### `addId` — chain onto an existing error

```ts
const error = err_billing
  .fromId("payment_failed", { reason: "network timeout" })
  .addId("card_expired")

error.getIds()    // ["payment_failed", "card_expired"]
error.hasMultiple // true
```

### `addContext` — add multiple IDs to an existing error

```ts
const error = err_billing
  .fromId("payment_failed", { reason: "decline" })
  .addContext({ card_expired: undefined, insufficient_funds: undefined })

error.getIds()  // ["payment_failed", "card_expired", "insufficient_funds"]
```

## Accessing context on multi-ID errors

Use `hasId` to narrow before calling `getContext`:

```ts
if (error.hasId("payment_failed")) {
  const { reason } = error.getContext("payment_failed")  // typed: { reason: string }
}
```

`hasOneOfIds` narrows to a subset:

```ts
if (error.hasOneOfIds(["card_expired", "insufficient_funds"])) {
  // ACTIVE_IDS narrowed to "card_expired" | "insufficient_funds"
}
```

## Matching multi-ID errors in handlers

`forDomain` fires once for the whole error — use `hasId` / `hasOneOfIds` inside to branch:

```ts
error.handleWithSync([
  forDomain(err_billing, (h) => {
    if (h.hasId("payment_failed")) {
      res.status(402).json({ reason: h.getContext("payment_failed").reason })
    } else {
      res.status(402).json({ error: h.message })
    }
  }),
])
```

`forIds` fires when **at least one** of the given IDs is active:

```ts
error.handleWithSync([
  forIds(err_billing, ["card_expired", "insufficient_funds"], (h) => {
    res.status(402).json({ error: "Card problem" })
  }),
  forId(err_billing, "payment_failed", (h) => {
    res.status(402).json({ reason: h.getContext("payment_failed").reason })
  }),
])
```

## Comparing errors

`error.matches(other)` returns `true` if both errors have the same domain and the same set of active IDs (order-independent). Context values are not compared.

```ts
const a = err_auth.fromId("invalid_credentials", { username: "alice" })
const b = err_auth.fromId("invalid_credentials", { username: "bob" })
a.matches(b)  // true — same domain + same id set, different context

const c = err_auth.fromId("account_locked")
a.matches(c)  // false — same domain, different id
```

## Survival across the wire

Multi-ID errors serialize and deserialize cleanly:

```ts
const original = err_billing.fromContext({
  payment_failed: { reason: "decline" },
  card_expired: undefined,
})

const wire = original.toJsonObject()
const restored = castNiceError(JSON.parse(JSON.stringify(wire)))

// forIds still fires correctly on the restored error
restored.handleWithSync([
  forIds(err_billing, ["card_expired", "insufficient_funds"], (h) => { /* … */ }),
])
```
