import { type INiceErrorOptions, NiceError } from "./NiceError";
import type {
  ExtractFromIdContextArg,
  INiceErrorDefinedProps,
  TErrorDataForIdMap,
  TFromContextInput,
  TUnknownNiceErrorDef,
  TUnknownNiceErrorId,
} from "./NiceError.types";

/**
 * Resolves the args tuple for `addId`:
 * - No context defined on the entry → `[id]`
 * - Context defined → `[id, context]`
 */
type AddIdArgs<ERR_DEF extends INiceErrorDefinedProps, K extends keyof ERR_DEF["schema"] & string> =
  ExtractFromIdContextArg<ERR_DEF["schema"][K]> extends undefined
    ? [id: K]
    : [id: K, context: ExtractFromIdContextArg<ERR_DEF["schema"][K]>];

/** Full-featured construction from NiceErrorDefined.fromId / fromContext. */
export interface INiceErrorExtendableOptions<
  ERR_DEF extends INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"],
> extends INiceErrorOptions<ERR_DEF, ID> {
  def: ERR_DEF;
}

export class NiceErrorExtendable<
  ERR_DEF extends INiceErrorDefinedProps = TUnknownNiceErrorDef,
  /**
   * Union of active error-id keys.
   * - After `fromId(id)`: exactly one key.
   * - After `fromContext({...})`: a union of all supplied keys.
   * - After `hasOneOfIds([a,b])`: narrows to that subset.
   * - Default (bare construction / castNiceError): `TUnknownNiceErrorId`.
   */
  ACTIVE_IDS extends keyof ERR_DEF["schema"] = TUnknownNiceErrorId,
> extends NiceError<ERR_DEF, ACTIVE_IDS> {
  override readonly def: ERR_DEF;

  constructor(options: INiceErrorExtendableOptions<ERR_DEF, ACTIVE_IDS>) {
    super(options);
    this.def = options.def;
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
  ): NiceErrorExtendable<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)> {
    const mergedContexts = { ...this._contexts, ...context } as TErrorDataForIdMap<
      ERR_DEF["schema"]
    >;
    const mergedIds = Array.from(new Set([...this.getIds(), ...Object.keys(context)])) as Array<
      ACTIVE_IDS | (keyof INPUT & string)
    >;

    return new NiceErrorExtendable<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)>({
      def: this.def,
      ids: mergedIds,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    } as INiceErrorExtendableOptions<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)>);
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
  ): NiceErrorExtendable<ERR_DEF, ACTIVE_IDS | K> {
    const [id, context] = args as [K, unknown];
    const mergedContexts = { ...this._contexts, [id]: context } as TErrorDataForIdMap<
      ERR_DEF["schema"]
    >;
    const mergedIds = Array.from(new Set([...this.getIds(), id])) as Array<ACTIVE_IDS | K>;

    return new NiceErrorExtendable<ERR_DEF, ACTIVE_IDS | K>({
      def: this.def,
      ids: mergedIds,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    } as INiceErrorExtendableOptions<ERR_DEF, ACTIVE_IDS | K>);
  }
}
