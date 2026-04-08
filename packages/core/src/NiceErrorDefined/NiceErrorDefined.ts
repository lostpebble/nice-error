import type { INiceErrorOptions } from "../NiceError/NiceError";
import { NiceError } from "../NiceError/NiceError";
import type {
  ExtractFromIdContextArg,
  IDefineNewNiceErrorDomainOptions,
  INiceErrorDefinedProps,
  TErrorDataForIdMap,
  TFromContextInput,
} from "../NiceError/NiceError.types";
import { NiceErrorExtendable } from "../NiceError/NiceErrorExtendable";

// ---------------------------------------------------------------------------
// Internal type helpers
// ---------------------------------------------------------------------------

type ChildDef<
  PARENT_DEF extends INiceErrorDefinedProps,
  SUB extends IDefineNewNiceErrorDomainOptions,
> = {
  domain: SUB["domain"];
  allDomains: [SUB["domain"], ...PARENT_DEF["allDomains"]];
  schema: SUB["schema"];
};

/**
 * Resolves the args tuple for `fromId`:
 * - No context defined on the entry → `[id]`
 * - Context defined → `[id, context]`
 */
type FromIdArgs<
  ERR_DEF extends INiceErrorDefinedProps,
  K extends keyof ERR_DEF["schema"] & string,
> =
  ExtractFromIdContextArg<ERR_DEF["schema"][K]> extends undefined
    ? [id: K]
    : [id: K, context: ExtractFromIdContextArg<ERR_DEF["schema"][K]>];

/**
 * Extracts the union of keys present in a `TFromContextInput` object.
 * e.g. `{ invalid_credentials: {...} }` → `"invalid_credentials"`
 */
type KeysOfContextInput<INPUT> = keyof INPUT & string;

// ---------------------------------------------------------------------------
// NiceErrorDefined
// ---------------------------------------------------------------------------

export class NiceErrorDefined<ERR_DEF extends INiceErrorDefinedProps> {
  readonly domain: ERR_DEF["domain"];
  readonly allDomains: ERR_DEF["allDomains"];
  readonly defaultHttpStatusCode?: number;
  readonly defaultMessage?: string;

  /** Kept for runtime use (message resolution, httpStatusCode, etc.). */
  private readonly _schema: ERR_DEF["schema"];

  constructor(definition: ERR_DEF) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this._schema = definition.schema;

    if (definition.defaultHttpStatusCode != null) {
      this.defaultHttpStatusCode = definition.defaultHttpStatusCode;
    }

