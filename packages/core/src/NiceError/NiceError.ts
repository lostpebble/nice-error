import type { INiceErrorDefinedProps, INiceErrorJsonObject } from "./NiceError.types";

export class NiceError<ERR_DEF extends INiceErrorDefinedProps = INiceErrorDefinedProps>
  extends Error
  implements INiceErrorJsonObject<ERR_DEF>
{
  override readonly name = "NiceError" as const;
  def: ERR_DEF;
  wasntNice: boolean;
  httpStatusCode: number;
  originError?: Error;

  constructor(options: {
    def: ERR_DEF;
    wasntNice: boolean;
    originError?: Error;
  }) {
    super(options.message);
  }

  toJsonObject(): INiceErrorJsonObject {
    // Implementation would go here, but since the prompt asks to return an empty object, we'll do that for now.
    return {};
  }

  hasId(): boolean {}
}
