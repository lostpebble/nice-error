import type { JSONSerializableValue, NiceErrorDefined } from "@nice-error/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  TNiceActionErrorDomains,
  TNiceActonSchemaInputOptions,
  TTransportedValue,
} from "./NiceActionSchema.types";

export class NiceActionSchema<
  INPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  OUTPUT extends TTransportedValue<any, any> = TTransportedValue<any>,
  ERRORS extends NiceErrorDefined[] = NiceErrorDefined[],
> {
  private errorDomains: TNiceActionErrorDomains<ERRORS> = {} as any;
  private inputOptions: TNiceActonSchemaInputOptions<any, any> | undefined;
  private outputOptions: TNiceActonSchemaInputOptions<any, any> | undefined;

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

  /**
   * Serialize raw input to a JSON-serializable form.
   * Uses the schema's serialization.serialize if defined; otherwise the input
   * is already JSON-native and is returned as-is.
   */
  serializeInput(rawInput: INPUT[0]): JSONSerializableValue {
    if (this.inputOptions?.serialization) {
      return this.inputOptions.serialization.serialize(rawInput);
    }
    return rawInput as JSONSerializableValue;
  }

  /**
   * Deserialize a JSON value back into the raw input type.
   * Uses serialization.deserialize if defined; otherwise the value is cast
   * directly (it's already in the correct shape).
   */
  deserializeInput(serialized: JSONSerializableValue): INPUT[0] {
    if (this.inputOptions?.serialization) {
      return this.inputOptions.serialization.deserialize(serialized as any);
    }
    return serialized as INPUT[0];
  }

  /**
   * Serialize raw output to a JSON-serializable form.
   */
  serializeOutput(rawOutput: OUTPUT[0]): JSONSerializableValue {
    if (this.outputOptions?.serialization) {
      return this.outputOptions.serialization.serialize(rawOutput);
    }
    return rawOutput as JSONSerializableValue;
  }

  /**
   * Deserialize a JSON value back into the raw output type.
   */
  deserializeOutput(serialized: JSONSerializableValue): OUTPUT[0] {
    if (this.outputOptions?.serialization) {
      return this.outputOptions.serialization.deserialize(serialized as any);
    }
    return serialized as OUTPUT[0];
  }
}
