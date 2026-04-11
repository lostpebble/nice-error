import type { JSONSerializableValue, NiceErrorDefined } from "@nice-error/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  TNiceActionErrorDomains,
  TNiceActonSchemaInputOptions,
  TTransportedValue,
} from "./NiceActionSchema.types";

export class NiceActionSchema<
  INPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  OUTPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  ERRORS extends NiceErrorDefined[] = NiceErrorDefined[],
> {
  private errorDomains: TNiceActionErrorDomains<ERRORS> = {} as any;
  private inputOptions: TNiceActonSchemaInputOptions<any, any> | undefined;
  private outputOptions: TNiceActonSchemaInputOptions<any, any> | undefined;
  private readonly inputSchema?: StandardSchemaV1;

  input<
    VS extends StandardSchemaV1 = StandardSchemaV1,
    SERDE_IN extends JSONSerializableValue = never,
  >(
    options: TNiceActonSchemaInputOptions<VS, SERDE_IN>,
  ): NiceActionSchema<
    TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_IN>,
    OUTPUT,
    ERRORS
  > {
    this.inputOptions = options;
    return this as any;
  }

  output<
    VS extends StandardSchemaV1 = StandardSchemaV1,
    SERDE_OUT extends JSONSerializableValue = JSONSerializableValue,
  >(
    options: TNiceActonSchemaInputOptions<VS, SERDE_OUT>,
  ): NiceActionSchema<
    INPUT,
    TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_OUT>,
    ERRORS
  > {
    this.outputOptions = options;
    return this as any;
  }
}
