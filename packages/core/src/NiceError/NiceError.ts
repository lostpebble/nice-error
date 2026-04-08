import type {
  ExtractContextType,
  ExtractFromIdContextArg,
  INiceErrorDefinedProps,
  INiceErrorJsonObject,
  IRegularErrorJsonObject,
  TContextMap,
  TFromContextInput,
  TNiceErrorSchema,
  TUnknownNiceErrorDef,
  TUnknownNiceErrorId,
} from "./NiceError.types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ContextOf<S extends TNiceErrorSchema, K extends keyof S> = ExtractContextType<S[K]>;

/**
 * Resolves the args tuple for `addId`:
 * - No context defined on the entry → `[id]`
 * - Context defined → `[id, context]`
 */
type AddIdArgs<
  ERR_DEF extends INiceErrorDefinedProps,
  K extends keyof ERR_DEF["schema"] & string,
> =
  ExtractFromIdContextArg<ERR_DEF["schema"][K]> extends undefined
    ? [id: K]
    : [id: K, context: ExtractFromIdContextArg<ERR_DEF["schema"][K]>];

/** The default "unknown" def used when NiceError is constructed without a definition. */
const UNKNOWN_DEF: TUnknownNiceErrorDef = {
  domain: "unknown",
  allDomains: ["unknown"],
  schema: {},
};

// ---------------------------------------------------------------------------
// Constructor options overloads
// ---------------------------------------------------------------------------

/** Full-featured construction from NiceErrorDefined.fromId / fromContext. */
export interface INiceErrorOptions<
  ERR_DEF extends INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"],
> {
  def: ERR_DEF;
  /** Primary id — also the first entry in ids. */
  id: ID;
  /** All active ids with their context values (supports multi-id). */
  contexts: TContextMap<ERR_DEF["schema"]>;
  message: string;
  wasntNice?: boolean;
  httpStatusCode?: number;
  originError?: Error | undefined;
}

// ---------------------------------------------------------------------------
// NiceError
// ---------------------------------------------------------------------------

export class NiceError<
  ERR_DEF extends INiceErrorDefinedProps = TUnknownNiceErrorDef,
  /**
   * Union of active error-id keys.
   * - After `fromId(id)`: exactly one key.
   * - After `fromContext({...})`: a union of all supplied keys.
   * - After `hasOneOfIds([a,b])`: narrows to that subset.
   * - Default (bare construction / castNiceError): `TUnknownNiceErrorId`.
   */
  ACTIVE_IDS extends keyof ERR_DEF["schema"] = TUnknownNiceErrorId,
