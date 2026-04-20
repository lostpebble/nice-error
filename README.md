# nice-code

Two packages for making errors and actions first-class citizens in TypeScript:

- **`@nice-code/error`** — typed, serializable errors with domain hierarchies, pattern matching, and safe transport across API boundaries
- **`@nice-code/action`** — typed request/response actions with schema validation, custom serialization, and pluggable dispatch

---

## Install

```bash
bun add @nice-code/error
bun add @nice-code/action   # also installs @nice-code/error
```

---

## @nice-code/error

### Define an error domain

```ts
import { defineNiceError, err } from "@nice-code/error";

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

### Create and use errors

```ts
const error = err_billing.fromId("payment_failed", { reason: "card declined" });

error.message;        // "Payment failed: card declined"
error.httpStatusCode; // 402

// Type-safe context access
const { reason } = error.getContext("payment_failed");

// Type guards narrow active IDs
if (error.hasId("payment_failed")) {
  error.getContext("payment_failed").reason; // string — TS knows this is active
}

if (error.hasOneOfIds(["card_expired", "insufficient_funds"])) {
  // narrowed to those two IDs
}
```

### Multi-ID errors

```ts
// Create with multiple IDs at once
const error = err_billing.fromContext({
  payment_failed: { reason: "retry limit" },
  card_expired: undefined,
});

error.getIds();    // ["payment_failed", "card_expired"]
error.hasMultiple; // true

// Or chain onto an existing error
const error2 = err_billing
  .fromId("payment_failed", { reason: "network timeout" })
  .addId("card_expired");
```

### Domain hierarchy

```ts
const err_app = defineNiceError({ domain: "err_app", schema: {} });

const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    unauthorized: err({ message: "Unauthorized", httpStatusCode: 401 }),
  },
});

err_app.isParentOf(err_auth);      // true
err_auth.isExact(error);           // exact domain match
err_app.isThisOrChild(error);      // true — ancestry check
```

### Serialization across API boundaries

```ts
// Server — serialize and send
const error = err_order.fromId("out_of_stock", { sku });
return Response.json(error.toJsonObject(), { status: error.httpStatusCode });

// Client — cast and narrow
import { castNiceError, castAndHydrate } from "@nice-code/error";

const body = await res.json();
const error = castNiceError(body);       // handles Error, string, null, JSON — always returns NiceError

if (err_order.isExact(error)) {
  error.getContext("out_of_stock").sku;  // string — fully typed after hydration
}

// One-step cast + domain check
const error = castAndHydrate(caughtValue, err_order);
```

### Error handling and pattern matching

```ts
import { forDomain, forIds } from "@nice-code/error";

// Route to first matching case
const handled = error.handleWithSync([
  forIds(err_billing, ["payment_failed"], (h) => {
    const { reason } = h.getContext("payment_failed");
    res.status(402).json({ reason });
  }),
  forDomain(err_billing, (h) => res.status(h.httpStatusCode).json({ error: h.message })),
  forDomain(err_auth, (h) => res.status(401).json({ error: "Unauthorized" })),
]);

if (!handled) next(error);

// Async variant — awaits the handler's returned Promise
await error.handleWithAsync([
  forDomain(err_billing, async (h) => {
    await db.logFailedPayment(h);
  }),
]);

// Pattern-match by ID
import { matchFirst } from "@nice-code/error";

const message = matchFirst(error, {
  payment_failed: ({ reason }) => `Payment failed: ${reason}`,
  card_expired:   ()           => "Your card has expired",
  _:              ()           => "A billing error occurred",
});
```

### Error packing for opaque transports

Some runtimes (Cloudflare Durable Objects, etc.) only propagate `error.message`. Packing embeds the full serialized error into `message` so it survives the crossing.

```ts
// Throw — packs into message field
throw error.pack();               // msg_pack (default)
throw error.pack("cause_pack");   // packs into error.cause instead

// Receive — castNiceError unpacks automatically
const error = castNiceError(caught);

// Set domain-level default
import { EErrorPackType } from "@nice-code/error";
err_durable.packAs(EErrorPackType.msg_pack);
```

---

## @nice-code/action

Actions are typed request/response pairs — define input/output schemas, register a handler, execute anywhere. They serialize cleanly across RPC, HTTP, or worker boundaries.

### Define an action domain

```ts
import { createActionDomain, action } from "@nice-code/action";
import * as v from "valibot";

const user_domain = createActionDomain({
  domain: "user_domain",
  actions: {
    getUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .output({ schema: v.object({ id: v.string(), name: v.string() }) })
      .throws(err_user, ["not_found", "forbidden"] as const),

    deleteUser: action()
      .input({ schema: v.object({ userId: v.string() }) })
      .throws(err_user),
  },
});
```

### Execute actions (requester pattern)

Register a handler then call `execute`. The handler receives the primed action with fully-typed input.

```ts
user_domain.setActionRequester().forDomain(user_domain, (act) => {
  const getUser = user_domain.matchAction(act, "getUser");
  if (getUser) {
    return db.findUser(getUser.input.userId);  // input is typed
  }
});

