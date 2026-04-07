export interface IRegularErrorJsonObject {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export interface INiceErrorContextDefinition<C = unknown> {
  required?: boolean;
  type: C;
}

/** A single entry within a NiceError schema map. */
export type TSchemaEntry = {
  context?: INiceErrorContextDefinition<any>;
  message?: string | ((...args: any[]) => string);
  httpStatusCode?: number;
};

/** A schema map: record of error IDs to their metadata. */
export type TSchema = Record<string, TSchemaEntry>;

/**
 * Extracts the context value type from a single schema entry.
 * Returns `never` if there is no context definition.
 */
export type ExtractContextType<M> = M extends { context: { type: infer C } } ? C : never;

/**
 * Returns `true` if the schema entry has `context.required: true`.
 */
export type IsContextRequired<M> = M extends { context: { required: true } } ? true : false;

/**
 * Computes the rest-arg tuple for `fromId` based on a schema entry:
 *   - No context defined  → []
 *   - Context required    → [context: C]
 *   - Context optional    → [context?: C]
 */
export type TFromIdContextArgs<M> = [ExtractContextType<M>] extends [never]
  ? []
  : IsContextRequired<M> extends true
    ? [context: ExtractContextType<M>]
    : [context?: ExtractContextType<M>];

export interface IDefineNewNiceErrorDomainOptions<
  ERR_DOMAIN extends string = string,
  SCHEMA extends TSchema = TSchema,
> {
  domain: ERR_DOMAIN;
  schema?: SCHEMA;
}

/** Base constraint interface for the NiceErrorDefined / NiceError type parameter. */
export interface INiceErrorDefinedProps {
  domain: string;
  allDomains: readonly string[];
  schema: TSchema;
}

export interface INiceErrorJsonObject<
  ERR_DEF extends INiceErrorDefinedProps = INiceErrorDefinedProps,
> {
  name: "NiceError";
  def: ERR_DEF;
  wasntNice: boolean;
  message: string;
  httpStatusCode: number;
  originError?: IRegularErrorJsonObject;
}
