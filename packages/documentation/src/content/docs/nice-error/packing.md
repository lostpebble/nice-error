---
title: Packing
description: Embed a serialized error into error.message or error.cause for opaque boundary crossing.
---

Some runtimes only propagate `error.message` across boundaries — Cloudflare Durable Objects being a common example. **Packing** embeds the full serialized error into `message` (or `cause`) so it survives the crossing.

## Pack modes

```ts
import { EErrorPackType } from "@nice-code/error"

// msg_pack (default) — embeds JSON into error.message
throw error.pack()
throw error.pack(EErrorPackType.msg_pack)

// cause_pack — embeds JSON into error.cause
throw error.pack(EErrorPackType.cause_pack)
```

## Automatic unpack on `castNiceError`

On the receiving side, `castNiceError` inspects `error.message` and `error.cause` and unpacks automatically:

```ts
// Server or receiving side
try {
  await durableObject.doWork()
} catch (e) {
  // castNiceError detects the packed JSON and restores the full NiceError
  const error = castNiceError(e)
  error.handleWithSync([
    forDomain(err_billing, (h) => { /* … */ }),
  ])
}
```

No explicit `unpack()` call is needed when going through `castNiceError`.

## Domain-level default

Set a pack strategy once on the domain so every error it creates is automatically packed:

```ts
import { EErrorPackType } from "@nice-code/error"

const err_durable = defineNiceError({
  domain: "err_durable",
  schema: {
    op_failed: err({ message: "Operation failed" }),
  },
})

err_durable.packAs(EErrorPackType.msg_pack)

// Now every fromId / fromContext call packs automatically:
throw err_durable.fromId("op_failed")  // message already contains packed JSON
```

## Checking pack state

```ts
error.isPacked         // boolean
error.unpack()         // restore the original message / cause (returns this)
```

## When to use packing

- Cloudflare Durable Objects (only `message` propagates across stubs)
- Any environment where `Error` objects are re-constructed and non-standard properties are lost
- Worker boundaries that only serialize the `message` field

When using a normal HTTP transport with `toJsonObject()` / `castNiceError()`, packing is not needed — use the standard serialization path instead.
