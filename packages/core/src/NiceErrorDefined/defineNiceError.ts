import type { IDefineNewNiceErrorDomainOptions } from "../NiceError/NiceError.types";
import { NiceErrorDefined } from "./NiceErrorDefined";

export const defineNiceError = <ERR_DEF extends IDefineNewNiceErrorDomainOptions>(
  definition: ERR_DEF,
) => {
  return new NiceErrorDefined<{
    domain: ERR_DEF["domain"];
    allDomains: [ERR_DEF["domain"]];
  }>({
    domain: definition.domain,
    allDomains: [definition.domain],
  });
};
