import { NiceError } from "../NiceError/NiceError";
import { EContextSerializedState } from "../NiceError/NiceError.enums";
import {
  type FromIdArgs,
  type IDefineNewNiceErrorDomainOptions,
  type INiceErrorDefinedProps,
  type TContextState,
  type TErrorDataForIdMap,
  type TErrorReconciledData,
  type TFromContextInput,
} from "../NiceError/NiceError.types";
import { type INiceErrorHydratedOptions, NiceErrorHydrated } from "../NiceError/NiceErrorHydrated";
import { type EErrorPackType } from "../utils/packError/packError.enums";

// ---------------------------------------------------------------------------
// Internal type helpers
// ---------------------------------------------------------------------------

type ChildDef<
  PARENT_DEF extends INiceErrorDefinedProps,
  SUB extends IDefineNewNiceErrorDomainOptions,
> = {
  domain: SUB["domain"];
  allDomains: [SUB["domain"], ...PARENT_DEF["allDomains"]];
  schema: SUB["schema"];
};

/**
 * Extracts the union of keys present in a `TFromContextInput` object.
 * e.g. `{ invalid_credentials: {...} }` → `"invalid_credentials"`
 */
type KeysOfContextInput<INPUT> = keyof INPUT & string;

interface ILinkedNiceErrorDefined {
  domain: string;
  definedError: NiceErrorDefined<any>;
}

// ---------------------------------------------------------------------------
// InferNiceError / InferNiceErrorHydrated — utility types
// ---------------------------------------------------------------------------

/**
 * Infers the strongly-typed `NiceError` class type from a `NiceErrorDefined` instance.
 *
 * `ACTIVE_IDS` is set to the full union of all schema keys. Use `hasId` /
 * `hasOneOfIds` to narrow further at the call site.
 *
 * @example
 * ```ts
 * const err_user_auth = defineNiceError({ domain: "err_user_auth", schema: { ... } });
 * type TUserAuthError = InferNiceError<typeof err_user_auth>;
 * // → NiceError<{ domain: "err_user_auth"; ... }, keyof schema>
 * ```
 */
export type InferNiceError<T extends NiceErrorDefined<any>> =
  T extends NiceErrorDefined<infer ERR_DEF> ? NiceError<ERR_DEF, keyof ERR_DEF["schema"]> : never;

/**
 * Infers the strongly-typed `NiceErrorHydrated` class type from a `NiceErrorDefined` instance.
 *
 * Use this when you need the builder methods (`addId`, `addContext`) as part of
 * the inferred type — e.g. for function return types or variable annotations.
 *
 * @example
 * ```ts
 * const err_user_auth = defineNiceError({ domain: "err_user_auth", schema: { ... } });
 * type TUserAuthErrorHydrated = InferNiceErrorHydrated<typeof err_user_auth>;
 * // → NiceErrorHydrated<{ domain: "err_user_auth"; ... }, keyof schema>
 * ```
 */
export type InferNiceErrorHydrated<T extends NiceErrorDefined<any>> =
  T extends NiceErrorDefined<infer ERR_DEF>
    ? NiceErrorHydrated<ERR_DEF, keyof ERR_DEF["schema"]>
    : never;

// ---------------------------------------------------------------------------
// NiceErrorDefined
// ---------------------------------------------------------------------------

export class NiceErrorDefined<ERR_DEF extends INiceErrorDefinedProps = INiceErrorDefinedProps> {
  readonly domain: ERR_DEF["domain"];
  readonly allDomains: ERR_DEF["allDomains"];
  readonly defaultHttpStatusCode?: number;
  readonly defaultMessage?: string;

  /** Kept for runtime use (message resolution, httpStatusCode, context serialization, etc.). */
  private readonly _schema: ERR_DEF["schema"];
  private _definedChildNiceErrors: ILinkedNiceErrorDefined[] = [];
  private _definedParentNiceError?: ILinkedNiceErrorDefined;
  /** Set by `.packAs()` — explicit per-instance override, takes priority over `_packAsFn`. */
  private _setPack?: EErrorPackType;
  /** Set at definition time — called dynamically each time an error is created. */
  private _packAsFn?: () => EErrorPackType | void;

  constructor(definition: ERR_DEF) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this._schema = definition.schema;

    if (definition.packAs != null) {
      this._packAsFn = definition.packAs;
    }

