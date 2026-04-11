import type { NiceActionSchema } from "./ActionSchema/NiceActionSchema";

export class NiceAction<SCH extends NiceActionSchema> {
  constructor(public readonly schema: SCH) {}
}
