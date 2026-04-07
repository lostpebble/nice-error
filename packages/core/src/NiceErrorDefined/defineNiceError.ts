import type { IDefineNewNiceErrorDomainOptions, TSchema } from "../NiceError/NiceError.types";
import { NiceErrorDefined } from "./NiceErrorDefined";

export const defineNiceError = <ERR_DEF extends IDefineNewNiceErrorDomainOptions>(
  definition: ERR_DEF,
) => {
  type Schema = ERR_DEF["schema"] extends TSchema ? ERR_DEF["schema"] : Record<never, never>;

  return new NiceErrorDefined<{
    domain: ERR_DEF["domain"];
    allDomains: [ERR_DEF["domain"]];
    schema: Schema;
  }>({
    domain: definition.domain,
    allDomains: [definition.domain] as [ERR_DEF["domain"]],
    schema: (definition.schema ?? {}) as Schema,
  });
};

