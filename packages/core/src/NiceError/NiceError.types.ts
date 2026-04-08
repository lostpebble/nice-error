export interface IRegularErrorJsonObject extends Omit<Error, "stack"> {
  name: string;
  message: string;
  stack?: string | undefined;
  cause?: unknown;
}

// ---------------------------------------------------------------------------
// Schema entry types
// ---------------------------------------------------------------------------

/** Describes the context attached to a single error id. */
export interface INiceErrorContextDefinition<C> {
  required?: boolean;
  serialization?: {
    toJsonSerializable: (context: C) => Record<string, any>;
    fromJsonSerializable: (obj: Record<string, any>) => C;
  };
}

/**
 * A single entry in a NiceErrorDefined schema.
 * `C` is the context value type (defaults to `never` = no context).
 */
export interface INiceErrorIdMetadata<C = never> {
  context?: [C] extends [never] ? never : INiceErrorContextDefinition<C>;
  /** Static message string OR a function that receives the context value and returns a string. */
  message?: [C] extends [never] ? string : string | ((context: C) => string);
  httpStatusCode?: [C] extends [never] ? number : number | ((context: C) => number);
}

// ---------------------------------------------------------------------------
// Schema map type
// ---------------------------------------------------------------------------

/** A record mapping error-id string keys to their metadata. */
export type TNiceErrorSchema = Record<string, INiceErrorIdMetadata<any>>;

// ---------------------------------------------------------------------------
// Helpers to extract context from a schema entry
// ---------------------------------------------------------------------------

/** Extracts the raw context value type `C` from a single schema entry. */
export type TExtractContextType<M> = M extends INiceErrorIdMetadata<infer C> ? C : never;

/**
 * Given a schema entry M, returns the context argument type expected by `fromId`:
 *
 * - `C = never`                     → `undefined`  (no context field on this id)
 * - `C` defined, `required: true`   → `C`          (context is a required argument)
 * - `C` defined, `required` absent/false → `C | undefined` (context is optional)
 *
 * Note: `required: true` must be a literal `true` for TypeScript to narrow correctly.
 * Use the `err()` helper (which preserves literal types) rather than writing schema
 * entries inline without `as const`.
 */
export type ExtractFromIdContextArg<M> =
  M extends INiceErrorIdMetadata<infer C>
    ? [C] extends [never]
      ? undefined
      : M extends { context: { required: true } }
        ? C
        : C | undefined
    : undefined;

// ---------------------------------------------------------------------------
// Context state — discriminated union tracking the lifecycle of context data
// ---------------------------------------------------------------------------

/**
 * No custom serializer is defined for this error id's context.
 * `value` holds the typed context directly (plain JSON-safe value, or `undefined`
 * if the context was optional and not provided).
 *
 * This state is safe across a JSON round-trip because no type information is lost.
 */
export type TContextStateNoSerialization<C> = {
  kind: "no_serialization";
  /** The typed context value (or `undefined` if optional and not provided). */
  value: C | undefined;
};

/**
 * A custom serializer is defined, but the context has **not** been deserialized
 * from its JSON-wire form yet.
 *
 * This state occurs after `castNiceError` reconstructs an error from a serialized
 * payload. `value` is absent — the raw serialized representation is in `serialized`.
 *
 * Call `niceErrorDefined.hydrate(error)` to reconstruct the typed context via
 * `fromJsonSerializable` and advance to the `"hydrated"` state.
 */
export type TContextStateUnhydrated = {
  kind: "unhydrated";
  /** The JSON-serializable representation of the original context. */
  serialized: Record<string, any>;
};

/**
 * A custom serializer is defined, and the context is fully deserialized to its
 * original typed value.
 *
 * This state is set when the error is first created via `fromId`/`fromContext`,
 * or after `niceErrorDefined.hydrate(error)` reconstructs it.
 *
 * Note: `toJsonObject()` intentionally downgrades this to `"unhydrated"` on
 * output so the flag cannot survive a JSON round-trip as a false positive.
 */
export type TContextStateHydrated<C> = {
  kind: "hydrated";
  /** The typed context value — the original value as provided at error creation. */
  value: C;
  /** The JSON-serializable representation (produced by `toJsonSerializable`). */
  serialized: Record<string, any>;
};

/**
 * Runtime context state — union of all three lifecycle states.
 * Stored in `_errorDataMap` on a live `NiceError` instance.
 */
export type TContextState<C> =
  | TContextStateNoSerialization<C>
  | TContextStateUnhydrated
  | TContextStateHydrated<C>;

/**
 * Wire-safe context state — excludes `"hydrated"` because `toJsonObject()` downgrades
 * it to `"unhydrated"` before serialization. This is the only state that appears in
 * `INiceErrorJsonObject` and on errors reconstructed via `castNiceError`.
 */
export type TSerializedContextState<C> =
  | TContextStateNoSerialization<C>
  | TContextStateUnhydrated;

// ---------------------------------------------------------------------------
// Multi-context map type (used by fromContext / getContext after hasOneOfIds)
// ---------------------------------------------------------------------------

/**
 * Runtime reconciled data for a single error id, stored in `_errorDataMap`.
 * Uses the full `TContextState` union (including `"hydrated"`).
 */
