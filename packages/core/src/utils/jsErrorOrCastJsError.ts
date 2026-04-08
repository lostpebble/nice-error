export function jsErrorOrCastJsError(error: unknown, logMessage = true): Error {
  if (error instanceof Error) {
    return {
      ...error,
      name: error.name,
      message: error.message,
    };
  }

  const message =
    (error as Error | undefined)?.message ??
    (typeof error === "string" ? error : "No error message found");

  if (logMessage) {
    console.error(`An unknown and unstructured error was thrown: ${message}`, error);
  }

  return {
    ...new Error(message),
    ...(error as Error | undefined),
  };
}
