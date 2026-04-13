import type { IErrContext_HonoStandardSchema } from "./err_validation.types";
export declare enum EValidator {
    standard_schema = "standard_schema"
}
export declare const err_validation: import("@nice-error/core").NiceErrorDefined<{
    domain: string;
    allDomains: [string, "err_nice"];
    schema: {
        standard_schema: import("@nice-error/core").INiceErrorIdMetadata<IErrContext_HonoStandardSchema, import("@nice-error/core").JSONSerializableValue>;
    };
}>;
