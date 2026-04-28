# nice-code

A collection of TypeScript libraries for building reliable, type-safe applications.

---

## Packages

### [`@nice-code/error`](packages/nice-error/README.md)

Typed, serializable errors with domain hierarchies and pattern matching.

Most TypeScript apps throw `Error` and catch `unknown` — losing all type information the moment something goes wrong. `@nice-code/error` gives errors a proper type system: domain hierarchies, typed context payloads, HTTP status codes, and serialization that survives an API round-trip.

```typescript
const err_auth = defineNiceError({ domain: "err_auth", schema: {
  invalid_credentials: err<{ username: string }>({
    message: ({ username }) => `Invalid credentials for: ${username}`,
    httpStatusCode: 401,
  }),
  account_locked: err({ message: "Account locked", httpStatusCode: 403 }),
}});

// Throw it
throw err_auth.fromId("invalid_credentials", { username: "paul" });

// Handle it — with full type inference on context
error.handleWithSync([
  forId(err_auth, "invalid_credentials", (e) => {
    const { username } = e.getContext(); // typed: { username: string }
    res.status(401).json({ message: `Wrong password for ${username}` });
  }),
  forDomain(err_auth, () => res.status(401).end()),
]);
```

→ [Full documentation](packages/nice-error/README.md)

---

### [`@nice-code/action`](packages/nice-action/README.md)

A fully-typed action-based RPC framework — define once, run anywhere.

Splitting logic across server, client, and workers means duplicating type definitions and manually wiring serialization. `@nice-code/action` lets you define an action schema once and execute it locally, over HTTP, or over WebSocket — same call site, same types, no glue code.

```typescript
const orderDomain = root.createChildDomain({
  domain: "order",
  actions: {
    placeOrder: action()
      .input({ schema: v.object({ items: v.array(v.string()), total: v.number() }) })
      .output({ schema: v.object({ orderId: v.string() }) })
      .throws(err_payment),
  },
});

// Server: register a handler
handler.forAction(orderDomain, "placeOrder", {
  execution: async (primed) => {
    const order = await db.orders.create(primed.input);
    return primed.setResponse({ orderId: order.id });
  },
});

// Client: same call, goes over HTTP automatically
const result = await orderDomain.action("placeOrder").executeSafe({ items: ["SKU-1"], total: 29.99 });
if (!result.ok) {
  result.error.handleWithSync([
    forId(err_payment, "card_declined", () => showDeclinedUI()),
  ]);
}
```

→ [Full documentation](packages/nice-action/README.md)
