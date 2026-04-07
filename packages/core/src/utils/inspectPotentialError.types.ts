import type { NiceError } from "../NiceError/NiceError";
import type { INiceErrorJsonObject, IRegularErrorJsonObject } from "../NiceError/NiceError.types";

export enum EInspectErrorResultType {
  nullish = "nullish",
  niceErrorObject = "niceErrorObject",
  niceError = "niceError",
  jsError = "jsError",
  jsErrorObject = "jsErrorObject",
  jsDataType = "jsDataType",
  jsOther = "jsOther",
}

export interface IInspectErrorResult_Base<T extends EInspectErrorResultType> {
  type: T;
}

export interface IInspectErrorResult_Nullish
  extends IInspectErrorResult_Base<EInspectErrorResultType.nullish> {
  value: null | undefined;
}

export interface IInspectErrorResult_NiceErrorObject
  extends IInspectErrorResult_Base<EInspectErrorResultType.niceErrorObject> {
  niceErrorObject: INiceErrorJsonObject;
}

export interface IInspectErrorResult_NiceError
  extends IInspectErrorResult_Base<EInspectErrorResultType.niceError> {
  niceError: NiceError;
}

export interface IInspectErrorResult_JsError
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsError> {
  jsError: Error;
}

export interface IInspectErrorResult_JsErrorObject
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsErrorObject> {
  jsErrorObject: IRegularErrorJsonObject;
}

export interface IInspectErrorResult_JsDataType_String
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsDataType> {
  jsDataType: "string";
  jsDataValue: string;
}

export interface IInspectErrorResult_JsDataType_Number
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsDataType> {
  jsDataType: "number";
  jsDataValue: number;
}

export interface IInspectErrorResult_JsDataType_Boolean
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsDataType> {
  jsDataType: "boolean";
  jsDataValue: boolean;
}

export interface IInspectErrorResult_JsDataType_Object
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsDataType> {
  jsDataType: "object";
  jsDataValue: object;
}

export interface IInspectErrorResult_JsOther
  extends IInspectErrorResult_Base<EInspectErrorResultType.jsOther> {
  jsDataValue: unknown;
}

export type TInspectErrorResult =
  | IInspectErrorResult_Nullish
  | IInspectErrorResult_NiceErrorObject
  | IInspectErrorResult_NiceError
  | IInspectErrorResult_JsError
  | IInspectErrorResult_JsErrorObject
  | IInspectErrorResult_JsDataType_String
  | IInspectErrorResult_JsDataType_Number
  | IInspectErrorResult_JsDataType_Boolean
  | IInspectErrorResult_JsDataType_Object
  | IInspectErrorResult_JsOther;
