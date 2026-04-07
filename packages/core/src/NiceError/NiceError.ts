import type {
  ExtractContextType,
  INiceErrorDefinedProps,
  INiceErrorJsonObject,
} from "./NiceError.types";

export class NiceError<
  ERR_DEF extends INiceErrorDefinedProps = INiceErrorDefinedProps,
  ERR_ID extends keyof ERR_DEF["schema"] = keyof ERR_DEF["schema"],
> extends Error {
  override readonly name = "NiceError" as const;
  readonly id?: ERR_ID;
  readonly def?: ERR_DEF;
  readonly wasntNice: boolean;
  readonly httpStatusCode: number;
  readonly originError?: Error;
  private readonly _context?: ExtractContextType<ERR_DEF["schema"][ERR_ID]>;

  constructor(
    options?:
      | string
      | {
          id: ERR_ID;
          def: ERR_DEF;
          message: string;
          context?: ExtractContextType<ERR_DEF["schema"][ERR_ID]>;
          wasntNice?: boolean;
          originError?: Error;
          httpStatusCode?: number;
        },
  ) {
    if (typeof options === "string") {
      super(options);
      this.wasntNice = false;
      this.httpStatusCode = 500;
    } else if (options == null) {
      super("An error occurred");
      this.wasntNice = false;
      this.httpStatusCode = 500;
    } else {
      super(options.message);
      this.id = options.id;
      this.def = options.def;
      this._context = options.context;
      this.wasntNice = options.wasntNice ?? false;
      this.httpStatusCode = options.httpStatusCode ?? 500;
      this.originError = options.originError;
    }
  }

  /**
   * Type-guard that narrows this error to `NiceError<ERR_DEF, CHECK_ID>`.
   * Use before calling `getContext` when the error ID is not statically known.
   */
  hasId<CHECK_ID extends keyof ERR_DEF["schema"]>(
    id: CHECK_ID,
  ): this is NiceError<ERR_DEF, CHECK_ID> {
    return (this.id as unknown) === (id as unknown);
  }

  /**
   * Returns the typed context that was provided when creating this error via `fromId`.
   * The `id` parameter acts as a type-level witness — it must match the error's `ERR_ID`
   * (enforced automatically after narrowing via `hasId`).
   */
  getContext(_id: ERR_ID): ExtractContextType<ERR_DEF["schema"][ERR_ID]> {
    return this._context as ExtractContextType<ERR_DEF["schema"][ERR_ID]>;
  }

  toJsonObject(): INiceErrorJsonObject<ERR_DEF> {
    return {
      name: "NiceError",
      def: this.def as ERR_DEF,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError
        ? {
            name: this.originError.name,
            message: this.originError.message,
            stack: this.originError.stack,
          }
        : undefined,
    };
  }
}

