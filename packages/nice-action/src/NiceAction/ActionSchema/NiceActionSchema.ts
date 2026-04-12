import {
  err_cast_not_nice,
  type INiceErrorDefinedProps,
  type InferNiceError,
  type JSONSerializableValue,
  type NiceErrorDefined,
} from "@nice-error/core";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  INiceActionErrorDeclaration,
  TInferDeclaredErrors,
  TNiceActonSchemaInputOptions,
  TTransportedValue,
} from "./NiceActionSchema.types";

export class NiceActionSchema<
  INPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  OUTPUT extends TTransportedValue<any, any> = TTransportedValue<any>,
  ERRORS extends readonly INiceActionErrorDeclaration<any, any>[] = readonly [],
> {
  private _errorDeclarations: INiceActionErrorDeclaration[] = [];
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
   * Declare that this action may throw any error from `domain`.
   * `TInferActionError` will include `NiceError<DEF, keyof schema>` in its union.
   */
  throws<ERR_DEF extends INiceErrorDefinedProps>(
    domain: NiceErrorDefined<ERR_DEF>,
  ): NiceActionSchema<
    INPUT,
    OUTPUT,
    readonly [...ERRORS, INiceActionErrorDeclaration<ERR_DEF, keyof ERR_DEF["schema"] & string>]
  >;

  /**
   * Declare that this action may throw only the listed `ids` from `domain`.
   * `TInferActionError` will include `NiceError<DEF, IDS[number]>` narrowed to those IDs.
   */
  throws<
    ERR_DEF extends INiceErrorDefinedProps,
    IDS extends ReadonlyArray<keyof ERR_DEF["schema"] & string>,
  >(
    domain: NiceErrorDefined<ERR_DEF>,
    ids: IDS,
  ): NiceActionSchema<
    INPUT,
    OUTPUT,
    readonly [...ERRORS, INiceActionErrorDeclaration<ERR_DEF, IDS[number] & string>]
  >;

  throws(
    domain: NiceErrorDefined<any>,
    ids?: ReadonlyArray<string>,
  ): NiceActionSchema<any, any, any> {
    this._errorDeclarations.push({ _domain: domain, _ids: ids });
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

// ---------------------------------------------------------------------------
// TInferActionError — lives here (not in .types) to avoid circular imports
// ---------------------------------------------------------------------------

/**
 * Infers the full error union that a `NiceActionSchema` may throw.
 *
 * Includes every declared `NiceError<DEF, IDS>` from `.throws()` calls, plus
 * `InferNiceError<typeof err_cast_not_nice>` as the always-present fallback
 * for any unrecognized thrown value.
 *
 * @example
 * ```ts
 * const payAction = action()
 *   .input({ schema: v.object({ amount: v.number() }) })
 *   .throws(err_payment)
 *   .throws(err_auth, ["unauthenticated"] as const);
 *
 * type PayError = TInferActionError<typeof payAction>;
 * // → NiceError<ErrPaymentDef, keyof ErrPaymentSchema>
 * //   | NiceError<ErrAuthDef, "unauthenticated">
 * //   | NiceError<ErrCastNotNiceDef, keyof ErrCastNotNiceSchema>
 * ```
 */
export type TInferActionError<SCH> =
  SCH extends NiceActionSchema<any, any, infer DECLS>
    ? DECLS extends readonly INiceActionErrorDeclaration[]
      ? TInferDeclaredErrors<DECLS> | InferNiceError<typeof err_cast_not_nice>
      : InferNiceError<typeof err_cast_not_nice>
    : never;
