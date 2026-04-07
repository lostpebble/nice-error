import { NiceError } from "../NiceError/NiceError";
import { isNiceErrorObject } from "./isNiceErrorObject";

export const castNiceError = (error: unknown): NiceError => {
  let err: NiceError;

  if (error == null) {
    err = new NiceError("Unknown error: null or undefined");
    err.cause = error;
    return err;
  }

  if (isNiceErrorObject(error)) {
    // Re-create the NiceError instance with the properties from the original NiceError object
  }

  if (typeof error === "object") {
    // Check for object properties that match NiceError and re-create it as a NiceError
    // Otherwise, we need to create an "unknown" NiceError with the original error as the cause
  }

  // Return a new NiceError with the original error as the cause
  err = new NiceError(
    error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : String(error),
  );
  err.cause = error;
  return err;
};