> extends Error {
  override readonly name = "NiceError" as const;

  readonly def: ERR_DEF;
  /** Primary / first id. */
  readonly id: ACTIVE_IDS;
  readonly wasntNice: boolean;
  readonly httpStatusCode: number;
  readonly originError?: Error | undefined;

  /** Internal: all active id → context pairs. */
  private readonly _contexts: TContextMap<ERR_DEF["schema"]>;

  // -------------------------------------------------------------------------
  // Constructors
  // -------------------------------------------------------------------------

  /** Bare construction: `new NiceError()` or `new NiceError("message")` */
  constructor(message?: string);
  /** Full construction via NiceErrorDefined helpers. */
  constructor(options: INiceErrorOptions<ERR_DEF, ACTIVE_IDS>);
  constructor(
    messageOrOptions?: string | INiceErrorOptions<ERR_DEF, ACTIVE_IDS>,
  ) {
    const isBare = messageOrOptions === undefined || typeof messageOrOptions === "string";
    super(isBare ? (messageOrOptions ?? "NiceError") : messageOrOptions.message);

    if (isBare) {
      this.def = UNKNOWN_DEF as unknown as ERR_DEF;
      this.id = "unknown" as unknown as ACTIVE_IDS;
      this._contexts = {} as TContextMap<ERR_DEF["schema"]>;
      this.wasntNice = false;
      this.httpStatusCode = 500;
    } else {
      this.def = messageOrOptions.def;
      this.id = messageOrOptions.id;
      this._contexts = messageOrOptions.contexts;
      this.wasntNice = messageOrOptions.wasntNice ?? false;
      this.httpStatusCode = messageOrOptions.httpStatusCode ?? 500;
      this.originError = messageOrOptions.originError;
    }
  }

  // -------------------------------------------------------------------------
  // hasId — narrows ACTIVE_IDS to exactly ID
  // -------------------------------------------------------------------------

  /**
   * Type guard: returns `true` if this error was created with (or contains) the
   * given `id`. After the guard, `getContext(id)` will be strongly typed.
   */
  hasId<ID extends keyof ERR_DEF["schema"]>(
    id: ID,
  ): this is NiceError<ERR_DEF, ID> {
    return id in this._contexts;
  }

  // -------------------------------------------------------------------------
  // hasOneOfIds — narrows ACTIVE_IDS to the supplied subset
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if this error contains **at least one** of the supplied ids.
   * Narrows `ACTIVE_IDS` to the matching subset of `IDS`.
   */
  hasOneOfIds<IDS extends ReadonlyArray<keyof ERR_DEF["schema"]>>(
    ids: IDS,
  ): this is NiceError<ERR_DEF, IDS[number]> {
    return ids.some((id) => id in this._contexts);
  }

  // -------------------------------------------------------------------------
  // get hasMultiple
  // -------------------------------------------------------------------------

  /** `true` when this error was created with more than one id (via `fromContext`). */
  get hasMultiple(): boolean {
    return Object.keys(this._contexts).length > 1;
  }

  // -------------------------------------------------------------------------
  // getIds
  // -------------------------------------------------------------------------

  /** Returns all active error ids on this instance. */
  getIds(): Array<ACTIVE_IDS> {
    return Object.keys(this._contexts) as Array<ACTIVE_IDS>;
  }

  // -------------------------------------------------------------------------
  // getContext — strongly typed per ACTIVE_IDS
  // -------------------------------------------------------------------------

  /**
   * Returns the context value for the given error id.
   *
   * TypeScript will only allow you to call this with an id that is part of
   * `ACTIVE_IDS` (i.e. an id that was confirmed via `hasId` / `hasOneOfIds`,
   * or that was passed to `fromId` / `fromContext`).
   */
  getContext<ID extends ACTIVE_IDS>(
    id: ID,
  ): ContextOf<ERR_DEF["schema"], ID> {
    return (this._contexts as Record<string, unknown>)[id as string] as ContextOf<
      ERR_DEF["schema"],
      ID
    >;
  }

  // -------------------------------------------------------------------------
  // addContext — merge additional id+context entries into this error
  // -------------------------------------------------------------------------

  /**
   * Returns a **new** `NiceError` with additional id+context entries merged in.
   * The returned error's `ACTIVE_IDS` is the union of the original ids and the
   * newly supplied keys.
   *
   * ```ts
   * const err = errDef.fromId("id_a", { a: 1 })
   *   .addContext({ id_b: { b: "x" } });
   * err.getIds(); // ["id_a", "id_b"]
   * ```
   */
  addContext<INPUT extends TFromContextInput<ERR_DEF["schema"]>>(
    context: INPUT & Record<Exclude<keyof INPUT, keyof ERR_DEF["schema"]>, never>,
  ): NiceError<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)> {
    const mergedContexts = { ...this._contexts, ...context } as TContextMap<ERR_DEF["schema"]>;
    return new NiceError<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)>({
      def: this.def,
      id: this.id,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    } as INiceErrorOptions<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)>);
  }

  // -------------------------------------------------------------------------
  // addId — add a single id (with optional context) to this error
  // -------------------------------------------------------------------------

  /**
   * Returns a **new** `NiceError` with an additional error id (and its context,
   * if the schema requires one). Equivalent to `addContext({ [id]: context })`
   * but mirrors the `fromId` ergonomics for single-id additions.
   */
  addId<K extends keyof ERR_DEF["schema"] & string>(
    ...args: AddIdArgs<ERR_DEF, K>
  ): NiceError<ERR_DEF, ACTIVE_IDS | K> {
    const [id, context] = args as [K, unknown];
    const mergedContexts = { ...this._contexts, [id]: context } as TContextMap<ERR_DEF["schema"]>;
    return new NiceError<ERR_DEF, ACTIVE_IDS | K>({
      def: this.def,
      id: this.id,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    } as INiceErrorOptions<ERR_DEF, ACTIVE_IDS | K>);
  }

  // -------------------------------------------------------------------------
  // toJsonObject
  // -------------------------------------------------------------------------

  toJsonObject(): INiceErrorJsonObject<ERR_DEF> {
    const originError: IRegularErrorJsonObject | undefined = this.originError
      ? {
          name: this.originError.name,
          message: this.originError.message,
          stack: this.originError.stack,
          cause: this.originError.cause,
        }
      : undefined;

    return {
      name: "NiceError",
      def: this.def,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      originError,
    };
  }
}
