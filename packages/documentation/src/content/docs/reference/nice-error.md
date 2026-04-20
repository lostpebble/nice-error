---
title: "@nice-code/error — API reference"
description: The full public surface of @nice-code/error.
tableOfContents:
  maxHeadingLevel: 4
---

## `defineNiceError(definition)`

Create a root error domain.

| Param | Type | Description |
|---|---|---|
| `definition.domain` | `string` | Namespace string — e.g. `"err_billing"`. |
| `definition.schema` | `Record<string, INiceErrorIdMetadata>` | Map of error IDs to their metadata. |
| `definition.defaultHttpStatusCode` | `number?` | Fallback HTTP status for entries without one. |
| `definition.defaultMessage` | `string?` | Fallback message for entries without one. |
| `definition.packAs` | `() => EErrorPackType \| void` | Dynamic pack strategy applied to every created error. |

Returns a `NiceErrorDomain`.

---

## `err<C>(meta?)`

Define a single error schema entry.

| Option | Type | Description |
|---|---|---|
| `message` | `string \| (ctx: C) => string` | Error message. |
| `httpStatusCode` | `number \| (ctx: C) => number` | HTTP status code. |
| `context` | `{}` | Marks context as optional at the call site. |
| `context.required` | `true` | Makes context required. |
| `context.serialization.toJsonSerializable` | `(ctx: C) => D` | Serialize non-JSON-safe context. |
| `context.serialization.fromJsonSerializable` | `(d: D) => C` | Deserialize after JSON round-trip. |

Returns `INiceErrorIdMetadata<C>`.

---

## `NiceErrorDomain<ERR_DEF>`

### `NiceErrorDomain#createChildDomain(opts)`

Create a child domain. The child inherits this domain in its `allDomains` ancestry chain.

### `NiceErrorDomain#fromId(id, ctx?)`

Create a `NiceErrorHydrated` with a single active ID. Context argument is required/optional/absent based on the schema entry.

### `NiceErrorDomain#fromContext(map)`

Create a `NiceErrorHydrated` with multiple active IDs. Keys of `map` become the active IDs.

### `NiceErrorDomain#hydrate(error)`

Promote a `NiceError` to a `NiceErrorHydrated`, invoking `fromJsonSerializable` for any context in the `"unhydrated"` state.

### `NiceErrorDomain#isExact(error)`

Type guard: `true` if `error` is a `NiceError` whose domain exactly matches this domain.

### `NiceErrorDomain#isThisOrChild(error)`

`true` if `error`'s domain is this domain or any child domain.

### `NiceErrorDomain#isParentOf(target)`

`true` if this domain appears in `target`'s `allDomains` ancestry chain. Accepts either a `NiceErrorDomain` or a `NiceError` instance.

### `NiceErrorDomain#packAs(type)`

Set the default pack strategy for all errors created by this domain.

---

## `NiceError<ERR_DEF, ACTIVE_IDS>` (extends `Error`)

### Properties

| Property | Type | Description |
|---|---|---|
| `message` | `string` | Standard Error message. |
| `httpStatusCode` | `number` | HTTP status code. |
| `hasMultiple` | `boolean` | `true` when more than one ID is active. |
| `wasntNice` | `boolean` | `true` when constructed by `castNiceError` from a non-nice value. |
| `timeCreated` | `number` | Unix ms timestamp. |
| `originError` | `IRegularErrorJsonObject?` | Underlying cause error (set via `withOriginError`). |
| `isPacked` | `boolean` | `true` when the error has been packed. |

### Methods

#### `hasId(id)`

Type guard: narrows `ACTIVE_IDS` to exactly `id`.

#### `hasOneOfIds(ids)`

Type guard: narrows `ACTIVE_IDS` to the subset of `ids` that are active.

#### `getIds()`

Returns all active IDs as an array.

#### `getContext(id)`

Returns the typed context for `id`. Throws if context is in the `"unhydrated"` state — call `domain.hydrate(error)` first.

