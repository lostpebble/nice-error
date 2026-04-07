import { NiceError } from "../NiceError/NiceError";

export function isNiceErrorObject(error: unknown): error is NiceError {
  return error instanceof NiceError;
}
