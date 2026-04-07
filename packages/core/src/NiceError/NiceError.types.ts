export interface IRegularErrorJsonObject extends Error {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export interface INiceErrorJsonObject<ERR_ID extends string = string> {
  name: "NiceError";
  wasntNice: boolean;
  ids: ERR_ID[];
  message: string;
  httpStatusCode: number;
  originError?: IRegularErrorJsonObject;
}
