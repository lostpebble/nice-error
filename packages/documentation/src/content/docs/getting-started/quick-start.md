---
title: Quick start
description: Install, define your first error domain, and throw a typed error in under two minutes.
---

## Install

```bash
# bun
bun add @nice-code/error @nice-code/action

# npm
npm i @nice-code/error @nice-code/action

# pnpm
pnpm add @nice-code/error @nice-code/action
```

Both packages are standalone. Install only what you need.

## Your first error domain

```ts title="errors.ts"
import { defineNiceError, err } from "@nice-code/error"

export const err_user = defineNiceError({
  domain: "err_user",
  schema: {
    not_found: err<{ userId: string }>({
      message: ({ userId }) => `User ${userId} not found`,
      httpStatusCode: 404,
      context: { required: true },
    }),
    email_taken: err<{ email: string }>({
      message: ({ email }) => `Email ${email} is already taken`,
      httpStatusCode: 409,
      context: { required: true },
    }),
    unauthorized: err({
      message: "Unauthorized",
      httpStatusCode: 401,
    }),
  },
})
```

`defineNiceError` takes a `domain` name and a `schema` mapping error IDs to their metadata. Each entry uses `err()` to declare the message, HTTP status code, and optional typed context.

## Throw it

```ts title="lookup.ts"
import { err_user } from "./errors"

export function getUser(userId: string) {
  const user = users.find((u) => u.id === userId)
  if (!user) {
    throw err_user.fromId("not_found", { userId })
  }
  return user
}
```

## Catch it — typed

```ts title="handler.ts"
import { castNiceError, forDomain, forId } from "@nice-code/error"
import { err_user } from "./errors"

try {
  getUser(req.params.id)
} catch (e) {
  const error = castNiceError(e)
  const handled = error.handleWithSync([
    forId(err_user, "not_found", (h) => {
      // h.getContext("not_found") is fully typed: { userId: string }
      return Response.json({ userId: h.getContext("not_found").userId }, { status: 404 })
    }),
    forDomain(err_user, (h) => {
      return Response.json({ error: h.message }, { status: h.httpStatusCode })
    }),
  ])
  if (!handled) throw e
}
```

## Send it across the wire

```ts title="server.ts"
catch (e) {
  const error = castNiceError(e)
  return new Response(error.toJsonString(), {
    status: error.httpStatusCode,
    headers: { "Content-Type": "application/json" },
  })
}
```

```ts title="client.ts"
import { castNiceError } from "@nice-code/error"
import { err_user } from "./errors"

const res = await fetch("/api/user/42")
if (!res.ok) {
  const error = castNiceError(await res.json())
  if (err_user.isExact(error)) {
    const hydrated = err_user.hydrate(error)
    if (hydrated.hasId("not_found")) {
      // Fully typed again on the client
      console.log("User not found:", hydrated.getContext("not_found").userId)
    }
  }
}
```

That's the whole library, in miniature.

## Next

- [Error domains](/nice-error/domains/) — full domain API
- [Handling errors](/nice-error/handling/) — pattern matching
- [Serialization](/nice-error/serialization/) — wire transport
- [Wire format](/nice-action/wire-format/) — how actions serialize