    if (definition.defaultHttpStatusCode != null) {
      this.defaultHttpStatusCode = definition.defaultHttpStatusCode;
    }

    if (definition.defaultMessage != null) {
      this.defaultMessage = definition.defaultMessage;
    }
  }

  // -------------------------------------------------------------------------
  // createChildDomain
  // -------------------------------------------------------------------------

  /**
   * Creates a child domain that inherits this domain in `allDomains`.
   * The child has its own schema and its own domain string.
   */
  createChildDomain<SUB extends IDefineNewNiceErrorDomainOptions>(
    subErrorDef: SUB & { [K in Exclude<keyof SUB, keyof IDefineNewNiceErrorDomainOptions>]: never },
  ): NiceErrorDefined<ChildDef<ERR_DEF, SUB>> {
    const child = new NiceErrorDefined<ChildDef<ERR_DEF, SUB>>({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains] as [
        SUB["domain"],
        ...ERR_DEF["allDomains"],
      ],
      schema: subErrorDef.schema,
      defaultHttpStatusCode: subErrorDef.defaultHttpStatusCode,
      defaultMessage: subErrorDef.defaultMessage,
    } as ChildDef<ERR_DEF, SUB>);

    this.addChildNiceErrorDefined(child);
    child.addParentNiceErrorDefined(this);

    // Child's own packAs takes priority; fall back to parent's config.
    if (subErrorDef.packAs != null) {
      child._packAsFn = subErrorDef.packAs;
    } else if (this._setPack) {
      child.packAs(this._setPack);
    } else if (this._packAsFn) {
      child._packAsFn = this._packAsFn;
    }

    return child;
  }

  protected addParentNiceErrorDefined<PARENT_DEF extends INiceErrorDefinedProps>(
    parentError: NiceErrorDefined<PARENT_DEF>,
  ) {
    if (this._definedParentNiceError?.domain === parentError.domain) {
      return;
    }
    this._definedParentNiceError = {
      domain: parentError.domain,
      definedError: parentError,
    };
  }

  protected addChildNiceErrorDefined<CHILD_DEF extends INiceErrorDefinedProps>(
    child: NiceErrorDefined<CHILD_DEF>,
  ) {
    if (this._definedChildNiceErrors.some((linked) => linked.domain === child.domain)) {
      return;
    }

    this._definedChildNiceErrors.push({
      domain: child.domain,
      definedError: child,
    });

    if (this._definedParentNiceError) {
      this._definedParentNiceError.definedError.addChildNiceErrorDefined(child);
    }
  }

  packAs(pack: EErrorPackType): this {
    this._setPack = pack;
    return this;
  }

  private createError(
    input: INiceErrorHydratedOptions<any, any> & { message: string | undefined },
  ) {
    const err = new NiceErrorHydrated<any, any>(input);

    // Explicit .packAs() override takes priority; fall back to the dynamic function.
    const packType = this._setPack ?? this._packAsFn?.();
    if (packType != null && packType !== "no_pack") {
      return err.pack(packType) as any;
    }

    return err;
  }

  // -------------------------------------------------------------------------
  // hydrate
  // -------------------------------------------------------------------------

  /**
   * Promotes a plain `NiceError<ERR_DEF>` back into a `NiceErrorHydrated` so
   * that builder methods (`addId`, `addContext`, etc.) are available again.
   *
   * For each active id, if the context is in the `"unhydrated"` state (i.e. the
   * error was reconstructed from a JSON payload), `hydrate` calls
   * `fromJsonSerializable` to reconstruct the typed value and advances the state
   * to `"hydrated"`. Ids already in `"hydrated"` or `"raw_unset"` state
   * are passed through unchanged.
   *
   * @throws If `error.def.domain` does not match this definition's domain. Use
   * `niceErrorDefined.is(error)` before calling `hydrate` to ensure compatibility.
   *
   * ```ts
   * const raw = castNiceError(apiResponseBody);
   *
   * if (err_user_auth.is(raw)) {
   *   const hydrated = err_user_auth.hydrate(raw);
   *   // hydrated.getContext("invalid_credentials") — fully typed, no throw
   *   // hydrated.addId / addContext — available again
   * }
   * ```
   */
  hydrate<ACTIVE_IDS extends keyof ERR_DEF["schema"]>(
    error: NiceError<ERR_DEF, ACTIVE_IDS>,
  ): NiceErrorHydrated<ERR_DEF, ACTIVE_IDS> {
    const errDef = error.def as unknown as INiceErrorDefinedProps;
    if (errDef.domain !== this.domain) {
      throw new Error(
        `[NiceErrorDefined.hydrate] Domain mismatch: this definition is "${this.domain}" ` +
          `but the error belongs to "${errDef.domain}". ` +
          `Call \`niceErrorDefined.is(error)\` before hydrating to ensure compatibility.`,
      );
    }

    const reconciledErrorData: TErrorDataForIdMap<ERR_DEF["schema"]> = {};

    for (const id of error.getIds()) {
      const existingData = error.getErrorDataForId(id);
      if (existingData == null) continue;

      let contextState: TContextState<any> = existingData.contextState;

      if (contextState.kind === "unhydrated") {
        const entry = this._schema[id as keyof ERR_DEF["schema"]];
        const deserialize = entry?.context?.serialization?.fromJsonSerializable;

        if (deserialize != null) {
          contextState = {
            kind: EContextSerializedState.hydrated,
            value: deserialize(contextState.serialized),
            serialized: contextState.serialized,
          };
        }
        // If no deserializer is found (schema mismatch), leave as "unhydrated".
      }

      reconciledErrorData[id as keyof ERR_DEF["schema"]] = {
        contextState,
        message: existingData.message,
        httpStatusCode: existingData.httpStatusCode,
      };
    }

    return new NiceErrorHydrated<ERR_DEF, ACTIVE_IDS>({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids: error.ids,
      errorData: reconciledErrorData,
      message: error.message,
      httpStatusCode: error.httpStatusCode,
      wasntNice: error.wasntNice,
      originError: error.originError,
    });
  }

  // -------------------------------------------------------------------------
  // fromId — single-id construction
  // -------------------------------------------------------------------------

  /**
   * Creates a `NiceErrorHydrated` for a single error id.
   *
   * - `id` autocompletes to the schema keys.
   * - The second argument `context` is required / optional / absent based on
   *   whether the schema entry declares `context.required: true`.
   * - The returned error has `ACTIVE_IDS` narrowed to exactly `K`, so
   *   `getContext(id)` is immediately strongly typed.
   */
  fromId<K extends keyof ERR_DEF["schema"] & string>(
    ...args: FromIdArgs<ERR_DEF, K>
  ): NiceErrorHydrated<ERR_DEF, K> {
    const [id, context] = args as FromIdArgs<ERR_DEF, K>;

    const reconciledData = this.reconcileErrorDataForId(id, context);

    const errorData: TErrorDataForIdMap<ERR_DEF["schema"]> = {};
    errorData[id] = reconciledData;

    return this.createError({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids: [id],
      errorData,
      message: reconciledData.message,
      httpStatusCode: reconciledData.httpStatusCode,
    }) as unknown as NiceErrorHydrated<ERR_DEF, K>;
  }

  // -------------------------------------------------------------------------
  // fromContext — multi-id construction
  // -------------------------------------------------------------------------

  fromContext<INPUT extends TFromContextInput<ERR_DEF["schema"]>>(
    context: INPUT & Record<Exclude<keyof INPUT, keyof ERR_DEF["schema"]>, never>,
  ): NiceErrorHydrated<ERR_DEF, KeysOfContextInput<INPUT>> {
    const ids = Object.keys(context) as Array<KeysOfContextInput<INPUT>>;
    if (ids.length === 0) {
      throw new Error(
        "[NiceErrorDefined.fromContext] context object must contain at least one error id.",
      );
    }

    const errorData: TErrorDataForIdMap<ERR_DEF["schema"]> = {};

    for (const id of ids) {
      errorData[id] = this.reconcileErrorDataForId(id, context[id]);
    }

    const primaryId = ids[0] as KeysOfContextInput<INPUT>;

    return this.createError({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids: ids,
      errorData,
      message: errorData[primaryId]!.message,
      httpStatusCode: errorData[primaryId]!.httpStatusCode,
    }) as NiceErrorHydrated<ERR_DEF, KeysOfContextInput<INPUT>>;

    // return new NiceErrorHydrated<ERR_DEF, KeysOfContextInput<INPUT>>({
    //   def: this._buildDef(),
    //   niceErrorDefined: this,
    //   ids: ids,
    //   errorData,
    //   message: errorData[primaryId]?.message,
    //   httpStatusCode: errorData[primaryId]?.httpStatusCode,
    // } as INiceErrorHydratedOptions<ERR_DEF, KeysOfContextInput<INPUT>>);
  }

  // -------------------------------------------------------------------------
  // is — type-narrowing guard
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if `error` is a `NiceError` whose `def.domain` exactly matches
   * this definition's domain.
   *
   * Use this after `castNiceError` to narrow an unknown error to this specific
   * domain before accessing its typed ids/context:
   *
   * ```ts
   * const caught = castNiceError(e);
   *
   * if (err_user_auth.is(caught)) {
   *   // caught is now NiceError<typeof err_user_auth's ERR_DEF>
   *   const hydrated = err_user_auth.hydrate(caught);
   *   const { username } = hydrated.getContext("invalid_credentials");
   * }
   * ```
   */
  isExact(error: unknown): error is NiceError<ERR_DEF, keyof ERR_DEF["schema"]> {
    if (!(error instanceof NiceError)) return false;
    const errDef = error.def as unknown as INiceErrorDefinedProps;
    return errDef.domain === this.domain;
  }

  isThisOrChild(error: unknown): boolean {
    if (!(error instanceof NiceError)) return false;
    const errDef = error.def as unknown as INiceErrorDefinedProps;
    return errDef.domain === this.domain || this.allDomains.includes(errDef.domain);
  }

  // -------------------------------------------------------------------------
  // isParentOf — ancestry check
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if this domain appears anywhere in the target's ancestry
   * chain (including an exact domain match).
   *
   * Accepts either a `NiceErrorDefined` (domain definition) or a `NiceError`
   * instance (extracts the domain from its `def`).
   */
  isParentOf(target: NiceErrorDefined<any> | NiceError<any, any>): boolean {
    const allDomains: string[] =
      target instanceof NiceError
        ? (target.def as unknown as INiceErrorDefinedProps).allDomains
        : (target as NiceErrorDefined<any>).allDomains;
    return Array.isArray(allDomains) && allDomains.includes(this.domain);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _buildDef(): ERR_DEF {
    return {
      domain: this.domain,
      allDomains: this.allDomains,
      schema: this._schema,
    } as unknown as ERR_DEF;
  }

  private _resolveMessage(
    id: keyof ERR_DEF["schema"] & string,
    context: TFromContextInput<ERR_DEF["schema"]>[typeof id],
  ): string {
    const entry = this._schema[id];

    if (typeof entry?.message === "function") {
      return (entry.message as (ctx: unknown) => string)(context);
    }
    if (typeof entry?.message === "string") {
      return entry.message;
    }
    return this.defaultMessage ?? `[${this.domain}::${id}] An error occurred.`;
  }

  private _resolveHttpStatusCode(
    id: keyof ERR_DEF["schema"] & string,
    context: TFromContextInput<ERR_DEF["schema"]>[typeof id],
  ): number {
    const entry = this._schema[id];
    let httpStatusCode: number | undefined;

    if (typeof entry?.httpStatusCode === "function") {
      httpStatusCode = (entry.httpStatusCode as (ctx: unknown) => number)(context);
    }
    if (typeof entry?.httpStatusCode === "number") {
      httpStatusCode = entry.httpStatusCode;
    }

    return typeof httpStatusCode === "number"
      ? httpStatusCode
      : (this.defaultHttpStatusCode ?? 500);
  }

  reconcileErrorDataForId(
    id: keyof ERR_DEF["schema"] & string,
    context: TFromContextInput<ERR_DEF["schema"]>[typeof id],
  ): TErrorReconciledData<ERR_DEF["schema"], typeof id> {
    const message = this._resolveMessage(id, context);
    const httpStatusCode = this._resolveHttpStatusCode(id, context);
    const entry = this._schema[id];

    let contextState: TContextState<any>;

    if (context != null && entry?.context?.serialization != null) {
      // Context provided and a custom serializer is defined — build "hydrated" state.
      const serialized = entry.context.serialization.toJsonSerializable(context as any);
      contextState = { kind: EContextSerializedState.hydrated, value: context, serialized };
    } else {
      // No custom serializer (or context is absent for optional ids) — use "raw_unset".
      contextState = { kind: EContextSerializedState.serde_unset, value: context };
    }

    return { contextState, message, httpStatusCode };
  }
}
