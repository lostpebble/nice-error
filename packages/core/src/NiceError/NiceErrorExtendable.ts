import { type INiceErrorOptions, NiceError } from "./NiceError";
import type {
  INiceErrorDefinedProps,
  TUnknownNiceErrorDef,
  TUnknownNiceErrorId,
} from "./NiceError.types";

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
}
