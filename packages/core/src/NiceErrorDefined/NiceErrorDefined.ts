import type {
  IDefineNewNiceErrorDomainOptions,
  INiceErrorDefinedProps,
} from "./defineNiceError.types";

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
}
