import type {
  ExtractContextType,
  INiceErrorDefinedProps,
  INiceErrorJsonObject,
  IRegularErrorJsonObject,
  TErrorDataForIdMap,
  TNiceErrorSchema,
  TUnknownNiceErrorDef,
  TUnknownNiceErrorId,
} from "./NiceError.types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ContextOf<S extends TNiceErrorSchema, K extends keyof S> = ExtractContextType<S[K]>;

// ---------------------------------------------------------------------------
// Constructor options overloads
// ---------------------------------------------------------------------------

/** Full-featured construction from NiceErrorDefined.fromId / fromContext. */
export interface INiceErrorOptions<
  ERR_DEF extends INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"],
> {
  def: Omit<ERR_DEF, "schema">;
  /** Primary id — also the first entry in ids. */
  ids: ID[];
  /** All active ids with their context values (supports multi-id). */
  contexts: TErrorDataForIdMap<ERR_DEF["schema"]>;
  message: string;
  wasntNice?: boolean;
  httpStatusCode?: number;
  originError?: IRegularErrorJsonObject | undefined;
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

  readonly def: Omit<ERR_DEF, "schema">;
  /** Primary / first id. */
  readonly ids: ACTIVE_IDS[];
  readonly wasntNice: boolean;
  readonly httpStatusCode: number;
  readonly originError?: IRegularErrorJsonObject;

  /** Internal: all active id → context pairs. */
  protected readonly _contexts: TErrorDataForIdMap<ERR_DEF["schema"]>;

  // -------------------------------------------------------------------------
  // Constructors
  // -------------------------------------------------------------------------
  /** Full construction via NiceErrorDefined helpers. */
  constructor(options: INiceErrorOptions<ERR_DEF, ACTIVE_IDS>) {
    super(options.message);

    this.def = options.def;
    this.ids = options.ids;
    this._contexts = options.contexts;
    this.wasntNice = options.wasntNice ?? false;
    this.httpStatusCode = options.httpStatusCode ?? 500;

    if (options.originError != null) {
      this.originError = options.originError;
    }
  }

  // -------------------------------------------------------------------------
  // hasId — narrows ACTIVE_IDS to exactly ID
  // -------------------------------------------------------------------------

  /**
   * Type guard: returns `true` if this error was created with (or contains) the
   * given `id`. After the guard, `getContext(id)` will be strongly typed.
   */
  hasId<ID extends keyof ERR_DEF["schema"]>(id: ID): this is NiceError<ERR_DEF, ID> {
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
  getContext<ID extends ACTIVE_IDS>(id: ID): ContextOf<ERR_DEF["schema"], ID> {
    return (this._contexts as Record<string, unknown>)[id as string] as ContextOf<
      ERR_DEF["schema"],
      ID
    >;
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

    const def = {
      domain: this.def.domain,
      allDomains: this.def.allDomains,
    } as Omit<ERR_DEF, "schema">;

    if (this.def.defaultHttpStatusCode != null) {
      def["defaultHttpStatusCode"] = this.def.defaultHttpStatusCode;
    }

    if (this.def.defaultMessage != null) {
      def["defaultMessage"] = this.def.defaultMessage;
    }

    return {
      name: "NiceError",
      def,
      ids: this.ids,
      contexts: this._contexts,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      originError,
    };
  }
}