const user = await user_domain.action("getUser").execute({ userId: "u1" });

// Safe variant — returns { ok: true, output } | { ok: false, error }
const result = await user_domain.action("getUser").executeSafe({ userId: "u1" });
if (result.ok) {
  console.log(result.output.name);
} else {
  result.error.handleWithSync([
    forDomain(err_user, (h) => console.error(h.message)),
  ]);
}
```

### Target specific action IDs

```ts
user_domain.setActionRequester()
  .forActionId(user_domain, "getUser", (act) => {
    return db.findUser(act.input.userId);
  })
  .forActionId(user_domain, "deleteUser", (act) => {
    return db.deleteUser(act.input.userId);
  });
```

### Resolver pattern (local execution)

Use `createDomainResolver` when the handler lives in the same process — no separate requester needed.

```ts
import { createDomainResolver } from "@nice-code/action";

user_domain.registerResponder(
  createDomainResolver(user_domain)
    .resolveAction("getUser", ({ userId }) => db.findUser(userId))
    .resolveAction("deleteUser", ({ userId }) => db.deleteUser(userId)),
);

// execute() now works without a separate requester
const user = await user_domain.action("getUser").execute({ userId: "u1" });
```

### Custom serialization

When input/output types aren't plain JSON (e.g. `Date`), attach serialize/deserialize hooks:

```ts
const schedule_domain = createActionDomain({
  domain: "schedule_domain",
  actions: {
    schedule: action().input({
      schema: v.object({ at: v.date() }),
      serialization: {
        serialize:   ({ at }) => ({ iso: at.toISOString() }),
        deserialize: (s: { iso: string }) => ({ at: new Date(s.iso) }),
      },
    }),
  },
});
```

The handler always receives the deserialized value (a proper `Date`), not the wire string.

### Responder environments (cross-process dispatch)

Send serialized actions across a wire and dispatch them on the other side:

```ts
import { createDomainResolver, createResponderEnvironment } from "@nice-code/action";

// Server side — register resolvers in an environment
const env = createResponderEnvironment([
  createDomainResolver(user_domain)
    .resolveAction("getUser", ({ userId }) => db.findUser(userId))
    .resolveAction("deleteUser", ({ userId }) => db.deleteUser(userId)),
]);

// Receive a primed action JSON object and dispatch it
const wireResponse = await env.dispatch(primedActionJson);

// Client side — hydrate the response back
const response = user_domain.hydrateResponse(wireResponse);
if (response.result.ok) {
  response.result.output; // typed output
}
```

### Wire format

```ts
// Prime an action with input — ready to serialize
const primed = user_domain.action("getUser").prime({ userId: "u1" });

// Serialize for transport
const wire = primed.toJsonObject();   // plain object
const json = primed.toJsonString();   // JSON string

