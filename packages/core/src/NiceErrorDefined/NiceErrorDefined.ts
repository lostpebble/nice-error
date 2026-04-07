import { NiceError } from "../NiceError/NiceError";
import type {
  IDefineNewNiceErrorDomainOptions,
  INiceErrorDefinedProps,
  TFromIdContextArgs,
  TSchema,
  TSchemaEntry,
} from "../NiceError/NiceError.types";

export class NiceErrorDefined<ERR_DEF extends INiceErrorDefinedProps> {
  domain: ERR_DEF["domain"];
  allDomains: ERR_DEF["allDomains"];
  schema: ERR_DEF["schema"];

  constructor(definition: ERR_DEF) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this.schema = definition.schema;
  }

  createChildDomain<SUB_ERR_DEF extends IDefineNewNiceErrorDomainOptions>(
    subErrorDef: SUB_ERR_DEF,
  ): NiceErrorDefined<{
    domain: SUB_ERR_DEF["domain"];
    allDomains: [SUB_ERR_DEF["domain"], ...ERR_DEF["allDomains"]];
    schema: SUB_ERR_DEF["schema"] extends TSchema
      ? SUB_ERR_DEF["schema"]
      : Record<never, never>;
  }> {
    type SubSchema = SUB_ERR_DEF["schema"] extends TSchema
      ? SUB_ERR_DEF["schema"]
      : Record<never, never>;

    return new NiceErrorDefined<{
      domain: SUB_ERR_DEF["domain"];
      allDomains: [SUB_ERR_DEF["domain"], ...ERR_DEF["allDomains"]];
      schema: SubSchema;
    }>({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains] as [
        SUB_ERR_DEF["domain"],
        ...ERR_DEF["allDomains"],
      ],
      schema: (subErrorDef.schema ?? {}) as SubSchema,
    });
  }

  fromId<ERR_ID extends keyof ERR_DEF["schema"]>(
    id: ERR_ID,
    ...args: TFromIdContextArgs<ERR_DEF["schema"][ERR_ID]>
  ): NiceError<ERR_DEF, ERR_ID> {
    const context = args[0] as ERR_DEF["schema"][ERR_ID] extends { context: { type: infer C } }
      ? C
      : undefined;

    const schemaEntry = (this.schema as Record<string, TSchemaEntry>)[id as string];

    let message: string;
    if (schemaEntry?.message != null) {
      if (typeof schemaEntry.message === "function") {
        message = schemaEntry.message(context);
      } else {
        message = schemaEntry.message;
      }
    } else {
      message = String(id);
    }

    return new NiceError<ERR_DEF, ERR_ID>({
      id,
      def: { domain: this.domain, allDomains: this.allDomains, schema: this.schema } as ERR_DEF,
      message,
      context: context as any,
      httpStatusCode:
        typeof schemaEntry?.httpStatusCode === "number" ? schemaEntry.httpStatusCode : 500,
    });
  }
}

