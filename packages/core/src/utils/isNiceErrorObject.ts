import type { INiceErrorJsonObject } from "../NiceError/NiceError.types";

/**
 * Returns `true` if `obj` is a JSON-serialised `NiceError` object matching the
 * current wire format (contextState-based errorData entries).
 *
 * Validates:
 * - Top-level shape (`name`, `message`, `wasntNice`, `httpStatusCode`, `def`)
 * - Each `errorData` entry has a `contextState` with a valid `kind` discriminant
 *   (`"no_serialization"` or `"unhydrated"`) — rejecting payloads in the old
 *   format (`context` / `serialized` fields) to prevent silent data corruption.
 */
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

  // Validate the `def` property.
  const def = o["def"];
  if (typeof def !== "object" || def == null) return false;
  const d = def as Record<string, unknown>;
  if (typeof d["domain"] !== "string" || !Array.isArray(d["allDomains"])) return false;

  // Validate errorData entries use the current contextState format.
  // An absent / null errorData is acceptable (bare NiceErrors may have an empty map).
  const errorData = o["errorData"];
  if (errorData != null) {
    if (typeof errorData !== "object") return false;

    for (const entry of Object.values(errorData as Record<string, unknown>)) {
      if (entry == null) continue;
      if (typeof entry !== "object") return false;

      const e = entry as Record<string, unknown>;
      const state = e["contextState"];

      // Reject old-format entries that still use the `context` / `serialized` shape.
      if (state == null || typeof state !== "object") return false;

      const kind = (state as Record<string, unknown>)["kind"];
      if (kind !== "no_serialization" && kind !== "unhydrated") return false;
    }
  }

  return true;
}
