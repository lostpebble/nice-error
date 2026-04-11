import { err, err_nice } from "@nice-error/core";
import { StatusCodes } from "http-status-codes";
import type { IErrContext_HonoStandardSchema } from "./err_validation.types";

export enum EValidator {
  hono_standard_schema = "hono_standard_schema",
}

export const err_validation = err_nice.createChildDomain({
  domain: "err_validation",
  defaultHttpStatusCode: StatusCodes.BAD_REQUEST,
  schema: {
    [EValidator.hono_standard_schema]: err<IErrContext_HonoStandardSchema>({
      message: "Validation failed: ",
    }),
  },
});
