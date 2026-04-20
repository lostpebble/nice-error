---
title: Errors in actions
description: How @nice-code/error and @nice-code/action work together across the wire.
---

Action schemas declare which error domains they can throw via `.throws()`. This declaration does two things:

1. Documents what errors callers need to handle.
2. Types the `error` field of `NiceActionResult` when using `executeSafe`.

```ts
const shipOrder_action = action()
  .input({ schema: v.object({ orderId: v.string() }) })
  .output({ schema: v.object({ trackingId: v.string() }) })
  .throws(err_order, ["not_found", "already_shipped", "payment_required"] as const)
  .throws(err_inventory)
```

## Typed error result

When you call `executeSafe`, the `error` union is typed from the `.throws()` declarations:

```ts
const result = await user_domain.action("shipOrder").executeSafe({ orderId: "ord-1" })

if (!result.ok) {
  result.error.handleWithSync([
    forId(err_order, "not_found", (h) => {
      res.status(404).json({ orderId: h.getContext("not_found").orderId })
    }),
    forId(err_order, "payment_required", (h) => {
      res.status(402).json({ error: "Payment required" })
    }),
    forDomain(err_inventory, (h) => {
      res.status(409).json({ error: h.message })
    }),
  ])
}
```

## Throwing in a resolver

Resolvers (and requester handlers) throw errors normally. The error flows through `executeSafe` as `{ ok: false, error }`:

```ts
user_domain.registerResponder(
  createDomainResolver(user_domain)
    .resolveAction("getUser", async ({ userId }) => {
      const user = await db.findUser(userId)
      if (!user) throw err_user.fromId("not_found", { userId })
      return user
    })
)
```

If the resolver throws an error that was **not** declared via `.throws()`, it still propagates — `castNiceError` wraps it when it reaches `executeSafe`, so `result.error` is always a `NiceError`. The TypeScript type just won't be specific.

## Cross-domain errors

You can declare errors from multiple domains:

```ts
const charge_action = action()
  .throws(err_billing, ["payment_failed", "card_expired"] as const)
  .throws(err_auth)    // unauthorized errors from auth domain
  .throws(err_validation)  // from @nice-code/common-errors
```

## `err_nice_action` — internal action errors

The action system itself throws typed errors for programming mistakes:

```ts
import { err_nice_action, EErrId_NiceAction } from "@nice-code/action"

// Thrown when action ID doesn't exist in the domain
err_nice_action.fromId(EErrId_NiceAction.action_id_not_in_domain, { domain, actionId })

// Thrown when no handler or resolver is registered
err_nice_action.fromId(EErrId_NiceAction.domain_no_handler, { domain })

// Thrown when wire action state doesn't match
err_nice_action.fromId(EErrId_NiceAction.hydration_action_state_mismatch, { expected, received })
```

These propagate as normal errors and can be caught with `castNiceError`.
