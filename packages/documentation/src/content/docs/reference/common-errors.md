---
title: "@nice-code/common-errors — API reference"
description: The full public surface of @nice-code/common-errors.
tableOfContents:
  maxHeadingLevel: 4
---

Shared error domains for Standard Schema validation and Hono integration.

## Install

```bash
bun add @nice-code/common-errors
```

---

## `err_validation`

A `NiceErrorDomain` (child of `err_nice`) for Standard Schema validation failures.

```ts
import { err_validation, EValidator } from "@nice-code/common-errors"
```

### Domain

- `domain`: `"err_validation"`
- `defaultHttpStatusCode`: `400` (BAD_REQUEST)
- Parent: `err_nice`

### Schema

| ID | Context | Description |
|---|---|---|
| `EValidator.standard_schema` | `{ issues: StandardSchemaV1.Issue[] }` | Validation error from any Standard Schema-compatible validator. |

### Usage

```ts
import { err_validation, EValidator } from "@nice-code/common-errors"

const error = err_validation.fromId(EValidator.standard_schema, {
  issues: [{ message: "Invalid email", path: [{ key: "email" }] }],
})

error.message  // "Invalid email" (extracted from the first issue)
error.httpStatusCode  // 400
```

---

## `EValidator`

```ts
enum EValidator {
  standard_schema = "standard_schema",
}
```

---

## `extractMessageFromStandardSchema({ issues })`

Extract a human-readable message from Standard Schema issues. Returns the message from the first issue, or a fallback string.

```ts
import { extractMessageFromStandardSchema } from "@nice-code/common-errors"

const message = extractMessageFromStandardSchema({ issues: validationResult.issues })
```

---

## Hono integration

```ts
import { niceSValidator, niceCatchSValidation } from "@nice-code/common-errors/hono"
```

### `niceSValidator(target, schema)`

Drop-in replacement for Hono's `validator` middleware that throws `err_validation` on failure instead of returning a plain 400.

```ts
import { Hono } from "hono"
import * as v from "valibot"
import { niceSValidator } from "@nice-code/common-errors/hono"

const app = new Hono()

app.post(
  "/users",
  niceSValidator("json", v.object({
    name: v.string(),
    email: v.pipe(v.string(), v.email()),
  })),
  (c) => {
    const { name, email } = c.req.valid("json")  // fully typed
    return c.json({ name, email })
  }
)
```

### `niceCatchSValidation()`

Middleware that catches `err_validation` errors and returns a 400 JSON response. Apply it at the app or route level:

```ts
app.use(niceCatchSValidation())
```

Or handle manually with the error handler:

```ts
import { castNiceError, forDomain } from "@nice-code/error"
import { err_validation } from "@nice-code/common-errors"

app.onError((e, c) => {
  const error = castNiceError(e)
  return error.handleWithSync([
    forDomain(err_validation, (h) => c.json({ error: h.message }, 400)),
  ]) ?? c.json({ error: "Internal error" }, 500)
})
```

---

## Extending the validation domain

```ts
import { err_validation } from "@nice-code/common-errors"
import { err, EErrorPackType } from "@nice-code/error"

const err_user_input = err_validation.createChildDomain({
  domain: "err_user_input",
  schema: {
    missing_required_field: err<{ field: string }>({
      message: ({ field }) => `Field "${field}" is required`,
      context: { required: true },
    }),
  },
})

// err_validation.isThisOrChild(err_user_input.fromId("missing_required_field", { field: "email" }))
// → true
```
