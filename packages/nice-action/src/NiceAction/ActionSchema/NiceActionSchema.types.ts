import { type JSONSerializableValue, NiceErrorDefined } from "@nice-error/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";

export type TTransportedValue<
  RAW_VAL = never,
  SERDE_VAL extends JSONSerializableValue = never,
> = RAW_VAL extends JSONSerializableValue ? [RAW_VAL] | [RAW_VAL, SERDE_VAL] : [RAW_VAL, SERDE_VAL];

export type TNiceActionSerializationDefinition<
  RAW_VAL = any,
  SERDE_VAL extends JSONSerializableValue = JSONSerializableValue,
> = {
  serialize: (value: RAW_VAL) => SERDE_VAL;
  deserialize: (value: SERDE_VAL) => RAW_VAL;
};

export type TNiceActonSchemaInputOptions<
  VS extends StandardSchemaV1 = StandardSchemaV1,
  SERDE_IN extends JSONSerializableValue = JSONSerializableValue,
> =
  StandardSchemaV1.InferInput<VS> extends JSONSerializableValue
    ? {
        schema: VS;
        serialization?: TNiceActionSerializationDefinition<
          StandardSchemaV1.InferInput<VS>,
          SERDE_IN
        >;
      }
    : {
        schema: VS;
        serialization: TNiceActionSerializationDefinition<
          StandardSchemaV1.InferInput<VS>,
          SERDE_IN
        >;
      };

export type TNiceActionErrorDomainAndDefinition<ERR extends NiceErrorDefined> = {
  [key in ERR["domain"]]: ERR;
};

export type TNiceActionErrorDomains<ERRS extends NiceErrorDefined[]> =
  TNiceActionErrorDomainAndDefinition<ERRS[number]>;