// Hydrate on the receiving side
const hydrated = user_domain.hydratePrimed(wire);
const result = await hydrated.executeSafe();
```

### Action listeners

Observe every dispatch without modifying behavior:

```ts
user_domain.addActionListener((primed) => {
  console.log(`Action dispatched: ${primed.coreAction.id}`);
});
```

### Child domains

```ts
const root = createActionDomain({ domain: "root", actions: { ping: action()... } });
const child = root.createChildDomain({ domain: "child.users", actions: { ... } });
```

---

## API reference

### @nice-code/error

| Export | Description |
|---|---|
| `defineNiceError(opts)` | Create a root error domain |
| `err<C>(meta?)` | Define a schema entry with optional context type |
| `NiceErrorDomain.createChildDomain(opts)` | Create a child domain |
| `NiceErrorDomain.fromId(id, ctx?)` | Create a single-ID error |
| `NiceErrorDomain.fromContext(map)` | Create a multi-ID error |
| `NiceErrorDomain.hydrate(error)` | Re-hydrate a cast NiceError |
| `NiceErrorDomain.isExact(err)` | Type guard — exact domain match |
| `NiceErrorDomain.isThisOrChild(err)` | Ancestry check |
| `NiceErrorDomain.isParentOf(target)` | Check if domain is parent of another |
| `NiceErrorDomain.packAs(type)` | Set default pack strategy for domain |
| `NiceError.hasId(id)` | Type guard — narrows to single ID |
| `NiceError.hasOneOfIds(ids)` | Type guard — narrows to subset of IDs |
| `NiceError.getContext(id)` | Typed context for an active ID |
| `NiceError.getIds()` | List all active IDs |
| `NiceError.addId(id, ctx?)` | Return new error with additional ID |
| `NiceError.addContext(map)` | Return new error with additional IDs |
| `NiceError.matches(other)` | Compare domain + ID fingerprint |
| `NiceError.withOriginError(err)` | Attach underlying cause error |
| `NiceError.toJsonObject()` | Serialize to plain JSON |
| `NiceError.pack(type?)` | Pack for opaque boundary crossing |
| `NiceError.unpack()` | Restore from packed state |
| `NiceError.handleWithSync(cases, opts?)` | Dispatch to first matching case (sync) |
| `NiceError.handleWithAsync(cases, opts?)` | Dispatch to first matching case (async) |
| `NiceErrorHandler` | Reusable handler with chainable `.forDomain()`, `.forId()`, `.forIds()`, `.setDefaultHandler()` |
| `forDomain(domain, handler)` | Case matching any ID in a domain |
| `forId(domain, id, handler)` | Case matching a specific single ID |
| `forIds(domain, ids, handler)` | Case matching specific IDs |
| `matchFirst(error, handlers)` | Pattern-match an error by ID |
| `castNiceError(value)` | Cast any value to a NiceError |
| `castAndHydrate(value, domain)` | Cast + domain check + hydrate |
| `isNiceErrorObject(value)` | Type guard for serialized NiceError JSON |
| `InferNiceError<T>` | Infer NiceError type from a NiceErrorDomain instance |
| `InferNiceErrorHydrated<T>` | Infer NiceErrorHydrated type from a NiceErrorDomain instance |

### @nice-code/action

| Export | Description |
|---|---|
| `createActionDomain(opts)` | Create a root action domain |
| `action()` | Start building an action schema |
| `NiceActionSchema.input(opts)` | Declare input schema + optional serde |
| `NiceActionSchema.output(opts)` | Declare output schema + optional serde |
| `NiceActionSchema.throws(errDef, ids?)` | Declare possible error types |
| `NiceActionDomain.action(id)` | Get a NiceAction by ID |
| `NiceActionDomain.primeAction(id, input)` | Shorthand for action(id).prime(input) |
| `NiceActionDomain.setActionRequester()` | Register a dispatch handler |
| `NiceActionDomain.registerResponder(resolver, opts?)` | Register a domain resolver |
| `NiceActionDomain.addActionListener(fn)` | Register an observer callback |
| `NiceActionDomain.hydratePrimed(wire)` | Deserialize a primed action |
| `NiceActionDomain.hydrateResponse(wire)` | Deserialize a response |
| `NiceActionDomain.createChildDomain(opts)` | Create a nested domain |
| `NiceActionDomain.matchAction(act, id)` | Narrow a primed action to specific ID |
| `NiceAction.execute(input, envId?)` | Execute and return raw output |
| `NiceAction.executeSafe(input, envId?)` | Execute returning `NiceActionResult` |
| `NiceAction.prime(input)` | Create NiceActionPrimed |
| `NiceActionPrimed.execute(envId?)` | Execute stored action |
| `NiceActionPrimed.executeSafe(envId?)` | Execute storing result |
| `NiceActionPrimed.toJsonObject()` | Serialize to wire format |
| `NiceActionPrimed.toJsonString()` | Serialize to JSON string |
| `NiceActionPrimed.processResponse(wire)` | Deserialize response; throws if `ok: false`, returns output if `ok: true` |
| `NiceActionRequester.setDefaultHandler(handler)` | Fallback handler when no case matched |
| `createDomainResolver(domain)` | Create a resolver for a domain |
| `NiceActionDomainResponder.resolveAction(id, fn)` | Register a resolver function |
| `createResponderEnvironment(resolvers)` | Create a multi-domain responder |
| `NiceActionResponderEnvironment.dispatch(wire)` | Deserialize + execute + serialize |
| `NiceActionRequester.forDomain(domain, handler)` | Register handler for whole domain |
| `NiceActionRequester.forActionId(domain, id, handler)` | Register handler for specific ID |
| `NiceActionRequester.forActionIds(domain, ids, handler)` | Register handler for multiple IDs |
| `TInferActionError<SCH>` | Extract full error union from action schema |
| `TInferInputFromSchema<SCH>` | Extract input types from action schema |
| `TInferOutputFromSchema<SCH>` | Extract output types from action schema |

---

## @nice-code/common-errors

Shared error domains for use across both packages.

### Install

```bash
bun add @nice-code/common-errors
```

### Validation errors

```ts
import { err_validation, EValidator } from "@nice-code/common-errors";

// err_validation is a child domain of err_nice (the root)
// It has one schema entry: EValidator.standard_schema
// Default httpStatusCode: 400 BAD_REQUEST

const error = err_validation.fromId(EValidator.standard_schema, { issues: [...] });
```

### Hono integration

```ts
import { niceSValidator, niceCatchSValidation } from "@nice-code/common-errors/hono";
import * as v from "valibot";

// Drop-in replacement for Hono's `validator` that throws err_validation on failure
app.post("/user", niceSValidator("json", v.object({ name: v.string() })), (c) => {
  const { name } = c.req.valid("json");
  return c.json({ name });
});
```

`niceCatchSValidation` is middleware that catches `err_validation` errors and returns a 400 response.

### Extending validation in your own error domain

```ts
import { err_validation } from "@nice-code/common-errors";

const err_user = err_validation.createChildDomain({
  domain: "err_user",
  schema: {
    not_found: err({ message: "User not found", httpStatusCode: 404 }),
  },
});
```

---

## License

MIT
