import { NiceError } from "../NiceError/NiceError";
import type { INiceErrorDefinedProps } from "../NiceError/NiceError.types";
import type { IDefineNewNiceErrorDomainOptions } from "./defineNiceError.types";

export class NiceErrorDefined<ERR_DEF extends INiceErrorDefinedProps> {
  domain: ERR_DEF["domain"];
  allDomains: ERR_DEF["allDomains"];

  constructor(definition: ERR_DEF) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
  }

  createChildDomain<SUB_ERR_DEF extends IDefineNewNiceErrorDomainOptions>(
    subErrorDef: SUB_ERR_DEF,
  ): NiceErrorDefined<{
    domain: SUB_ERR_DEF["domain"];
    allDomains: [SUB_ERR_DEF["domain"], ...ERR_DEF["allDomains"]];
  }> {
    return new NiceErrorDefined<{
      domain: SUB_ERR_DEF["domain"];
      allDomains: [SUB_ERR_DEF["domain"], ...ERR_DEF["allDomains"]];
    }>({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains],
    });
  }

  fromId<ERR_ID extends keyof ERR_DEF["schema"]>(
    id: ERR_ID,
    context: ERR_DEF["schema"][ERR_ID]["context"],
  ): NiceError {
    // Implementation would create a NiceError instance based on the provided id and context, using the schema defined in ERR_DEF. This is a placeholder implementation.
    return new NiceError({
      name: "NiceError",
      message:
        typeof ERR_DEF["schema"][id]["message"] === "function"
          ? (ERR_DEF["schema"][id]["message"] as Function)(context)
          : (ERR_DEF["schema"][id]["message"] as string) || "",
      stack: undefined,
      cause: undefined,
    });
  }
}
