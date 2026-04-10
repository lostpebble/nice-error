import type { NiceErrorDefined } from "../NiceErrorDefined/NiceErrorDefined";
import type { IErrorCase } from "../utils/handleWith";
import { jsErrorOrCastJsError } from "../utils/jsErrorOrCastJsError";
import { packError } from "../utils/packError/packError";
import { EErrorPackType } from "../utils/packError/packError.enums";
import { EContextSerializedState } from "./NiceError.enums";
import {
  type INiceErrorDefinedProps,
  type INiceErrorJsonObject,
  type IRegularErrorJsonObject,
  type TErrorDataForIdMap,
  type TErrorReconciledData,
  type TExtractContextType,
  type TNiceErrorSchema,
  type TSerializedContextState,
  type TSerializedErrorDataMap,
  type TUnknownNiceErrorDef,
} from "./NiceError.types";
import type { NiceErrorHydrated } from "./NiceErrorHydrated";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type ContextOf<S extends TNiceErrorSchema, K extends keyof S> = TExtractContextType<S[K]>;

// ---------------------------------------------------------------------------
// Constructor options
// ---------------------------------------------------------------------------

/** Full-featured construction from NiceErrorDefined.fromId / fromContext. */
export interface INiceErrorOptions<
  ERR_DEF extends INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"],
