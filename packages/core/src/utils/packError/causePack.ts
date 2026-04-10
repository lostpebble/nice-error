import type { NiceError } from "../../NiceError/NiceError";
import { DUR_OBJ_PACK_PREFIX, DUR_OBJ_PACK_SUFFIX } from "../../NiceError/nice_error.static";
import { EErrorPackType } from "./packError.enums";

export const causePack = <E extends NiceError<any, any>>(error: E): E => {
  error._packedState = { cause: error.cause, packedAs: EErrorPackType.cause_pack };
  error.cause = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
};
