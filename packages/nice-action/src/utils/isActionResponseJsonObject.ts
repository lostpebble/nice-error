import { EActionState } from "../NiceAction/NiceAction.enums";
import type { TNiceActionResponse_JsonObject } from "../NiceAction/NiceAction.types";

export const isActionResponseJsonObject = (obj: unknown): obj is TNiceActionResponse_JsonObject => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as any).domain === "string" &&
    typeof (obj as any).id === "string" &&
    "input" in (obj as any) &&
    ("output" in (obj as any) || "error" in (obj as any)) &&
    typeof (obj as any).ok === "boolean" &&
    (obj as any).type === EActionState.resolved
  );
};