> {
  def: Omit<ERR_DEF, "schema">;
  /** Primary id is first entry in ids. */
  ids: ID[];
  /** All active ids with their messages, http status codes, and context state. */
  errorData: TErrorDataForIdMap<ERR_DEF["schema"]>;
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
  ACTIVE_IDS extends keyof ERR_DEF["schema"] = keyof ERR_DEF["schema"],
> extends Error {
  override readonly name = "NiceError" as const;

  readonly def: Omit<ERR_DEF, "schema">;
  /** Primary id is first entry in ids. */
  readonly ids: ACTIVE_IDS[];
  readonly wasntNice: boolean;
  readonly httpStatusCode: number;
  originError?: IRegularErrorJsonObject;

  _packedState?:
    | { packedAs: EErrorPackType.cause_pack; cause: unknown }
    | { packedAs: EErrorPackType.msg_pack; message: string }
    | undefined;

  /** Internal: all active id → reconciled data pairs. */
  protected readonly _errorDataMap: TErrorDataForIdMap<ERR_DEF["schema"]>;

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  constructor(options: INiceErrorOptions<ERR_DEF, ACTIVE_IDS>) {
    super(options.message);

    this.def = options.def;
    this.ids = options.ids;
    this._errorDataMap = options.errorData;
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
    return id in this._errorDataMap;
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
    return ids.some((id) => id in this._errorDataMap);
  }

  // -------------------------------------------------------------------------
  // get hasMultiple
  // -------------------------------------------------------------------------

  /** `true` when this error was created with more than one id (via `fromContext`). */
  get hasMultiple(): boolean {
    return Object.keys(this._errorDataMap).length > 1;
  }

  // -------------------------------------------------------------------------
  // getIds
  // -------------------------------------------------------------------------

  /** Returns all active error ids on this instance. */
  getIds(): Array<ACTIVE_IDS> {
    return Object.keys(this._errorDataMap) as Array<ACTIVE_IDS>;
  }

  // -------------------------------------------------------------------------
  // getContext — strongly typed per ACTIVE_IDS
  // -------------------------------------------------------------------------

  /**
   * Returns the typed context value for the given error id.
   *
   * TypeScript will only allow you to call this with an id that is part of
   * `ACTIVE_IDS` (i.e. an id confirmed via `hasId` / `hasOneOfIds`, or passed
   * to `fromId` / `fromContext`).
   *
   * @throws If the context is in the `"unhydrated"` state — the error was
   * reconstructed from a JSON payload and its context has a custom serializer
   * that hasn't been run yet. Call `niceErrorDefined.hydrate(error)` first.
   */
  getContext<ID extends ACTIVE_IDS>(id: ID): ContextOf<ERR_DEF["schema"], ID> {
    const errorData = this._errorDataMap[id];
    const state = errorData?.contextState;

    if (state == null) {
      return undefined as ContextOf<ERR_DEF["schema"], ID>;
    }

    if (state.kind === "unhydrated") {
      throw new Error(
        `[NiceError.getContext] Context for id "${String(id)}" is in the "unhydrated" state. ` +
          `The error was reconstructed from a serialized payload but has not been deserialized yet. ` +
          `Call \`niceErrorDefined.hydrate(error)\` to reconstruct the typed context.`,
      );
    }

    // "raw_unset" | "hydrated" — both carry `value`
    return state.value as ContextOf<ERR_DEF["schema"], ID>;
  }

  // -------------------------------------------------------------------------
  // getErrorDataForId
  // -------------------------------------------------------------------------

  getErrorDataForId<ID extends ACTIVE_IDS>(
    id: ID,
  ): TErrorReconciledData<ERR_DEF["schema"], ID> | undefined {
    return this._errorDataMap[id] as TErrorReconciledData<ERR_DEF["schema"], ID> | undefined;
  }

  // -------------------------------------------------------------------------
  // withOriginError
  // -------------------------------------------------------------------------

  withOriginError(error: unknown): this {
    this.originError = jsErrorOrCastJsError(error);
    this.cause = this.originError;
    return this;
  }

  // -------------------------------------------------------------------------
  // matches — fingerprint comparison
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if `other` has the same domain and the exact same set of
   * active error ids as this error (order-independent).
   *
   * Useful for deduplication, retry logic, and asserting that two errors
   * represent the same "kind" of problem without comparing context values.
   *
   * ```ts
   * const a = err_auth.fromId("invalid_credentials", { username: "alice" });
   * const b = err_auth.fromId("invalid_credentials", { username: "bob" });
   * a.matches(b); // true  — same domain + same id set
   *
   * const c = err_auth.fromId("account_locked");
   * a.matches(c); // false — same domain, different id
   * ```
   */
  matches(other: NiceError<any, any>): boolean {
    const myDef = this.def as unknown as INiceErrorDefinedProps;
    const otherDef = other.def as unknown as INiceErrorDefinedProps;
    if (myDef.domain !== otherDef.domain) return false;

    const myIds = this.getIds().map(String).sort();
    const otherIds = other.getIds().map(String).sort();
    if (myIds.length !== otherIds.length) return false;
    return myIds.every((id, i) => id === otherIds[i]);
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

    // Downgrade "hydrated" → "unhydrated" so the serialized form never carries a
    // stale `"hydrated"` discriminant that would survive a JSON round-trip.
    const errorData: TSerializedErrorDataMap<ERR_DEF["schema"]> = {};

    for (const rawId of Object.keys(this._errorDataMap)) {
      const id = rawId as keyof ERR_DEF["schema"];
      const data = this._errorDataMap[id];
      if (data == null) continue;

      let contextState: TSerializedContextState<any>;

      if (data.contextState.kind === EContextSerializedState.hydrated) {
        // Drop `value` (may not be JSON-safe); keep `serialized` for later hydration.
        contextState = {
          kind: EContextSerializedState.unhydrated,
          serialized: data.contextState.serialized,
        };
      } else {
        contextState = data.contextState;
      }

      errorData[id] = { contextState, message: data.message, httpStatusCode: data.httpStatusCode };
    }

    return {
      name: "NiceError",
      def,
      ids: this.ids,
      errorData,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      ...(this.stack !== undefined ? { stack: this.stack } : {}),
      originError,
    };
  }

  // -------------------------------------------------------------------------
  // hydrate — convenience delegation to NiceErrorDefined
  // -------------------------------------------------------------------------

  hydrate(definedNiceError: NiceErrorDefined<ERR_DEF>): NiceErrorHydrated<ERR_DEF, ACTIVE_IDS> {
    return definedNiceError.hydrate(this);
  }

  // -------------------------------------------------------------------------
  // handleWith — synchronous domain-dispatched error handling
  // -------------------------------------------------------------------------

  /**
   * Iterates `cases` in order, finds the first whose domain matches this error
   * (via `is()`), optionally further filters by active ids, hydrates the error,
   * calls the handler, and returns `true`. Returns `false` if no case matched.
   *
   * Build cases with `forDomain` (any id in the domain) or `forIds` (specific
   * id subset). Handlers are invoked synchronously — any returned Promise is
   * not awaited. Use `handleWithAsync` when handlers are async.
   *
   * @example
   * ```ts
   * const handled = error.handleWith([
   *   forIds(err_feature, ["not_found"], (h) => {
   *     res.status(404).json({ missing: h.getContext("not_found").resource });
   *   }),
   *   forDomain(err_feature, (h) => {
   *     matchFirst(h, {
   *       forbidden: ({ userId }) => res.status(403).json({ userId }),
   *       _: () => res.status(500).end(),
   *     });
   *   }),
   *   forDomain(err_service, (h) => {
   *     res.status(h.httpStatusCode).json({ error: h.message });
   *   }),
   * ]);
   * if (!handled) next(error);
   * ```
   */
  handleWith(cases: ReadonlyArray<IErrorCase<any, any>>): boolean {
    for (const c of cases) {
      if (!c._domain.is(this)) continue;
      if (c._ids !== undefined && !this.hasOneOfIds(c._ids as any)) continue;
      c._handler(c._domain.hydrate(this as any) as any);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // handleWithAsync — async domain-dispatched error handling
  // -------------------------------------------------------------------------

  /**
   * Same matching logic as `handleWith`, but `await`s the handler's returned
   * Promise before resolving. Use this when your handlers perform async work
   * (database writes, HTTP calls, etc.).
   *
   * @example
   * ```ts
   * const handled = await error.handleWithAsync([
   *   forDomain(err_payments, async (h) => {
   *     await db.logFailedPayment(h);
   *     await notifyOps(h.message);
   *   }),
   * ]);
   * ```
   */
  async handleWithAsync(cases: ReadonlyArray<IErrorCase<any, any>>): Promise<boolean> {
    for (const c of cases) {
      if (!c._domain.is(this)) continue;
      if (c._ids !== undefined && !this.hasOneOfIds(c._ids as any)) continue;
      await c._handler(c._domain.hydrate(this as any) as any);
      return true;
    }
    return false;
  }

  pack(packType: EErrorPackType = "msg_pack" as EErrorPackType): this {
    if (this._packedState != null) return this;
    return packError(this, packType);
  }

  unpack(): this {
    if (this._packedState == null) return this;

    if (this._packedState.packedAs === EErrorPackType.msg_pack) {
      this.message = this._packedState.message;
    }

    if (this._packedState.packedAs === EErrorPackType.cause_pack) {
      this.cause = this._packedState.cause;
    }

    this._packedState = undefined;
    delete this._packedState;

    return this;
  }
}