export type TErrorReconciledData<SCHEMA extends TNiceErrorSchema, K extends keyof SCHEMA> = {
  contextState: TContextState<TExtractContextType<SCHEMA[K]>>;
  message: string;
  httpStatusCode: number;
};

/**
 * Wire-safe reconciled data — uses `TSerializedContextState` (no `"hydrated"`).
 * This is the shape stored in `INiceErrorJsonObject.errorData` and transmitted
 * over the wire. `"hydrated"` is excluded so that the serialization state can
 * never be trusted after a JSON round-trip.
 */
export type TSerializedErrorReconciledData<
  SCHEMA extends TNiceErrorSchema,
  K extends keyof SCHEMA,
> = {
  contextState: TSerializedContextState<TExtractContextType<SCHEMA[K]>>;
  message: string;
  httpStatusCode: number;
};

export type TErrorDataForIdMap<SCHEMA extends TNiceErrorSchema> = {
  [K in keyof SCHEMA]?: TErrorReconciledData<SCHEMA, K>;
};

/** Wire-safe version of `TErrorDataForIdMap`. Used in `INiceErrorJsonObject`. */
export type TSerializedErrorDataMap<SCHEMA extends TNiceErrorSchema> = {
  [K in keyof SCHEMA]?: TSerializedErrorReconciledData<SCHEMA, K>;
};

/**
 * The Partial record that `fromContext` accepts: callers supply one or more
 * { [errorId]: contextValue } entries and NiceError stores them all.
 */
export type TFromContextInput<SCHEMA extends TNiceErrorSchema> = {
  [K in keyof SCHEMA]?: TExtractContextType<SCHEMA[K]> | undefined;
};

/**
 * Resolves the args tuple for `fromId` / `addId`:
 *
 * - No context on this id                  → `[id]`
 * - Context defined, `required: true`      → `[id, context]`
 * - Context defined, `required` absent/false → `[id] | [id, context]`
 */
export type FromIdArgs<ERR_DEF extends INiceErrorDefinedProps, K extends keyof ERR_DEF["schema"]> =
  [ExtractFromIdContextArg<ERR_DEF["schema"][K]>] extends [undefined]
    ? [id: K]
    : [undefined] extends [ExtractFromIdContextArg<ERR_DEF["schema"][K]>]
      ? [id: K] | [id: K, context: NonNullable<ExtractFromIdContextArg<ERR_DEF["schema"][K]>>]
      : [id: K, context: ExtractFromIdContextArg<ERR_DEF["schema"][K]>];

// ---------------------------------------------------------------------------
// Defined-error props (carried on NiceErrorDefined)
// ---------------------------------------------------------------------------

export interface IDefineNewNiceErrorDomainOptions<
  ERR_DOMAIN extends string = string,
  SCHEMA extends TNiceErrorSchema = TNiceErrorSchema,
> {
  defaultHttpStatusCode?: number;
  defaultMessage?: string;
  domain: ERR_DOMAIN;
  schema: SCHEMA;
}

export interface INiceErrorDefinedProps<
  ERR_DOMAINS extends string[] = string[],
  SCHEMA extends TNiceErrorSchema = TNiceErrorSchema,
> {
  defaultHttpStatusCode?: number;
  defaultMessage?: string;
  domain: ERR_DOMAINS[number];
  allDomains: ERR_DOMAINS;
  schema: SCHEMA;
}

// ---------------------------------------------------------------------------
// NiceError instance shape (JSON-serialisable)
// ---------------------------------------------------------------------------

export interface INiceErrorJsonObject<
  ERR_DEF extends INiceErrorDefinedProps = INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"] = keyof ERR_DEF["schema"],
> {
  name: "NiceError";
  def: Omit<ERR_DEF, "schema">;
  ids: ID[];
  /** Wire-safe error data — context is in `"no_serialization"` or `"unhydrated"` state only. */
  errorData: TSerializedErrorDataMap<ERR_DEF["schema"]>;
  wasntNice: boolean;
  message: string;
  httpStatusCode: number;
  /** The stack trace of the NiceError at the point it was created. */
  stack?: string;
  originError?: IRegularErrorJsonObject | undefined;
}

// ---------------------------------------------------------------------------
// "Unknown" / bare NiceError — used when no schema is available
// ---------------------------------------------------------------------------

/**
 * The widest ERR_DEF used when creating a NiceError without a definition
 * (bare construction, castNiceError, etc.).
 *
 * Uses the base `INiceErrorDefinedProps` defaults (`string[]` domains,
 * `TNiceErrorSchema` schema) so that type-guard narrowing via `is()` works
 * correctly — `string & "specific_domain"` narrows to `"specific_domain"`
 * instead of collapsing the intersection to `never`.
 */
export type TUnknownNiceErrorDef = INiceErrorDefinedProps;

/**
 * Wide id type for bare / cast NiceErrors that have no schema.
 * Using `string` (rather than a literal `"unknown"`) ensures that
 * `is()` type-guard intersections narrow cleanly: `string & K` = `K`.
 */
export type TUnknownNiceErrorId = string;
