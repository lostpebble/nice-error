# nice-error

Typed, serializable errors for TypeScript. Define error domains with schemas, get autocomplete on IDs, strongly-typed context, and safe serialization across API boundaries.

## Install

```bash
bun add @nice-error/core    # or npm / yarn / pnpm
```

## Quick start

### 1. Define an error domain

```ts
import { defineNiceError, err } from "@nice-error/core";

const err_billing = defineNiceError({
  domain: "err_billing",
  schema: {
    payment_failed: err<{ reason: string }>({
      message: ({ reason }) => `Payment failed: ${reason}`,
      httpStatusCode: 402,
      context: { required: true },
    }),
    card_expired: err({
      message: "Card has expired",
      httpStatusCode: 402,
    }),
    insufficient_funds: err({
      message: "Insufficient funds",
      httpStatusCode: 402,
    }),
  },
});
```

### 2. Create errors

```ts
// Single ID with typed context
const err = err_billing.fromId("payment_failed", { reason: "card declined" });

err.message;        // "Payment failed: card declined"
err.httpStatusCode;  // 402
err.id;              // "payment_failed"
```

### 3. Access context (type-safe)

```ts
// Context is strongly typed — no casts needed
const { reason } = err.getContext("payment_failed");
//      ^? string
```

### 4. Narrow with type guards

```ts
if (err.hasId("payment_failed")) {
  err.getContext("payment_failed").reason; // string — TS knows this ID is active
}

if (err.hasOneOfIds(["card_expired", "insufficient_funds"])) {
  err.id; // "card_expired" | "insufficient_funds"
}
```

## Multi-ID errors

Attach multiple error IDs to a single error with `fromContext` or by chaining `addId` / `addContext`:

```ts
// From multiple IDs at once
const err = err_billing.fromContext({
  payment_failed: { reason: "retry limit" },
  card_expired: undefined,
});

err.getIds();     // ["payment_failed", "card_expired"]
err.hasMultiple;  // true

// Or chain onto an existing error
const err2 = err_billing
  .fromId("payment_failed", { reason: "network timeout" })
  .addId("card_expired");
```

## Domain hierarchy

Child domains inherit their parent's ancestry for `isParentOf` checks:

```ts
const err_app = defineNiceError({ domain: "err_app", schema: {} });

const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    unauthorized: err({ message: "Unauthorized", httpStatusCode: 401 }),
  },
});

err_app.isParentOf(err_auth);  // true

const err = err_auth.fromId("unauthorized");
err_auth.is(err);              // true  — exact domain match
err_app.is(err);               // false — is() is exact, not ancestral
err_app.isParentOf(err);       // true  — ancestry check
```

## Serialization & hydration across API boundaries

Errors serialize to plain JSON and can be safely reconstructed on the other side.

### Server — throw and serialize

```ts
import { defineNiceError, err } from "@nice-error/core";

const err_order = defineNiceError({
  domain: "err_order",
  schema: {
    not_found:    err({ message: "Order not found", httpStatusCode: 404 }),
    out_of_stock: err<{ sku: string }>({
      message: ({ sku }) => `Item ${sku} is out of stock`,
      httpStatusCode: 409,
      context: { required: true },
    }),
  },
});

// In your API handler
function handleOrder(sku: string) {
  const err = err_order.fromId("out_of_stock", { sku });

  return Response.json(err.toJsonObject(), {
    status: err.httpStatusCode, // 409
  });
}
```

### Client — hydrate and narrow

```ts
import { castNiceError, isNiceErrorObject } from "@nice-error/core";

const res = await fetch("/api/order?sku=ABC-123");

if (!res.ok) {
  const body = await res.json();

  // Check if the response is a serialized NiceError
  if (isNiceErrorObject(body)) {
    console.log(body.message);        // "Item ABC-123 is out of stock"
    console.log(body.httpStatusCode);  // 409
    console.log(body.def.domain);      // "err_order"
  }

  // Or cast any unknown value into a NiceError instance
  const err = castNiceError(body);

  // Narrow to a specific domain with full type safety
  if (err_order.is(err)) {
    if (err.hasId("out_of_stock")) {
      err.getContext("out_of_stock").sku; // string — fully typed
    }
  }
}
```

`castNiceError` handles anything you throw at it — `Error`, `string`, `null`, `number`, serialized JSON — and always returns a `NiceError`.

## API reference

| Export | Description |
|---|---|
| `defineNiceError(opts)` | Create a root error domain with a typed schema |
| `err<C>(meta?)` | Define a schema entry; pass context type as generic (e.g. `err<{ reason: string }>({...})`) |
| `NiceErrorDefined.createChildDomain(opts)` | Create a child domain that inherits ancestry |
| `NiceErrorDefined.fromId(id, ctx?)` | Create an error for a single schema ID |
| `NiceErrorDefined.fromContext(map)` | Create a multi-ID error |
| `NiceErrorDefined.is(err)` | Type guard — exact domain match |
| `NiceErrorDefined.isParentOf(target)` | Ancestry check (accepts domain or error) |
| `NiceError.hasId(id)` | Type guard — narrows to a single ID |
| `NiceError.hasOneOfIds(ids)` | Type guard — narrows to a subset of IDs |
| `NiceError.getContext(id)` | Get the typed context for an active ID |
| `NiceError.getIds()` | List all active IDs |
| `NiceError.addId(id, ctx?)` | Return a new error with an additional ID |
| `NiceError.addContext(map)` | Return a new error with additional IDs |
| `NiceError.toJsonObject()` | Serialize to a plain JSON object |
| `castNiceError(value)` | Cast any unknown value to a `NiceError` |
| `isNiceErrorObject(value)` | Type guard for serialized `NiceError` JSON |
| `isRegularErrorJsonObject(value)` | Type guard for serialized `Error` JSON |

## License

MIT
