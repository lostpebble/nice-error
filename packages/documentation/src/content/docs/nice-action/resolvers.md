---
title: Resolvers
description: Implement action handlers on the server with createDomainResolver.
---

A **resolver** is the server-side implementation of actions. It receives deserialized input, runs the logic, and returns the output (or throws a typed error).

## `createDomainResolver`

```ts
import { createDomainResolver } from "@nice-code/action"
import { err_user } from "./errors"

const userResolver = createDomainResolver(user_domain)
  .resolveAction("getUser", async ({ userId }) => {
    const user = await db.findUser(userId)
    if (!user) throw err_user.fromId("not_found", { userId })
    return user
  })
  .resolveAction("deleteUser", async ({ userId }) => {
    await db.deleteUser(userId)
  })
  .resolveAction("listUsers", async ({ limit, cursor }) => {
    return db.listUsers({ limit, cursor })
  })
```

`resolveAction` is type-checked against the domain: the input is typed from the schema, and the return type must match the output schema.

## Register on the domain

### Local execution (same process)

Register the resolver directly on the domain — no separate requester needed:

```ts
user_domain.registerResponder(userResolver)

// Now execute() works without any HTTP or wire transport
const user = await user_domain.action("getUser").execute({ userId: "u1" })
```

### Cross-process execution (server side)

Use `createResponderEnvironment` to handle serialized actions from the wire:

```ts
import { createResponderEnvironment } from "@nice-code/action"

const env = createResponderEnvironment([
  createDomainResolver(user_domain)
    .resolveAction("getUser",   ({ userId })  => db.findUser(userId))
    .resolveAction("deleteUser", ({ userId }) => db.deleteUser(userId)),

  createDomainResolver(billing_domain)
    .resolveAction("chargeCard", ({ amount }) => stripe.charge(amount)),
])

// In your HTTP handler (any framework)
app.post("/api/actions", async (req, res) => {
  const responseWire = await env.dispatch(req.body)
  res.json(responseWire)
})
```

`env.dispatch(wire)` hydrates the primed action from the wire, finds the matching resolver by domain, runs it, and returns a serialized `TNiceActionResponse_JsonObject`.

## Complete round-trip example

**Client (requester):**
```ts
user_domain.setActionRequester().forDomain(user_domain, async (act) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    body: act.toJsonString(),
    headers: { "Content-Type": "application/json" },
  })
  return act.processResponse(await res.json())
})

const user = await user_domain.action("getUser").execute({ userId: "u1" })
```

**Server (resolver environment):**
```ts
const env = createResponderEnvironment([
  createDomainResolver(user_domain)
    .resolveAction("getUser", ({ userId }) => db.findUser(userId)),
])

app.post("/api/actions", async (req, res) => {
  res.json(await env.dispatch(req.body))
})
```

## Named environments

Pass `options.envId` to register the resolver under a named environment:

```ts
user_domain.registerResponder(userResolver, { envId: "local" })

// Target at execute time:
await user_domain.action("getUser").execute({ userId: "u1" }, "local")
```

## Error handling in resolvers

Throw errors normally — they're caught and wrapped automatically:

```ts
.resolveAction("getUser", async ({ userId }) => {
  const user = await db.findUser(userId)
  if (!user) throw err_user.fromId("not_found", { userId })  // typed error
  if (!user.active) throw err_user.fromId("unauthorized")    // another typed error
  return user
})
```

Any error thrown (including plain `Error` instances) propagates through `executeSafe` as `{ ok: false, error }` via `castNiceError`.
