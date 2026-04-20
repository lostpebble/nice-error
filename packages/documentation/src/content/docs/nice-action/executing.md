---
title: Executing actions
description: How to run actions — from execute() to executeSafe() and the full response cycle.
---

Once a domain has a requester or resolver registered, actions can be executed from anywhere that has access to the domain object.

## `execute` — throw on failure

```ts
// Throws if the action fails
const user = await user_domain.action("getUser").execute({ userId: "u1" })
```

Returns the raw output type. Throws if the resolver/handler throws.

## `executeSafe` — result discriminated union

```ts
const result = await user_domain.action("getUser").executeSafe({ userId: "u1" })

if (result.ok) {
  console.log(result.output.name)  // typed as the action's output type
} else {
  result.error.handleWithSync([
    forId(err_user, "not_found", (h) => {
      console.error("User not found:", h.getContext("not_found").userId)
    }),
    forDomain(err_auth, (h) => console.error("Auth error:", h.message)),
  ])
}
```

`NiceActionResult` is `{ ok: true; output: OUT } | { ok: false; error: ERR }`.

## `primeAction` — shorthand

```ts
// Equivalent to user_domain.action("getUser").prime({ userId: "u1" })
const primed = user_domain.primeAction("getUser", { userId: "u1" })
```

## Targeting named environments

When multiple execution environments share a domain (e.g. a worker and a main thread):

```ts
// Register a handler under a specific envId
user_domain.setActionRequester({ envId: "worker" }).forDomain(user_domain, workerHandler)
user_domain.setActionRequester({ envId: "local"  }).forDomain(user_domain, localHandler)

// Target specific environment at execute time
const result = await user_domain.action("getUser").execute({ userId: "u1" }, "worker")
```

## The full lifecycle

1. **`action("id")`** — get a `NiceAction` for the action ID
2. **`.prime(input)`** — pair the action with input, creating a `NiceActionPrimed`
3. **`.execute(envId?)`** — dispatch through the registered requester or responder
4. On success: returns the raw output
5. On failure: throws (or returns `{ ok: false, error }` via `executeSafe`)

Internally, before dispatch, the domain validates the input against the schema. An invalid input throws `action_input_validation_failed`.

## Minimum setup

The simplest complete setup uses a resolver directly on the domain:

```ts
import { createActionDomain, action, createDomainResolver } from "@nice-code/action"
import * as v from "valibot"

const user_domain = createActionDomain({
  domain: "user_domain",
  actions: {
    getUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .output({ schema: v.object({ id: v.string(), name: v.string() }) }),
  },
})

user_domain.registerResponder(
  createDomainResolver(user_domain)
    .resolveAction("getUser", async ({ userId }) => {
      return db.findUser(userId)
    })
)

const user = await user_domain.action("getUser").execute({ userId: "u1" })
```

For cross-process execution (HTTP, workers), see [Requesters](/nice-action/requesters/) and [Resolvers](/nice-action/resolvers/).
