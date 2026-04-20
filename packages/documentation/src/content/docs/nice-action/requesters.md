---
title: Requesters
description: Register a dispatch handler that sends actions to a remote resolver.
---

A **requester** is the client-side dispatch layer. It receives a primed action and is responsible for sending it somewhere — over HTTP, to a worker, via postMessage, etc. — and returning the output.

## Register a requester

```ts
user_domain.setActionRequester().forDomain(user_domain, async (act) => {
  const wire = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: act.toJsonString(),
  }).then((r) => r.json())

  return act.processResponse(wire)
})
```

`setActionRequester()` returns a `NiceActionRequester`. Chain `.forDomain()`, `.forActionId()`, or `.forActionIds()` to register handlers.

`act.processResponse(wire)` deserializes the response JSON, throws the error if `ok: false`, and returns the typed output if `ok: true`.

## Routing options

### `forDomain` — handle all actions in the domain

```ts
domain.setActionRequester().forDomain(domain, async (act) => {
  // act.input is typed as the union of all action input types
  const wire = await sendToServer(act.toJsonObject())
  return act.processResponse(wire)
})
```

### `forActionId` — handle one specific action

```ts
domain.setActionRequester()
  .forActionId(domain, "getUser", async (act) => {
    // act.input is typed as { userId: string }
    return db.findUser(act.input.userId)
  })
  .forActionId(domain, "deleteUser", async (act) => {
    return db.deleteUser(act.input.userId)
  })
```

### `forActionIds` — handle a subset of actions

```ts
domain.setActionRequester()
  .forActionIds(domain, ["getUser", "listUsers"] as const, async (act) => {
    // act.input is typed as the union of getUser and listUsers input types
    return db.query(act.input)
  })
```

### `setDefaultHandler` — fallback

```ts
domain.setActionRequester()
  .forActionId(domain, "getUser", async (act) => { /* … */ })
  .setDefaultHandler(async (act) => {
    // Fires for any action not matched by a prior case
    return sendToServer(act.toJsonObject()).then((r) => act.processResponse(r))
  })
```

## HTTP transport pattern

The most common setup — send the primed action as JSON, receive a response JSON:

```ts
user_domain.setActionRequester().forDomain(user_domain, async (act) => {
  const res = await fetch("/api/user-actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: act.toJsonString(),
  })
  const wire = await res.json()
  return act.processResponse(wire)  // throws if wire.ok === false
})
```

## Using `matchAction` for type-narrowing

Inside a `forDomain` handler, use `domain.matchAction` to narrow to a specific action:

```ts
domain.setActionRequester().forDomain(domain, async (act) => {
  const getUser = domain.matchAction(act, "getUser")
  if (getUser) {
    // getUser.input is typed as { userId: string }
    return db.findUser(getUser.input.userId)
  }

  const deleteUser = domain.matchAction(act, "deleteUser")
  if (deleteUser) {
    return db.deleteUser(deleteUser.input.userId)
  }
})
```

## Named environments

Register multiple requesters under different `envId`s for multi-environment setups:

```ts
user_domain.setActionRequester({ envId: "remote" }).forDomain(user_domain, remoteHandler)
user_domain.setActionRequester({ envId: "local"  }).forDomain(user_domain, localHandler)

// Target at execute time:
await user_domain.action("getUser").execute({ userId: "u1" }, "remote")
await user_domain.action("getUser").execute({ userId: "u1" }, "local")
```

Throws `environment_already_registered` if you call `setActionRequester` twice with the same `envId`.
