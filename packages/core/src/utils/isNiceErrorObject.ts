import type { INiceErrorJsonObject } from "../NiceError/NiceError.types";

export function isNiceErrorObject(obj: unknown): obj is INiceErrorJsonObject {
  if (typeof obj !== "object" || obj == null) return false;
  const o = obj as Record<string, unknown>;
  return (
    o.name === "NiceError" &&
    typeof o.message === "string" &&
    typeof o.wasntNice === "boolean" &&
    typeof o.httpStatusCode === "number"
  );
}