#### `withOriginError(error)`

Attach an underlying cause error. Returns `this`.

#### `matches(other)`

`true` if `other` has the same domain and the exact same set of active IDs (order-independent).

#### `toJsonObject()`

Serialize to a plain JSON-safe object.

#### `toJsonString()`

Serialize to a JSON string.

#### `toHttpResponse()`

Return a `Response` with `toJsonString()` as the body and `httpStatusCode` as the status.

#### `handleWithSync(cases, opts?)`

Dispatch to the first matching case. Returns the handler's return value, or `undefined` if nothing matched.

`opts.throwOnUnhandled`: `true` — throw `this` when no case matched.

#### `handleWithAsync(cases, opts?)`

Same as `handleWithSync` but awaits the handler's returned Promise.

#### `pack(type?)`

Pack the error for opaque boundary crossing. Default: `EErrorPackType.msg_pack`.

#### `unpack()`

Restore from packed state. Returns `this`.

---

## `NiceErrorHydrated<ERR_DEF, ACTIVE_IDS>` (extends `NiceError`)

Returned by `fromId` / `fromContext` / `hydrate`. Adds builder methods:

#### `addId(id, ctx?)`

Return a new `NiceErrorHydrated` with an additional active ID.

#### `addContext(map)`

Return a new `NiceErrorHydrated` with multiple additional active IDs.

---

## `NiceErrorHandler<RES_DEF, RES>`

Reusable handler with chainable methods:

```ts
const handler = new NiceErrorHandler()
  .forDomain(err_billing, (h) => { /* … */ })
  .forId(err_billing, "payment_failed", (h) => { /* … */ })
  .forIds(err_billing, ["card_expired", "insufficient_funds"], (h) => { /* … */ })
  .setDefaultHandler((h) => { /* … */ })
```

Pass to `error.handleWithSync(handler)` or `error.handleWithAsync(handler)`.

---

## Standalone case builders

### `forDomain(domain, handler)`

Matches any error whose domain exactly matches `domain`. Handler receives a `NiceErrorHydrated`.

### `forId(domain, id, handler)`

Matches when domain matches and `id` is an active ID.

### `forIds(domain, ids, handler)`

Matches when domain matches and at least one of `ids` is active.

---

## `matchFirst(error, handlers)`

Pattern-match an error by ID. Returns the result of the first matching handler, or `undefined`.

```ts
const message = matchFirst(error, {
  payment_failed: ({ reason }) => `Payment failed: ${reason}`,
  card_expired:   ()           => "Card expired",
  _:              ()           => "Billing error",
})
```

---

## `castNiceError(value)`

Convert any value to a `NiceError`. Never throws. Handles `NiceError`, serialized JSON, packed errors, `Error`, and any other value.

## `castAndHydrate(value, domain)`

One-step: `castNiceError` + `isExact` + `hydrate`. Returns a `NiceErrorHydrated` or `null`.

## `isNiceErrorObject(value)`

Type guard: `true` if `value` looks like a serialized `NiceError` plain object.

---

## `EErrorPackType`

```ts
enum EErrorPackType {
  no_pack    = "no_pack",
  msg_pack   = "msg_pack",
  cause_pack = "cause_pack",
}
```

---

## Type helpers

### `InferNiceError<T>`

Infer the `NiceError` type from a `NiceErrorDomain` instance.

```ts
type TUserError = InferNiceError<typeof err_user>
```

### `InferNiceErrorHydrated<T>`

Infer the `NiceErrorHydrated` type from a `NiceErrorDomain` instance.

```ts
type TUserErrorHydrated = InferNiceErrorHydrated<typeof err_user>
```

---

## Built-in error domains

| Domain | Description |
|---|---|
| `err_nice` | Root domain (empty schema). Parent of all built-in domains. |
| `err_cast_not_nice` | Errors produced when casting non-nice values via `castNiceError`. |
| `err_nice_handler` | Errors from the handler machinery. |
