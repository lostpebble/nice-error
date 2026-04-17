import type { IRegularErrorJsonObject } from "../NiceError/NiceError.types";

export function isRegularErrorJsonObject(obj: unknown): obj is IRegularErrorJsonObject {
  if (typeof obj !== "object" || obj == null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o["name"] === "string" && typeof o["message"] === "string";
}
