---
title: Domain hierarchy
description: Compose domains into parent/child relationships and check ancestry.
---

Error domains can be organized into **parent/child relationships** using `createChildDomain`.

```ts
import { defineNiceError, err } from "@nice-code/error"

const err_app = defineNiceError({ domain: "err_app", schema: {} })

const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    unauthorized:    err({ message: "Unauthorized",   httpStatusCode: 401 }),
    session_expired: err({ message: "Session expired", httpStatusCode: 401 }),
    forbidden:       err({ message: "Forbidden",       httpStatusCode: 403 }),
  },
})

const err_billing = err_app.createChildDomain({
  domain: "err_billing",
  defaultHttpStatusCode: 402,
  schema: {
    payment_failed: err<{ reason: string }>({
      message: ({ reason }) => `Payment failed: ${reason}`,
      context: { required: true },
    }),
    card_expired: err({ message: "Card has expired" }),
  },
})
```

`createChildDomain` registers `err_auth` and `err_billing` as children of `err_app`. Each child's `allDomains` array includes both its own domain and all ancestors.

## Checking ancestry

```ts
err_app.isParentOf(err_auth)          // true  — err_app is in err_auth's ancestors
err_app.isParentOf(err_billing)       // true
err_auth.isParentOf(err_billing)      // false — siblings

const error = err_auth.fromId("unauthorized")

err_auth.isExact(error)               // true  — exact match
err_auth.isThisOrChild(error)         // true  — this.domain is in error.def.allDomains
err_app.isThisOrChild(error)          // true  — err_app is an ancestor of err_auth
err_billing.isThisOrChild(error)      // false — err_billing is a sibling, not an ancestor

err_app.isParentOf(error)             // true  — err_app is in error's allDomains
```

## Using hierarchy for broad matching

`forDomain` in handlers uses exact domain matching — it only fires for errors from that specific domain. To match across a domain family, use `isThisOrChild` in a guard:

```ts
import { castNiceError } from "@nice-code/error"

const error = castNiceError(caught)

// Match any err_app child error
if (err_app.isThisOrChild(error)) {
  res.status(error.httpStatusCode).json({ error: error.message })
  return
}
```

Or route each domain explicitly:

```ts
error.handleWithSync([
  forDomain(err_auth,    (h) => res.status(401).json({ error: h.message })),
  forDomain(err_billing, (h) => res.status(402).json({ error: h.message })),
])
```

## Multi-level hierarchy

Ancestry is transitive — `createChildDomain` can be called on any existing domain:

```ts
const err_app    = defineNiceError({ domain: "err_app",    schema: {} })
const err_auth   = err_app.createChildDomain({ domain: "err_auth",   schema: {} })
const err_sso    = err_auth.createChildDomain({ domain: "err_sso",   schema: { saml_failed: err({ message: "SAML failed" }) } })

const error = err_sso.fromId("saml_failed")

err_auth.isThisOrChild(error)   // true — err_auth is an ancestor of err_sso
err_app.isThisOrChild(error)    // true — err_app is an ancestor of err_auth which is an ancestor of err_sso
```

## Pack strategy inheritance

When you call `.packAs()` on a parent domain, child domains created afterwards inherit that pack strategy:

```ts
const err_durable = defineNiceError({ domain: "err_durable", schema: {} })
err_durable.packAs(EErrorPackType.msg_pack)

// Children created after packAs is set inherit the pack type
const err_durable_auth = err_durable.createChildDomain({ domain: "err_durable_auth", schema: { ... } })
```

## When to use hierarchy

- Grouping all application errors under a single root for broad `isThisOrChild` checks.
- Mapping app errors to transport concerns (`err_http` parent with HTTP status codes).
- Sharing `defaultHttpStatusCode` or `packAs` configuration across a family of domains.
