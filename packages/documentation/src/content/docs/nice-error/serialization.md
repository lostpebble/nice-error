---
title: Serialization
description: Send errors across the wire, reconstruct them fully typed on the other side.
---

A nice-code error survives serialization. Call `toJsonObject()` on the way out, `castNiceError()` on the way in — the same domain, IDs, context, and `httpStatusCode` come back on the other side.

## On the server

```ts title="server.ts"
import { castNiceError } from "@nice-code/error"

try {
  await handler(req)
} catch (e) {
  const error = castNiceError(e)
  return new Response(error.toJsonString(), {
    status: error.httpStatusCode,
    headers: { "Content-Type": "application/json" },
  })
}
```

`toJsonString()` produces a JSON string. `toJsonObject()` returns the plain object (useful for structured-clone, workers, or logging).

`toHttpResponse()` is a shorthand that wraps `toJsonString()` in a `Response` with the right status and Content-Type header.

## On the client

```ts title="client.ts"
import { castNiceError } from "@nice-code/error"
import { err_billing } from "./errors"

const res = await fetch("/api/charge")
if (!res.ok) {
  const error = castNiceError(await res.json())

  error.handleWithSync([
    forDomain(err_billing, (h) => {
      toast(`Billing error: ${h.message}`)
    }),
  ])
}
```

`castNiceError` accepts any value — an `Error`, a string, `null`, a JSON object, even a packed error — and always returns a `NiceError`. It never throws.

## Wire format

The serialized form is a plain JSON object:

```json
{
  "name": "NiceError",
  "def": { "domain": "err_billing", "allDomains": ["err_billing"] },
  "ids": ["payment_failed"],
  "errorData": {
    "payment_failed": {
      "contextState": { "kind": "serde_unset", "value": { "reason": "card declined" } },
      "message": "Payment failed: card declined",
      "httpStatusCode": 402,
      "timeAdded": 1700000000000
    }
  },
  "message": "Payment failed: card declined",
  "httpStatusCode": 402,
  "wasntNice": false,
  "timeCreated": 1700000000000
}
```

## Domain + hydration after transport

After receiving the serialized error via `castNiceError`, use `isExact` + `hydrate` to get full typed access:

```ts
const error = castNiceError(responseBody)

if (err_billing.isExact(error)) {
  const hydrated = err_billing.hydrate(error)

  if (hydrated.hasId("payment_failed")) {
    // hydrated.getContext("payment_failed") is typed: { reason: string }
    toast(`Payment failed: ${hydrated.getContext("payment_failed").reason}`)
  }
}
```

`castAndHydrate` is a one-step shorthand:

```ts
import { castAndHydrate } from "@nice-code/error"

const hydrated = castAndHydrate(responseBody, err_billing)
// null if responseBody is not from err_billing
if (hydrated) {
  // fully typed, all methods available
}
```

## Custom serialization for non-JSON context

When context contains types like `Date` or `Buffer`, add `context.serialization` to the schema entry. On the receiving side, call `domain.hydrate(error)` to invoke `fromJsonSerializable` and reconstruct the typed context:

```ts
const error = castNiceError(wire)

if (err_order.isExact(error)) {
  // hydrate() calls fromJsonSerializable on any "unhydrated" context
  const hydrated = err_order.hydrate(error)

  if (hydrated.hasId("already_shipped")) {
    hydrated.getContext("already_shipped").shippedAt  // Date — fully reconstructed
  }
}
```

Without calling `hydrate()`, accessing context for an entry with custom serialization throws with a clear message explaining why.

## `isNiceErrorObject`

Check whether an unknown value looks like a serialized `NiceError` before processing it:

```ts
import { isNiceErrorObject } from "@nice-code/error"

if (isNiceErrorObject(responseBody)) {
  const error = castNiceError(responseBody)
  // …
}
```