    if (definition.defaultMessage != null) {
      this.defaultMessage = definition.defaultMessage;
    }
  }

  // -------------------------------------------------------------------------
  // createChildDomain
  // -------------------------------------------------------------------------

  /**
   * Creates a child domain that inherits this domain in `allDomains`.
   * The child has its own schema and its own domain string.
   */
  createChildDomain<SUB extends IDefineNewNiceErrorDomainOptions>(
    subErrorDef: SUB,
  ): NiceErrorDefined<ChildDef<ERR_DEF, SUB>> {
    return new NiceErrorDefined<ChildDef<ERR_DEF, SUB>>({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains] as [
        SUB["domain"],
        ...ERR_DEF["allDomains"],
      ],
      schema: subErrorDef.schema,
    } as ChildDef<ERR_DEF, SUB>);
  }

  // -------------------------------------------------------------------------
  // fromId — single-id construction
  // -------------------------------------------------------------------------

  /**
   * Creates a `NiceError` for a single error id.
   *
   * - `id` autocompletes to the schema keys.
   * - The second argument `context` is required / optional / absent based on
   *   whether the schema entry declares `context.required`.
   * - The returned error has `ACTIVE_IDS` narrowed to exactly `K`, so
   *   `getContext(id)` is immediately strongly typed.
   */
  fromId<K extends keyof ERR_DEF["schema"] & string>(
    ...args: FromIdArgs<ERR_DEF, K>
  ): NiceErrorExtendable<ERR_DEF, K> {
    const [id, context] = args as [K, unknown];
    const entry = this._schema[id];

    const message = this._resolveMessage(entry, context);
    const httpStatusCode = this._resolveHttpStatusCode(entry, context);

    const contexts = { [id]: context } as TErrorDataForIdMap<ERR_DEF["schema"]>;

    return new NiceErrorExtendable<ERR_DEF, K>({
      def: this._buildDef(),
      ids: [id],
      contexts,
      message,
      httpStatusCode,
    } as INiceErrorOptions<ERR_DEF, K>);
  }

  // -------------------------------------------------------------------------
  // fromContext — multi-id construction
  // -------------------------------------------------------------------------

  /**
   * Creates a `NiceError` carrying **multiple** error ids at once, each with
   * its own strongly-typed context value.
   *
   * ```ts
   * const err = err_user_auth.fromContext({
   *   invalid_credentials: { username: "alice" },
   *   account_locked: undefined,
   * });
   *
   * err.hasMultiple; // true
   * err.getIds();    // ["invalid_credentials", "account_locked"]
   *
   * if (err.hasId(EErrId_UserAuth.invalid_credentials)) {
   *   const { username } = err.getContext(EErrId_UserAuth.invalid_credentials);
   * }
   * ```
   *
   * The `ACTIVE_IDS` type parameter of the returned error is a union of all
   * supplied keys, so every subsequent `getContext` call is strongly typed.
   */
  fromContext<INPUT extends TFromContextInput<ERR_DEF["schema"]>>(
    context: INPUT & Record<Exclude<keyof INPUT, keyof ERR_DEF["schema"]>, never>,
  ): NiceErrorExtendable<ERR_DEF, KeysOfContextInput<INPUT>> {
    const ids = Object.keys(context) as Array<KeysOfContextInput<INPUT>>;
    if (ids.length === 0) {
      throw new Error(
        "[NiceErrorDefined.fromContext] context object must contain at least one error id.",
      );
    }

    const primaryId = ids[0] as KeysOfContextInput<INPUT>;
    const primaryEntry = this._schema[primaryId as string];
    const primaryContext = context[primaryId];

    const message = this._resolveMessage(primaryEntry, primaryContext);
    const httpStatusCode = this._resolveHttpStatusCode(primaryEntry, primaryContext);

    return new NiceErrorExtendable<ERR_DEF, KeysOfContextInput<INPUT>>({
      def: this._buildDef(),
      ids: ids,
      contexts: context as unknown as TErrorDataForIdMap<ERR_DEF["schema"]>,
      message,
      httpStatusCode,
    } as INiceErrorOptions<ERR_DEF, KeysOfContextInput<INPUT>>);
  }

  // -------------------------------------------------------------------------
  // is — type-narrowing guard for post-cast checks
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if `error` is a `NiceError` whose `def.domain` matches this
   * definition's domain (or any ancestor domain in `allDomains`).
   *
   * Use this after `castNiceError` to narrow an unknown error to this specific
   * domain before accessing its typed ids/context:
   *
   * ```ts
   * const caught = castNiceError(e);
   *
   * if (err_user_auth.is(caught)) {
   *   // caught is now NiceError<typeof err_user_auth's ERR_DEF>
   *   if (caught.hasId(EErrId_UserAuth.invalid_credentials)) {
   *     const { username } = caught.getContext(EErrId_UserAuth.invalid_credentials);
   *   }
   * }
   * ```
   */
  is(error: unknown): error is NiceError<ERR_DEF, keyof ERR_DEF["schema"] & string> {
    if (!(error instanceof NiceError)) return false;
    const errDef = error.def as INiceErrorDefinedProps;
    // Exact domain match only — use `isParentOf` for ancestry checks.
    return errDef.domain === this.domain;
  }

  // -------------------------------------------------------------------------
  // isParentOf — ancestry check
  // -------------------------------------------------------------------------

  /**
   * Returns `true` if this domain appears anywhere in the target's ancestry
   * chain (including an exact domain match).
   *
   * Accepts either a `NiceErrorDefined` (domain definition) or a `NiceError`
   * instance (extracts the domain from its `def`).
   */
  isParentOf(target: NiceErrorDefined<any> | NiceError<any, any>): boolean {
    const allDomains: string[] =
      target instanceof NiceError
        ? (target.def as INiceErrorDefinedProps).allDomains
        : (target as NiceErrorDefined<any>).allDomains;
    return Array.isArray(allDomains) && allDomains.includes(this.domain);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _buildDef(): ERR_DEF {
    return {
      domain: this.domain,
      allDomains: this.allDomains,
      schema: this._schema,
    } as unknown as ERR_DEF;
  }

  private _resolveMessage(
    entry: INiceErrorDefinedProps["schema"][string] | undefined,
    context: unknown,
  ): string {
    if (typeof entry?.message === "function") {
      return (entry.message as (ctx: unknown) => string)(context);
    }
    if (typeof entry?.message === "string") {
      return entry.message;
    }
    return this.defaultMessage ?? `[${this.domain}] An error occurred.`;
  }

  private _resolveHttpStatusCode(
    entry: INiceErrorDefinedProps["schema"][string] | undefined,
    context: unknown,
  ): number {
    let httpStatusCode: number | undefined;

    if (typeof entry?.httpStatusCode === "function") {
      httpStatusCode = (entry.httpStatusCode as (ctx: unknown) => number)(context);
    }
    if (typeof entry?.httpStatusCode === "number") {
      httpStatusCode = entry.httpStatusCode;
    }

    return typeof httpStatusCode === "number"
      ? httpStatusCode
      : (this.defaultHttpStatusCode ?? 500);
  }
}
