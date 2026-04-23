import type { RuntimeName } from "std-env";

export interface IRuntimeMeta {
  assumed: boolean;
  runtimeName: RuntimeName;
}

export interface IActionRuntimeEnvironment_JsonObject {
  envId: string;
  memCuid: string;
  timeCreated: number;
  runtimeInfo: IRuntimeMeta;
}

export interface IRuntimeEnvironmentMeta {
  envId?: string;
  runtimeInfo: IRuntimeMeta;
}
