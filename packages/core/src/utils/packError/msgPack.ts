import type { NiceError } from "../../NiceError/NiceError";
import { DUR_OBJ_PACK_PREFIX, DUR_OBJ_PACK_SUFFIX } from "../../NiceError/nice_error.static";
import { EErrorPackType } from "./packError.enums";

export const msgPack = <E extends NiceError<any, any>>(error: E): E => {
  error._packedState = { message: error.message, packedAs: EErrorPackType.msg_pack };
  error.message = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
};
