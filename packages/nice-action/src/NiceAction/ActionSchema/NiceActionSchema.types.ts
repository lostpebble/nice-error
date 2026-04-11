import type { JSONSerializableValue, NiceErrorDefined } from "@nice-error/core";

export type TTransportedValue<
  RAW_VAL,
  SERDE_VAL extends JSONSerializableValue,
> = RAW_VAL extends JSONSerializableValue ? [RAW_VAL] | [RAW_VAL, SERDE_VAL] : [RAW_VAL, SERDE_VAL];

export interface INiceActionSchema<
  INPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  OUTPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  ERRORS extends NiceErrorDefined[] = NiceErrorDefined[],
> {
  input: INPUT;
  output: OUTPUT;
  errors: ERRORS;
}
