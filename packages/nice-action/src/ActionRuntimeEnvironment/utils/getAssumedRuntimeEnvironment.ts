import { runtime } from "std-env";
import type { IRuntimeMeta } from "../ActionRuntimeEnvironment.types";

export const getAssumedRuntimeInfo = (): IRuntimeMeta => {
  return {
    assumed: true,
    runtimeName: runtime,
  };
};
