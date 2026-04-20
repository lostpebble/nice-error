---
title: "@nice-code/action — API reference"
description: The full public surface of @nice-code/action.
tableOfContents:
  maxHeadingLevel: 4
---

## `createActionDomain(definition)`

Create a root action domain.

| Param | Type | Description |
|---|---|---|
| `definition.domain` | `string` | Domain namespace — e.g. `"user_domain"`. |
| `definition.actions` | `Record<string, NiceActionSchema>` | Map of action IDs to their schemas. |

Returns a `NiceActionDomain`.

---

## `action()`

Start building an action schema. Chain methods to declare its signature:

### `.input(options)`

| Option | Type | Description |
|---|---|---|
| `schema` | `StandardSchemaV1` | Validator (Valibot, Zod, etc.) for the input. |
| `serialization.serialize` | `(input) => SerdeInput` | Custom serialization for non-JSON-safe input. |
| `serialization.deserialize` | `(serde: SerdeInput) => Input` | Deserialize on the receiving end. |

### `.output(options)`

Same structure as `.input()`. Optional — omit for `void`-output actions.

### `.throws(errDomain, ids?)`

Declare possible errors. Chain multiple times for multiple error domains.

| Param | Type | Description |
|---|---|---|
| `errDomain` | `NiceErrorDomain` | Error domain this action can throw. |
| `ids` | `readonly string[]?` | Specific IDs to declare. Omit for all IDs. |

---

## `NiceActionDomain<ACT_DOM>`

### `NiceActionDomain#action(id)`

Get a `NiceAction` for the given action ID. Throws `action_id_not_in_domain` if the ID isn't in the schema.

### `NiceActionDomain#primeAction(id, input)`

Shorthand for `action(id).prime(input)`.

### `NiceActionDomain#setActionRequester(options?, handler?)`

Register a `NiceActionRequester` on this domain.

| Param | Type | Description |
|---|---|---|
| `options.envId` | `string?` | Named environment. Omit for the default requester. |
| `handler` | `NiceActionRequester?` | Reuse an existing requester instance. |

Returns a `NiceActionRequester`. Throws `domain_action_requester_conflict` / `environment_already_registered` if already set.

### `NiceActionDomain#registerResponder(resolver, options?)`

Register a `NiceActionDomainResponder` as the fallback execution path.

| Param | Type | Description |
|---|---|---|
| `resolver` | `NiceActionDomainResponder` | Resolver to register. |
| `options.envId` | `string?` | Named environment. |

Returns `this`.

### `NiceActionDomain#addActionListener(fn)`

Register an observer called after every dispatched action. Returns an unsubscribe function.

### `NiceActionDomain#hydratePrimed(wire)`

Reconstruct a `NiceActionPrimed` from its serialized wire format.

### `NiceActionDomain#hydrateResponse(wire)`

Reconstruct a `NiceActionResponse` from its serialized wire format.

### `NiceActionDomain#createChildDomain(opts)`

Create a nested domain. The child's `allDomains` includes the parent's chain.

### `NiceActionDomain#matchAction(act, id)`

Type-narrow a primed action to a specific ID. Returns `NiceActionPrimed` or `null`.

---

## `NiceAction<DOM, ID, SCH>`

### `NiceAction#execute(input, envId?)`

Execute and return the raw output. Throws on failure.

### `NiceAction#executeSafe(input, envId?)`

Execute and return `NiceActionResult`. Never throws.

### `NiceAction#executeToResponse(input, envId?)`

Execute and return a `NiceActionResponse` (carries both action identity and result).

### `NiceAction#prime(input)`

Create a `NiceActionPrimed` with the given input.

### `NiceAction#is(action)`

Type guard: `true` if `action` is a `NiceActionPrimed` for this action ID and domain.

---

## `NiceActionPrimed<DOM, ID, SCH>`

### `NiceActionPrimed#execute(envId?)`

Execute the stored action.

### `NiceActionPrimed#executeSafe(envId?)`

Execute and return `NiceActionResult`.

### `NiceActionPrimed#toJsonObject()`

Serialize to `INiceActionPrimed_JsonObject`.

### `NiceActionPrimed#toJsonString()`

Serialize to a JSON string.

### `NiceActionPrimed#processResponse(wire)`

Process a `TNiceActionResponse_JsonObject`: throws if `ok: false`, returns typed output if `ok: true`.

---

## `NiceActionRequester`

### `NiceActionRequester#forDomain(domain, handler)`

Register a handler for all actions in `domain`.

### `NiceActionRequester#forActionId(domain, id, handler)`

Register a handler for a specific action ID.

### `NiceActionRequester#forActionIds(domain, ids, handler)`

Register a handler for a set of action IDs.

### `NiceActionRequester#setDefaultHandler(handler)`

Fallback handler when no prior case matched.

---

## `createDomainResolver(domain)`

Create a `NiceActionDomainResponder` for `domain`.

## `NiceActionDomainResponder#resolveAction(id, fn)`

Register a resolver function for action `id`. Chainable. Input and return type are inferred from the schema.

---

## `createResponderEnvironment(resolvers)`

Create a `NiceActionResponderEnvironment` from an array of `NiceActionDomainResponder` instances.

## `NiceActionResponderEnvironment#dispatch(wire)`

Dispatch a serialized primed action: hydrate → resolve → return `TNiceActionResponse_JsonObject`.

---

## Type helpers

| Type | Description |
|---|---|
| `TInferActionError<SCH>` | Union of all error types declared via `.throws()` on a schema. |
| `TInferInputFromSchema<SCH>` | Infer `Input` and `SerdeInput` from an action schema. |
| `TInferOutputFromSchema<SCH>` | Infer `Output` and `SerdeOutput` from an action schema. |
| `NiceActionResult<OUT, ERR>` | `{ ok: true; output: OUT } \| { ok: false; error: ERR }` |
| `INiceAction_JsonObject` | Serialized `NiceAction` wire format. |
| `INiceActionPrimed_JsonObject` | Serialized `NiceActionPrimed` wire format. |
| `TNiceActionResponse_JsonObject` | Serialized `NiceActionResponse` wire format. |

---

## `err_nice_action` error domain

Internal errors thrown by the action system:

| ID | When |
|---|---|
| `action_id_not_in_domain` | `domain.action("id")` called with unknown ID. |
| `domain_action_requester_conflict` | `setActionRequester()` called twice on the same domain. |
| `domain_no_handler` | `execute()` called but no requester or responder is registered. |
| `hydration_domain_mismatch` | Wire domain doesn't match the domain being hydrated into. |
| `hydration_action_state_mismatch` | Wire `type` field doesn't match the expected state. |
| `hydration_action_id_not_found` | Wire action ID isn't in the domain's schema. |
| `resolver_domain_not_registered` | `env.dispatch()` received a domain with no registered resolver. |
| `resolver_action_not_registered` | `resolveAction` was not called for the dispatched action ID. |
| `action_environment_not_found` | `execute(input, envId)` but no handler/resolver with that `envId` exists. |
| `environment_already_registered` | Named `envId` already has a requester or responder registered. |
| `action_input_validation_failed` | Input failed schema validation before dispatch. |
