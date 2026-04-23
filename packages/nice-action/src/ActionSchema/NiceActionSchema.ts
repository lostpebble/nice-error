import { extractMessageFromStandardSchema } from "@nice-code/common-errors";
import {
  err_cast_not_nice,
  type INiceErrorDomainProps,
  type InferNiceError,
  type JSONSerializableValue,
  type NiceErrorDomain,
} from "@nice-code/error";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as v from "valibot";
import { EErrId_NiceAction, err_nice_action } from "../errors/err_nice_action";
import type {
  INiceActionErrorDeclaration,
  TInferDeclaredErrors,
  TNiceActonSchemaOptions,
  TTransportedValue,
} from "./NiceActionSchema.types";

export class NiceActionSchema<
  INPUT extends TTransportedValue<any, any> = TTransportedValue<any, any>,
  OUTPUT extends TTransportedValue<any, any> = TTransportedValue<any>,
  ERRORS extends readonly INiceActionErrorDeclaration<any, any>[] = readonly [],
> {
  private _errorDeclarations: INiceActionErrorDeclaration[] = [];
  private inputOptions: TNiceActonSchemaOptions<any, any> | undefined;
  private outputOptions: TNiceActonSchemaOptions<any, any> | undefined;

  get inputSchema(): StandardSchemaV1 {
    return v.nullish(this.inputOptions?.schema);
  }

  get outputSchema(): StandardSchemaV1 | undefined {
    if (this.outputOptions?.schema == null) return undefined;
    return v.nullish(this.outputOptions.schema);
  }

  /**
   * Declare the input schema (JSON-native or with explicit SERDE type param).
   * For non-JSON-native inputs, prefer the 3-argument form below to avoid
   * needing explicit type parameters.
   */
  input<
    VS extends StandardSchemaV1 = StandardSchemaV1,
    SERDE_IN extends JSONSerializableValue = never,
  >(
    options: TNiceActonSchemaOptions<VS, SERDE_IN>,
  ): NiceActionSchema<TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_IN>, OUTPUT, ERRORS>;

  /**
   * Declare the input schema with serialization via sequential parameters.
   * TypeScript infers SERDE_IN from `serialize`'s return type (left-to-right),
   * then provides it as the contextual type for `deserialize`'s parameter —
   * no explicit type parameters or casts needed.
   */
  input<VS extends StandardSchemaV1, SERDE_IN extends JSONSerializableValue>(
    options: { schema: VS },
    serialize: (raw: StandardSchemaV1.InferInput<VS>) => SERDE_IN,
    deserialize: (serde: SERDE_IN) => StandardSchemaV1.InferInput<VS>,
  ): NiceActionSchema<TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_IN>, OUTPUT, ERRORS>;

  input(
    options: TNiceActonSchemaOptions<any, any>,
    serialize?: (raw: any) => any,
    deserialize?: (serde: any) => any,
  ): NiceActionSchema<any, any, any> {
    if (serialize != null && deserialize != null) {
      this.inputOptions = { ...options, serialization: { serialize, deserialize } };
    } else {
      this.inputOptions = options;
    }
    return this as any;
  }

  /**
   * Declare the output schema (JSON-native or with explicit SERDE type param).
   * For non-JSON-native outputs, prefer the 3-argument form below to avoid
   * needing explicit type parameters.
   */
  output<
    VS extends StandardSchemaV1 = StandardSchemaV1,
    SERDE_OUT extends JSONSerializableValue = JSONSerializableValue,
  >(
    options: TNiceActonSchemaOptions<VS, SERDE_OUT>,
  ): NiceActionSchema<INPUT, TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_OUT>, ERRORS>;

  /**
   * Declare the output schema with serialization via sequential parameters.
   * TypeScript infers SERDE_OUT from `serialize`'s return type (left-to-right),
   * then provides it as the contextual type for `deserialize`'s parameter —
   * no explicit type parameters or casts needed.
   */
  output<VS extends StandardSchemaV1, SERDE_OUT extends JSONSerializableValue>(
    options: { schema: VS },
    serialize: (raw: StandardSchemaV1.InferInput<VS>) => SERDE_OUT,
    deserialize: (serde: SERDE_OUT) => StandardSchemaV1.InferInput<VS>,
  ): NiceActionSchema<INPUT, TTransportedValue<StandardSchemaV1.InferInput<VS>, SERDE_OUT>, ERRORS>;

  output(
    options: TNiceActonSchemaOptions<any, any>,
    serialize?: (raw: any) => any,
    deserialize?: (serde: any) => any,
  ): NiceActionSchema<any, any, any> {
    if (serialize != null && deserialize != null) {
      this.outputOptions = { ...options, serialization: { serialize, deserialize } };
    } else {
      this.outputOptions = options;
    }
    return this as any;
  }

  /**
   * Declare that this action may throw any error from `domain`.
   * `TInferActionError` will include `NiceError<DEF, keyof schema>` in its union.
   */
  throws<ERR_DEF extends INiceErrorDomainProps>(
    domain: NiceErrorDomain<ERR_DEF>,
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
    ERR_DEF extends INiceErrorDomainProps,
    IDS extends ReadonlyArray<keyof ERR_DEF["schema"] & string>,
  >(
    domain: NiceErrorDomain<ERR_DEF>,
    ids: IDS,
  ): NiceActionSchema<
    INPUT,
    OUTPUT,
    readonly [...ERRORS, INiceActionErrorDeclaration<ERR_DEF, IDS[number] & string>]
  >;

  throws(
    domain: NiceErrorDomain<any>,
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
   * Validate raw input against the schema defined via `.input({ schema })`.
   * Throws `action_input_validation_failed` if validation fails.
   * Returns the validated (and possibly coerced) value on success.
   * If no input schema was declared, the value is passed through as-is.
   */
  validateInput(value: unknown, meta: { domain: string; actionId: string }): Promise<INPUT[0]> {
    if (this.inputOptions?.schema == null) {
      return value as INPUT[0];
    }
    const result = this.inputOptions.schema["~standard"].validate(value);

    if (result instanceof Promise) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_input_validation_promise, {
        domain: meta.domain,
        actionId: meta.actionId,
      });
    }

    if (result.issues != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_input_validation_failed, {
        domain: meta.domain,
        actionId: meta.actionId,
        validationMessage: extractMessageFromStandardSchema(result),
      });
    }

    return result.value as INPUT[0];
  }

  validateOutput(value: unknown, meta: { domain: string; actionId: string }): Promise<OUTPUT[0]> {
    if (this.outputOptions?.schema == null) {
      return value as OUTPUT[0];
    }
    const result = this.outputOptions.schema["~standard"].validate(value);

    if (result instanceof Promise) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_output_validation_promise, {
        domain: meta.domain,
        actionId: meta.actionId,
      });
    }

    if (result.issues != null) {
      throw err_nice_action.fromId(EErrId_NiceAction.action_output_validation_failed, {
        domain: meta.domain,
        actionId: meta.actionId,
        validationMessage: extractMessageFromStandardSchema(result),
      });
    }

    return result.value as OUTPUT[0];
  }

  /**
   * Serialize raw output to a JSON-serializable form.
   */
  serializeOutput(rawOutput: OUTPUT[0]): OUTPUT[1] {
    if (this.outputOptions?.serialization) {
      return this.outputOptions.serialization.serialize(rawOutput);
    }
    return rawOutput as OUTPUT[1];
  }

  /**
   * Deserialize a JSON value back into the raw output type.
   */
  deserializeOutput(serialized: OUTPUT[1]): OUTPUT[0] {
    if (this.outputOptions?.serialization) {
      return this.outputOptions.serialization.deserialize(serialized);
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
