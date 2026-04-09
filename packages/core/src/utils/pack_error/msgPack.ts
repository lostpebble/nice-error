import type { NiceError } from "../../NiceError/NiceError";
import { DUR_OBJ_PACK_PREFIX, DUR_OBJ_PACK_SUFFIX } from "../../NiceError/nice_error.static";

export const msgPack = (error: NiceError<any, any>) => {
  return new Error(
    `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`,
  );
};
