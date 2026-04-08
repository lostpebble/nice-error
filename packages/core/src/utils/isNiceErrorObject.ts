import type { INiceErrorJsonObject } from "../NiceError/NiceError.types";

export function isNiceErrorObject(obj: unknown): obj is INiceErrorJsonObject {
  if (typeof obj !== "object" || obj == null) return false;
  const o = obj as Record<string, unknown>;
  if (
    o["name"] !== "NiceError" ||
    typeof o["message"] !== "string" ||
    typeof o["wasntNice"] !== "boolean" ||
    typeof o["httpStatusCode"] !== "number"
  ) {
    return false;
  }
  // Validate the `def` property — required on INiceErrorJsonObject
  const def = o["def"];
  if (typeof def !== "object" || def == null) return false;
  const d = def as Record<string, unknown>;
  return typeof d["domain"] === "string" && Array.isArray(d["allDomains"]);
}
