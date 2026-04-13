import type { NiceErrorDefined } from "../NiceErrorDefined/NiceErrorDefined";
import { type INiceErrorOptions, NiceError } from "./NiceError";
import type {
  ExtractFromIdContextArg,
  FromIdArgs,
  INiceErrorDefinedProps,
  TErrorDataForIdMap,
  TFromContextInput,
  TUnknownNiceErrorDef,
} from "./NiceError.types";

/**
 * Resolves the args tuple for `addId` — mirrors `FromIdArgs` exactly so that
 * optional vs required context is consistent across both `fromId` and `addId`.
 *
 * - No context on this id                   → `[id]`
 * - Context defined, `required: true`       → `[id, context]`
 * - Context defined, `required` absent/false → `[id] | [id, context]`
 */
type AddIdArgs<
  ERR_DEF extends INiceErrorDefinedProps,
  K extends keyof ERR_DEF["schema"] & string,
> = [ExtractFromIdContextArg<ERR_DEF["schema"][K]>] extends [undefined]
  ? [id: K]
  : [undefined] extends [ExtractFromIdContextArg<ERR_DEF["schema"][K]>]
    ? [id: K] | [id: K, context: NonNullable<ExtractFromIdContextArg<ERR_DEF["schema"][K]>>]
    : [id: K, context: ExtractFromIdContextArg<ERR_DEF["schema"][K]>];

/** Full-featured construction from NiceErrorDefined.fromId / fromContext. */
export interface INiceErrorHydratedOptions<
  ERR_DEF extends INiceErrorDefinedProps,
  ID extends keyof ERR_DEF["schema"] & string,
> extends INiceErrorOptions<ERR_DEF, ID> {
  def: ERR_DEF;
  niceErrorDefined: NiceErrorDefined<ERR_DEF>;
}

export class NiceErrorHydrated<
  ERR_DEF extends INiceErrorDefinedProps = TUnknownNiceErrorDef,
  /**
   * Union of active error-id keys.
   * - After `fromId(id)`: exactly one key.
   * - After `fromContext({...})`: a union of all supplied keys.
   * - After `hasOneOfIds([a,b])`: narrows to that subset.
   * - Default (bare construction / castNiceError): `TUnknownNiceErrorId`.
   */
  ACTIVE_IDS extends keyof ERR_DEF["schema"] & string = keyof ERR_DEF["schema"] & string,
> extends NiceError<ERR_DEF, ACTIVE_IDS> {
  override readonly def: ERR_DEF;
  private readonly niceErrorDefined: NiceErrorDefined<ERR_DEF>;

  constructor(options: INiceErrorHydratedOptions<ERR_DEF, ACTIVE_IDS>) {
    super(options);
    this.def = options.def;
    this.niceErrorDefined = options.niceErrorDefined;
  }

  // -------------------------------------------------------------------------
  // addContext — merge additional id+context entries into this error
  // -------------------------------------------------------------------------

  /**
   * Returns a **new** `NiceErrorHydrated` with additional id+context entries merged in.
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
    context: INPUT & Record<Exclude<keyof INPUT, keyof ERR_DEF["schema"] & string>, never>,
  ): NiceErrorHydrated<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)> {
    const newIds = Object.keys(context) as Array<keyof ERR_DEF["schema"] & string>;
    const newErrorData: TErrorDataForIdMap<ERR_DEF["schema"]> = {};

    for (const id of newIds) {
      newErrorData[id] = this.niceErrorDefined.reconcileErrorDataForId(id, context[id]);
    }

    const mergedErrorData: TErrorDataForIdMap<ERR_DEF["schema"]> = {
      ...this._errorDataMap,
      ...newErrorData,
    };

    const mergedIds = Array.from(new Set([...this.getIds(), ...Object.keys(context)])) as Array<
      ACTIVE_IDS | (keyof INPUT & string)
    >;

    return new NiceErrorHydrated<ERR_DEF, ACTIVE_IDS | (keyof INPUT & string)>({
      def: this.def,
      niceErrorDefined: this.niceErrorDefined,
      ids: mergedIds,
      errorData: mergedErrorData,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    });
  }

  // -------------------------------------------------------------------------
  // addId — add a single id (with optional context) to this error
  // -------------------------------------------------------------------------

  /**
   * Returns a **new** `NiceErrorHydrated` with an additional error id (and its context,
   * if the schema requires one). Equivalent to `addContext({ [id]: context })`
   * but mirrors the `fromId` ergonomics for single-id additions.
   */
  addId<K extends keyof ERR_DEF["schema"] & string>(
    ...args: AddIdArgs<ERR_DEF, K>
  ): NiceErrorHydrated<ERR_DEF, ACTIVE_IDS | K> {
    const [id, context] = args as FromIdArgs<ERR_DEF, K>;

    const reconciledData = this.niceErrorDefined.reconcileErrorDataForId(id, context);

    const errorDataMap: TErrorDataForIdMap<ERR_DEF["schema"]> = {};
    errorDataMap[id] = reconciledData;

    const mergedContexts: TErrorDataForIdMap<ERR_DEF["schema"]> = {
      ...this._errorDataMap,
      ...errorDataMap,
    };
    const mergedIds = Array.from(new Set([...this.getIds(), id])) as Array<ACTIVE_IDS | K>;

    return new NiceErrorHydrated<ERR_DEF, ACTIVE_IDS | K>({
      def: this.def,
      niceErrorDefined: this.niceErrorDefined,
      ids: mergedIds,
      errorData: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError,
    });
  }
}
