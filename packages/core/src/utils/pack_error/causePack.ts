import type { NiceError } from "../../NiceError/NiceError";
import { DUR_OBJ_PACK_PREFIX, DUR_OBJ_PACK_SUFFIX } from "../../NiceError/nice_error.static";

export const causePack = (error: NiceError<any, any>) => {
  const err = new Error();

  Object.assign(err, error);

  err.cause = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;

  return err;
};
