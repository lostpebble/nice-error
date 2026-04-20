---
title: Recipes
description: Real-world patterns for combining nice-code with common stacks.
---

## HTTP error handler (any framework)

```ts
import { castNiceError, forDomain } from "@nice-code/error"
import { err_billing, err_auth } from "./errors"

async function handleRequest(req: Request): Promise<Response> {
  try {
    return await myHandler(req)
  } catch (e) {
    const error = castNiceError(e)
    return error.handleWithSync([
      forDomain(err_auth,    (h) => new Response(h.message, { status: 401 })),
      forDomain(err_billing, (h) => new Response(h.message, { status: h.httpStatusCode })),
    ]) ?? error.toHttpResponse()
  }
}
```

## Action + resolver (same process)

```ts
import { createActionDomain, action, createDomainResolver } from "@nice-code/action"
import * as v from "valibot"

const user_domain = createActionDomain({
  domain: "user_domain",
  actions: {
    getUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .output({ schema: v.object({ id: v.string(), name: v.string() }) })
      .throws(err_user, ["not_found"] as const),
  },
})

user_domain.registerResponder(
  createDomainResolver(user_domain)
    .resolveAction("getUser", async ({ userId }) => {
      const user = await db.findUser(userId)
      if (!user) throw err_user.fromId("not_found", { userId })
      return user
    })
)

const result = await user_domain.action("getUser").executeSafe({ userId: "u1" })
```

## Action over HTTP (client + server)

**Client:**
```ts
user_domain.setActionRequester().forDomain(user_domain, async (act) => {
  const res = await fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: act.toJsonString(),
  })
  return act.processResponse(await res.json())
})
```

**Server (Hono example):**
```ts
import { Hono } from "hono"
import { createResponderEnvironment, createDomainResolver } from "@nice-code/action"

const env = createResponderEnvironment([
  createDomainResolver(user_domain)
    .resolveAction("getUser", ({ userId }) => db.findUser(userId)),
])

const app = new Hono()
app.post("/api/actions", async (c) => {
  const wire = await c.req.json()
  const responseWire = await env.dispatch(wire)
  return c.json(responseWire)
})
```

## With React Query

```ts
import { useQuery, useMutation } from "@tanstack/react-query"
import { castNiceError, forId, forDomain } from "@nice-code/error"

export const useGetUser = (userId: string) =>
  useQuery({
    queryKey: ["user", userId],
    queryFn: () => user_domain.action("getUser").execute({ userId }),
  })

export const useDeleteUser = () =>
  useMutation({
    mutationFn: (userId: string) => user_domain.action("deleteUser").execute({ userId }),
    onError: (e) => {
      const error = castNiceError(e)
      error.handleWithSync([
        forId(err_user, "not_found", (h) => toast(`User not found`)),
        forDomain(err_auth, (h) => router.push("/login")),
      ])
    },
  })
```

## Hono + @nice-code/common-errors validation

```ts
import { Hono } from "hono"
import * as v from "valibot"
import { niceSValidator } from "@nice-code/common-errors/hono"
import { castNiceError, forDomain } from "@nice-code/error"
import { err_validation } from "@nice-code/common-errors"

const app = new Hono()

app.post(
  "/user",
  niceSValidator("json", v.object({ name: v.string(), email: v.string() })),
  async (c) => {
    const { name, email } = c.req.valid("json")
    return c.json({ name, email })
  }
)

// Catch validation errors and return 400
app.onError((e, c) => {
  const error = castNiceError(e)
  return error.handleWithSync([
    forDomain(err_validation, (h) => c.json({ error: h.message }, 400)),
  ]) ?? c.json({ error: "Internal error" }, 500)
})
```

## Domain hierarchy for centralized error handling

```ts
const err_app = defineNiceError({ domain: "err_app", schema: {} })
const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    unauthorized: err({ message: "Unauthorized", httpStatusCode: 401 }),
    forbidden:    err({ message: "Forbidden",    httpStatusCode: 403 }),
  },
})
const err_billing = err_app.createChildDomain({
  domain: "err_billing",
  defaultHttpStatusCode: 402,
  schema: { payment_failed: err<{ reason: string }>({ message: ({ reason }) => reason, context: { required: true } }) },
})

// Broad catch — works for any app domain error
const error = castNiceError(caught)
if (err_app.isThisOrChild(error)) {
  return new Response(error.message, { status: error.httpStatusCode })
}
```

## Cloudflare Durable Object boundary (packing)

```ts
import { EErrorPackType } from "@nice-code/error"

const err_durable = defineNiceError({ domain: "err_durable", schema: {
  op_failed: err<{ reason: string }>({ message: ({ reason }) => reason, context: { required: true } }),
} })

// Pack at domain level — all errors are automatically packed into message
err_durable.packAs(EErrorPackType.msg_pack)

// Inside a Durable Object method:
throw err_durable.fromId("op_failed", { reason: "lock contention" })

// Caller (stub boundary):
try {
  await stub.doWork()
} catch (e) {
  const error = castNiceError(e)  // automatically unpacks
  error.handleWithSync([
    forDomain(err_durable, (h) => h.message),
  ])
}
```

## Custom serialization round-trip

```ts
const err_order = defineNiceError({
  domain: "err_order",
  schema: {
    shipped: err<{ orderId: string; shippedAt: Date }>({
      message: ({ orderId }) => `Order ${orderId} shipped`,
      context: {
        required: true,
        serialization: {
          toJsonSerializable: ({ orderId, shippedAt }) => ({ orderId, shippedAt: shippedAt.toISOString() }),
          fromJsonSerializable: ({ orderId, shippedAt }) => ({ orderId, shippedAt: new Date(shippedAt) }),
        },
      },
    }),
  },
})

// After receiving from the wire:
const error = castNiceError(await res.json())
if (err_order.isExact(error)) {
  const hydrated = err_order.hydrate(error)  // runs fromJsonSerializable
  if (hydrated.hasId("shipped")) {
    hydrated.getContext("shipped").shippedAt  // Date — fully restored
  }
}
```
