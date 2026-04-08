import type {
  IDefineNewNiceErrorDomainOptions,
  INiceErrorIdMetadata,
  TNiceErrorSchema,
} from "../NiceError/NiceError.types";
import { NiceErrorDefined } from "./NiceErrorDefined";

export const defineNiceError = <ERR_DOMAIN extends string, SCHEMA extends TNiceErrorSchema>(
  definition: IDefineNewNiceErrorDomainOptions<ERR_DOMAIN, SCHEMA>,
) => {
  return new NiceErrorDefined<{
    domain: ERR_DOMAIN;
    allDomains: [ERR_DOMAIN];
    schema: SCHEMA;
  }>({
    domain: definition.domain,
    allDomains: [definition.domain],
    schema: definition.schema,
  });
};

export const err = <C = never>(
  meta: INiceErrorIdMetadata<C> = {} as INiceErrorIdMetadata<C>,
): INiceErrorIdMetadata<C> => meta;
