---
title: Action domains
description: Declare a set of typed server actions with typed input, output, and errors.
---

An **action domain** is a group of named actions that share a domain namespace. Each action declares its input schema, output schema, and which errors it can throw.

```ts
import { createActionDomain, action } from "@nice-code/action"
import * as v from "valibot"
import { err_user, err_auth } from "./errors"

export const user_domain = createActionDomain({
  domain: "user_domain",
  actions: {
    getUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .output({ schema: v.object({ id: v.string(), name: v.string(), email: v.string() }) })
      .throws(err_user, ["not_found", "forbidden"] as const),

    deleteUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .throws(err_user)
      .throws(err_auth),

    listUsers: action()
      .input({ schema: v.object({ limit: v.number(), cursor: v.optional(v.string()) }) })
      .output({ schema: v.object({ items: v.array(v.object({ id: v.string(), name: v.string() })), nextCursor: v.optional(v.string()) }) }),
  },
})
```

## The `action()` builder

`action()` starts building an action schema. Chain methods to declare its signature:

### `.input({ schema })`

Declares the input schema using any [Standard Schema](https://standardschema.dev)-compatible validator (Valibot, Zod, etc.):

```ts
action().input({ schema: v.object({ userId: v.string() }) })
```

### `.output({ schema })`

Declares the output schema. Optional — actions without an output schema return `void`:

```ts
action().output({ schema: v.object({ id: v.string(), name: v.string() }) })
```

### `.throws(errDomain, ids?)`

Declares which errors this action can throw. Can be chained multiple times for multiple domains:

```ts
action()
  .throws(err_user, ["not_found", "forbidden"] as const)  // specific IDs
  .throws(err_auth)                                        // all IDs in err_auth
```

`ids` is optional — omit it to allow all IDs from that domain.

### Custom serialization

When input or output types aren't JSON-safe (e.g. `Date`):

```ts
action().input({
  schema: v.object({ scheduledAt: v.date() }),
  serialization: {
    serialize:   ({ scheduledAt }) => ({ iso: scheduledAt.toISOString() }),
    deserialize: (s: { iso: string }) => ({ scheduledAt: new Date(s.iso) }),
  },
})
```

The handler always receives the deserialized value. The wire carries the serialized form.

## Domain properties

```ts
user_domain.domain     // "user_domain"
user_domain.allDomains // ["user_domain"] (or more if created via createChildDomain)
user_domain.actions    // { getUser: NiceActionSchema, … }
```

## Child domains

```ts
const root_domain = createActionDomain({ domain: "root", actions: { ping: action() } })
const child_domain = root_domain.createChildDomain({
  domain: "child.users",
  actions: { getUser: action().input({ schema: v.object({ id: v.string() }) }) },
})
```

## Naming conventions

- **Domain**: snake_case with `_domain` suffix. `user_domain`, `billing_domain`.
- **Action ID**: camelCase, verb-first. `getUser`, `deleteUser`, `listInvoices`.
