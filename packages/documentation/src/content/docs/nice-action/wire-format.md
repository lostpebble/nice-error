---
title: Wire format
description: The exact shape of primed actions and responses on the wire.
---

nice-code uses plain JSON objects for transport. Serialize with `toJsonObject()` / `toJsonString()`, reconstruct with `domain.hydratePrimed()` / `domain.hydrateResponse()`.

## Primed action (client → server)

```json
{
  "type": "primed",
  "domain": "user_domain",
  "allDomains": ["user_domain"],
  "id": "getUser",
  "cuid": "V1StGXR8Z5jdHi6B",
  "timeCreated": 1700000000000,
  "input": { "userId": "u1" },
  "timePrimed": 1700000001000
}
```

Fields:

| Field | Type | Notes |
|---|---|---|
| `type` | `"primed"` | Discriminant for the wire format. |
| `domain` | `string` | Must match a registered resolver. |
| `allDomains` | `string[]` | Full ancestry chain. |
| `id` | `string` | Action ID — must exist in the domain. |
| `cuid` | `string` | Unique correlation ID (nanoid). |
| `timeCreated` | `number` | Unix ms when the action was created. |
| `input` | `object` | Serialized via the schema's `serialize` function (or as-is). |
| `timePrimed` | `number` | Unix ms when `prime()` was called. |

## Response (server → client)

**Success:**
```json
{
  "type": "response",
  "domain": "user_domain",
  "allDomains": ["user_domain"],
  "id": "getUser",
  "cuid": "V1StGXR8Z5jdHi6B",
  "timeCreated": 1700000000000,
  "input": { "userId": "u1" },
  "timePrimed": 1700000001000,
  "timeResponded": 1700000002000,
  "ok": true,
  "output": { "id": "u1", "name": "Alice" }
}
```

**Failure:**
```json
{
  "type": "response",
  "domain": "user_domain",
  "allDomains": ["user_domain"],
  "id": "getUser",
  "cuid": "V1StGXR8Z5jdHi6B",
  "timeCreated": 1700000000000,
  "input": { "userId": "u1" },
  "timePrimed": 1700000001000,
  "timeResponded": 1700000002000,
  "ok": false,
  "error": {
    "name": "NiceError",
    "def": { "domain": "err_user", "allDomains": ["err_user"] },
    "ids": ["not_found"],
    "errorData": { "not_found": { /* … */ } },
    "message": "User u1 not found",
    "httpStatusCode": 404,
    "wasntNice": false,
    "timeCreated": 1700000002000
  }
}
```

## Serialization and transport

```ts
// Client side — create and serialize
const primed = user_domain.action("getUser").prime({ userId: "u1" })
const wire = primed.toJsonObject()    // plain object
const json = primed.toJsonString()    // JSON string

// Server side — hydrate and dispatch
const action = user_domain.hydratePrimed(wire)
const result = await action.executeSafe()

// Server side — or use createResponderEnvironment for full automation
const responseWire = await env.dispatch(wire)  // dispatch returns TNiceActionResponse_JsonObject

// Client side — process the response
const output = primed.processResponse(responseWire)  // throws if ok: false, returns output if ok: true

// Or hydrate manually
const response = user_domain.hydrateResponse(responseWire)
if (response.result.ok) {
  response.result.output  // typed output
}
```

## Custom input/output serialization

When input or output types are not JSON-safe, attach serialize/deserialize hooks on the schema:

```ts
action().input({
  schema: v.object({ scheduledAt: v.date() }),
  serialization: {
    serialize:   ({ scheduledAt }) => ({ iso: scheduledAt.toISOString() }),
    deserialize: (s: { iso: string }) => ({ scheduledAt: new Date(s.iso) }),
  },
})
```

The `input` field in the wire format carries the `serialize` result. The resolver receives the `deserialize` result.

## `isPrimedActionJsonObject` / `isActionResponseJsonObject`

Check the shape of an unknown object before hydrating:

```ts
import { isPrimedActionJsonObject, isActionResponseJsonObject } from "@nice-code/action"

if (isPrimedActionJsonObject(body)) {
  const primed = user_domain.hydratePrimed(body)
}

if (isActionResponseJsonObject(body)) {
  const response = user_domain.hydrateResponse(body)
}
```
