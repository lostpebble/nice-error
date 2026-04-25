import type { IConnectionConfig } from "./ConnectionConfig.types";

export class ConnectionConfig<K extends string | undefined = undefined> {
  constructor(
    readonly config: IConnectionConfig,
    readonly routeKey?: K,
  ) {}
}
