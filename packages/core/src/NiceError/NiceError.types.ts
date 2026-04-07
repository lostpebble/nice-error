export interface IRegularErrorJsonObject extends Error {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export interface INiceErrorContextDefinition<C> {
  required?: boolean;
  type: C;
}

export type TFunctionWithContext<M extends INiceErrorIdMetadata, O, P extends object = object> =
  M["context"] extends INiceErrorContextDefinition<infer C>
    ? (params: P & (M["context"]["required"] extends true ? { context: C } : { context?: C })) => O
    : (params: P & { context?: never }) => O;

export interface INiceErrorIdMetadata<C = any> {
  context?: INiceErrorContextDefinition<C>;
  message?: string | TFunctionWithContext<this, string>;
  httpStatusCode?: number | TFunctionWithContext<this, number>;
}

export type TNiceErrorContext<E extends string> = {
  [K in E]?: INiceErrorIdMetadata;
};

/**
 * Extracts the context value type from a single INiceErrorIdMetadata entry.
 * Returns `never` if there is no context definition.
 */
export type ExtractContextType<M> = M extends { context: { type: infer C } } ? C : never;

/**
 * Builds the full context data map C from a TNiceErrorContext metadata object.
 * Uses both the raw key and its template-literal string form to handle
 * `as const` objects (which convert enum member keys to string literals).
 */
export type TContextDataFromMeta<E extends string, META extends TNiceErrorContext<E>> = {
  [K in E]: ExtractContextType<NonNullable<META[(`${K}` | K) & keyof META]>>;
};

export interface INiceErrorDefinedProps<ERR_DOMAINS extends string[] = string[]> {
  domain: ERR_DOMAINS[number];
  allDomains: ERR_DOMAINS;
  schema?: Record<string, unknown>;
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
