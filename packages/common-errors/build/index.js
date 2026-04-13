// ../../node_modules/.bun/http-status-codes@2.3.0/node_modules/http-status-codes/build/es/legacy.js
var ACCEPTED = 202;
var BAD_GATEWAY = 502;
var BAD_REQUEST = 400;
var CONFLICT = 409;
var CONTINUE = 100;
var CREATED = 201;
var EXPECTATION_FAILED = 417;
var FORBIDDEN = 403;
var GATEWAY_TIMEOUT = 504;
var GONE = 410;
var HTTP_VERSION_NOT_SUPPORTED = 505;
var IM_A_TEAPOT = 418;
var INSUFFICIENT_SPACE_ON_RESOURCE = 419;
var INSUFFICIENT_STORAGE = 507;
var INTERNAL_SERVER_ERROR = 500;
var LENGTH_REQUIRED = 411;
var LOCKED = 423;
var METHOD_FAILURE = 420;
var METHOD_NOT_ALLOWED = 405;
var MOVED_PERMANENTLY = 301;
var MOVED_TEMPORARILY = 302;
var MULTI_STATUS = 207;
var MULTIPLE_CHOICES = 300;
var NETWORK_AUTHENTICATION_REQUIRED = 511;
var NO_CONTENT = 204;
var NON_AUTHORITATIVE_INFORMATION = 203;
var NOT_ACCEPTABLE = 406;
var NOT_FOUND = 404;
var NOT_IMPLEMENTED = 501;
var NOT_MODIFIED = 304;
var OK = 200;
var PARTIAL_CONTENT = 206;
var PAYMENT_REQUIRED = 402;
var PERMANENT_REDIRECT = 308;
var PRECONDITION_FAILED = 412;
var PRECONDITION_REQUIRED = 428;
var PROCESSING = 102;
var PROXY_AUTHENTICATION_REQUIRED = 407;
var REQUEST_HEADER_FIELDS_TOO_LARGE = 431;
var REQUEST_TIMEOUT = 408;
var REQUEST_TOO_LONG = 413;
var REQUEST_URI_TOO_LONG = 414;
var REQUESTED_RANGE_NOT_SATISFIABLE = 416;
var RESET_CONTENT = 205;
var SEE_OTHER = 303;
var SERVICE_UNAVAILABLE = 503;
var SWITCHING_PROTOCOLS = 101;
var TEMPORARY_REDIRECT = 307;
var TOO_MANY_REQUESTS = 429;
var UNAUTHORIZED = 401;
var UNPROCESSABLE_ENTITY = 422;
var UNSUPPORTED_MEDIA_TYPE = 415;
var USE_PROXY = 305;
var legacy_default = {
  ACCEPTED,
  BAD_GATEWAY,
  BAD_REQUEST,
  CONFLICT,
  CONTINUE,
  CREATED,
  EXPECTATION_FAILED,
  FORBIDDEN,
  GATEWAY_TIMEOUT,
  GONE,
  HTTP_VERSION_NOT_SUPPORTED,
  IM_A_TEAPOT,
  INSUFFICIENT_SPACE_ON_RESOURCE,
  INSUFFICIENT_STORAGE,
  INTERNAL_SERVER_ERROR,
  LENGTH_REQUIRED,
  LOCKED,
  METHOD_FAILURE,
  METHOD_NOT_ALLOWED,
  MOVED_PERMANENTLY,
  MOVED_TEMPORARILY,
  MULTI_STATUS,
  MULTIPLE_CHOICES,
  NETWORK_AUTHENTICATION_REQUIRED,
  NO_CONTENT,
  NON_AUTHORITATIVE_INFORMATION,
  NOT_ACCEPTABLE,
  NOT_FOUND,
  NOT_IMPLEMENTED,
  NOT_MODIFIED,
  OK,
  PARTIAL_CONTENT,
  PAYMENT_REQUIRED,
  PERMANENT_REDIRECT,
  PRECONDITION_FAILED,
  PRECONDITION_REQUIRED,
  PROCESSING,
  PROXY_AUTHENTICATION_REQUIRED,
  REQUEST_HEADER_FIELDS_TOO_LARGE,
  REQUEST_TIMEOUT,
  REQUEST_TOO_LONG,
  REQUEST_URI_TOO_LONG,
  REQUESTED_RANGE_NOT_SATISFIABLE,
  RESET_CONTENT,
  SEE_OTHER,
  SERVICE_UNAVAILABLE,
  SWITCHING_PROTOCOLS,
  TEMPORARY_REDIRECT,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
  UNPROCESSABLE_ENTITY,
  UNSUPPORTED_MEDIA_TYPE,
  USE_PROXY
};

// ../../node_modules/.bun/http-status-codes@2.3.0/node_modules/http-status-codes/build/es/utils.js
var statusCodeToReasonPhrase = {
  "202": "Accepted",
  "502": "Bad Gateway",
  "400": "Bad Request",
  "409": "Conflict",
  "100": "Continue",
  "201": "Created",
  "417": "Expectation Failed",
  "424": "Failed Dependency",
  "403": "Forbidden",
  "504": "Gateway Timeout",
  "410": "Gone",
  "505": "HTTP Version Not Supported",
  "418": "I'm a teapot",
  "419": "Insufficient Space on Resource",
  "507": "Insufficient Storage",
  "500": "Internal Server Error",
  "411": "Length Required",
  "423": "Locked",
  "420": "Method Failure",
  "405": "Method Not Allowed",
  "301": "Moved Permanently",
  "302": "Moved Temporarily",
  "207": "Multi-Status",
  "300": "Multiple Choices",
  "511": "Network Authentication Required",
  "204": "No Content",
  "203": "Non Authoritative Information",
  "406": "Not Acceptable",
  "404": "Not Found",
  "501": "Not Implemented",
  "304": "Not Modified",
  "200": "OK",
  "206": "Partial Content",
  "402": "Payment Required",
  "308": "Permanent Redirect",
  "412": "Precondition Failed",
  "428": "Precondition Required",
  "102": "Processing",
  "103": "Early Hints",
  "426": "Upgrade Required",
  "407": "Proxy Authentication Required",
  "431": "Request Header Fields Too Large",
  "408": "Request Timeout",
  "413": "Request Entity Too Large",
  "414": "Request-URI Too Long",
  "416": "Requested Range Not Satisfiable",
  "205": "Reset Content",
  "303": "See Other",
  "503": "Service Unavailable",
  "101": "Switching Protocols",
  "307": "Temporary Redirect",
  "429": "Too Many Requests",
  "401": "Unauthorized",
  "451": "Unavailable For Legal Reasons",
  "422": "Unprocessable Entity",
  "415": "Unsupported Media Type",
  "305": "Use Proxy",
  "421": "Misdirected Request"
};
var reasonPhraseToStatusCode = {
  Accepted: 202,
  "Bad Gateway": 502,
  "Bad Request": 400,
  Conflict: 409,
  Continue: 100,
  Created: 201,
  "Expectation Failed": 417,
  "Failed Dependency": 424,
  Forbidden: 403,
  "Gateway Timeout": 504,
  Gone: 410,
  "HTTP Version Not Supported": 505,
  "I'm a teapot": 418,
  "Insufficient Space on Resource": 419,
  "Insufficient Storage": 507,
  "Internal Server Error": 500,
  "Length Required": 411,
  Locked: 423,
  "Method Failure": 420,
  "Method Not Allowed": 405,
  "Moved Permanently": 301,
  "Moved Temporarily": 302,
  "Multi-Status": 207,
  "Multiple Choices": 300,
  "Network Authentication Required": 511,
  "No Content": 204,
  "Non Authoritative Information": 203,
  "Not Acceptable": 406,
  "Not Found": 404,
  "Not Implemented": 501,
  "Not Modified": 304,
  OK: 200,
  "Partial Content": 206,
  "Payment Required": 402,
  "Permanent Redirect": 308,
  "Precondition Failed": 412,
  "Precondition Required": 428,
  Processing: 102,
  "Early Hints": 103,
  "Upgrade Required": 426,
  "Proxy Authentication Required": 407,
  "Request Header Fields Too Large": 431,
  "Request Timeout": 408,
  "Request Entity Too Large": 413,
  "Request-URI Too Long": 414,
  "Requested Range Not Satisfiable": 416,
  "Reset Content": 205,
  "See Other": 303,
  "Service Unavailable": 503,
  "Switching Protocols": 101,
  "Temporary Redirect": 307,
  "Too Many Requests": 429,
  Unauthorized: 401,
  "Unavailable For Legal Reasons": 451,
  "Unprocessable Entity": 422,
  "Unsupported Media Type": 415,
  "Use Proxy": 305,
  "Misdirected Request": 421
};

// ../../node_modules/.bun/http-status-codes@2.3.0/node_modules/http-status-codes/build/es/utils-functions.js
function getReasonPhrase(statusCode) {
  var result = statusCodeToReasonPhrase[statusCode.toString()];
  if (!result) {
    throw new Error("Status code does not exist: " + statusCode);
  }
  return result;
}
function getStatusCode(reasonPhrase) {
  var result = reasonPhraseToStatusCode[reasonPhrase];
  if (!result) {
    throw new Error("Reason phrase does not exist: " + reasonPhrase);
  }
  return result;
}
var getStatusText = getReasonPhrase;

// ../../node_modules/.bun/http-status-codes@2.3.0/node_modules/http-status-codes/build/es/status-codes.js
var StatusCodes;
(function(StatusCodes2) {
  StatusCodes2[StatusCodes2["CONTINUE"] = 100] = "CONTINUE";
  StatusCodes2[StatusCodes2["SWITCHING_PROTOCOLS"] = 101] = "SWITCHING_PROTOCOLS";
  StatusCodes2[StatusCodes2["PROCESSING"] = 102] = "PROCESSING";
  StatusCodes2[StatusCodes2["EARLY_HINTS"] = 103] = "EARLY_HINTS";
  StatusCodes2[StatusCodes2["OK"] = 200] = "OK";
  StatusCodes2[StatusCodes2["CREATED"] = 201] = "CREATED";
  StatusCodes2[StatusCodes2["ACCEPTED"] = 202] = "ACCEPTED";
  StatusCodes2[StatusCodes2["NON_AUTHORITATIVE_INFORMATION"] = 203] = "NON_AUTHORITATIVE_INFORMATION";
  StatusCodes2[StatusCodes2["NO_CONTENT"] = 204] = "NO_CONTENT";
  StatusCodes2[StatusCodes2["RESET_CONTENT"] = 205] = "RESET_CONTENT";
  StatusCodes2[StatusCodes2["PARTIAL_CONTENT"] = 206] = "PARTIAL_CONTENT";
  StatusCodes2[StatusCodes2["MULTI_STATUS"] = 207] = "MULTI_STATUS";
  StatusCodes2[StatusCodes2["MULTIPLE_CHOICES"] = 300] = "MULTIPLE_CHOICES";
  StatusCodes2[StatusCodes2["MOVED_PERMANENTLY"] = 301] = "MOVED_PERMANENTLY";
  StatusCodes2[StatusCodes2["MOVED_TEMPORARILY"] = 302] = "MOVED_TEMPORARILY";
  StatusCodes2[StatusCodes2["SEE_OTHER"] = 303] = "SEE_OTHER";
  StatusCodes2[StatusCodes2["NOT_MODIFIED"] = 304] = "NOT_MODIFIED";
  StatusCodes2[StatusCodes2["USE_PROXY"] = 305] = "USE_PROXY";
  StatusCodes2[StatusCodes2["TEMPORARY_REDIRECT"] = 307] = "TEMPORARY_REDIRECT";
  StatusCodes2[StatusCodes2["PERMANENT_REDIRECT"] = 308] = "PERMANENT_REDIRECT";
  StatusCodes2[StatusCodes2["BAD_REQUEST"] = 400] = "BAD_REQUEST";
  StatusCodes2[StatusCodes2["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
  StatusCodes2[StatusCodes2["PAYMENT_REQUIRED"] = 402] = "PAYMENT_REQUIRED";
  StatusCodes2[StatusCodes2["FORBIDDEN"] = 403] = "FORBIDDEN";
  StatusCodes2[StatusCodes2["NOT_FOUND"] = 404] = "NOT_FOUND";
  StatusCodes2[StatusCodes2["METHOD_NOT_ALLOWED"] = 405] = "METHOD_NOT_ALLOWED";
  StatusCodes2[StatusCodes2["NOT_ACCEPTABLE"] = 406] = "NOT_ACCEPTABLE";
  StatusCodes2[StatusCodes2["PROXY_AUTHENTICATION_REQUIRED"] = 407] = "PROXY_AUTHENTICATION_REQUIRED";
  StatusCodes2[StatusCodes2["REQUEST_TIMEOUT"] = 408] = "REQUEST_TIMEOUT";
  StatusCodes2[StatusCodes2["CONFLICT"] = 409] = "CONFLICT";
  StatusCodes2[StatusCodes2["GONE"] = 410] = "GONE";
  StatusCodes2[StatusCodes2["LENGTH_REQUIRED"] = 411] = "LENGTH_REQUIRED";
  StatusCodes2[StatusCodes2["PRECONDITION_FAILED"] = 412] = "PRECONDITION_FAILED";
  StatusCodes2[StatusCodes2["REQUEST_TOO_LONG"] = 413] = "REQUEST_TOO_LONG";
  StatusCodes2[StatusCodes2["REQUEST_URI_TOO_LONG"] = 414] = "REQUEST_URI_TOO_LONG";
  StatusCodes2[StatusCodes2["UNSUPPORTED_MEDIA_TYPE"] = 415] = "UNSUPPORTED_MEDIA_TYPE";
  StatusCodes2[StatusCodes2["REQUESTED_RANGE_NOT_SATISFIABLE"] = 416] = "REQUESTED_RANGE_NOT_SATISFIABLE";
  StatusCodes2[StatusCodes2["EXPECTATION_FAILED"] = 417] = "EXPECTATION_FAILED";
  StatusCodes2[StatusCodes2["IM_A_TEAPOT"] = 418] = "IM_A_TEAPOT";
  StatusCodes2[StatusCodes2["INSUFFICIENT_SPACE_ON_RESOURCE"] = 419] = "INSUFFICIENT_SPACE_ON_RESOURCE";
  StatusCodes2[StatusCodes2["METHOD_FAILURE"] = 420] = "METHOD_FAILURE";
  StatusCodes2[StatusCodes2["MISDIRECTED_REQUEST"] = 421] = "MISDIRECTED_REQUEST";
  StatusCodes2[StatusCodes2["UNPROCESSABLE_ENTITY"] = 422] = "UNPROCESSABLE_ENTITY";
  StatusCodes2[StatusCodes2["LOCKED"] = 423] = "LOCKED";
  StatusCodes2[StatusCodes2["FAILED_DEPENDENCY"] = 424] = "FAILED_DEPENDENCY";
  StatusCodes2[StatusCodes2["UPGRADE_REQUIRED"] = 426] = "UPGRADE_REQUIRED";
  StatusCodes2[StatusCodes2["PRECONDITION_REQUIRED"] = 428] = "PRECONDITION_REQUIRED";
  StatusCodes2[StatusCodes2["TOO_MANY_REQUESTS"] = 429] = "TOO_MANY_REQUESTS";
  StatusCodes2[StatusCodes2["REQUEST_HEADER_FIELDS_TOO_LARGE"] = 431] = "REQUEST_HEADER_FIELDS_TOO_LARGE";
  StatusCodes2[StatusCodes2["UNAVAILABLE_FOR_LEGAL_REASONS"] = 451] = "UNAVAILABLE_FOR_LEGAL_REASONS";
  StatusCodes2[StatusCodes2["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
  StatusCodes2[StatusCodes2["NOT_IMPLEMENTED"] = 501] = "NOT_IMPLEMENTED";
  StatusCodes2[StatusCodes2["BAD_GATEWAY"] = 502] = "BAD_GATEWAY";
  StatusCodes2[StatusCodes2["SERVICE_UNAVAILABLE"] = 503] = "SERVICE_UNAVAILABLE";
  StatusCodes2[StatusCodes2["GATEWAY_TIMEOUT"] = 504] = "GATEWAY_TIMEOUT";
  StatusCodes2[StatusCodes2["HTTP_VERSION_NOT_SUPPORTED"] = 505] = "HTTP_VERSION_NOT_SUPPORTED";
  StatusCodes2[StatusCodes2["INSUFFICIENT_STORAGE"] = 507] = "INSUFFICIENT_STORAGE";
  StatusCodes2[StatusCodes2["NETWORK_AUTHENTICATION_REQUIRED"] = 511] = "NETWORK_AUTHENTICATION_REQUIRED";
})(StatusCodes || (StatusCodes = {}));
// ../../node_modules/.bun/http-status-codes@2.3.0/node_modules/http-status-codes/build/es/index.js
var __assign = function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length;i < n; i++) {
      s = arguments[i];
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p))
          t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
var es_default = __assign(__assign({}, legacy_default), {
  getStatusCode,
  getStatusText
});

// ../core/src/utils/jsErrorOrCastJsError.ts
function jsErrorOrCastJsError(error, logMessage = true) {
  if (error instanceof Error) {
    return Object.assign(error, {
      message: error.message
    });
  }
  const message = error?.message ?? (typeof error === "string" ? error : "No error message found");
  if (logMessage) {
    console.error(`An unknown and unstructured error was thrown: ${message}`, error);
  }
  return {
    ...new Error(message),
    ...error
  };
}

// ../core/src/NiceError/nice_error.static.ts
var DUR_OBJ_PACK_PREFIX = "NE_DUROBJ[[";
var DUR_OBJ_PACK_SUFFIX = "]]NE_DUROBJ";

// ../core/src/utils/packError/causePack.ts
var causePack = (error) => {
  error._packedState = { cause: error.cause, packedAs: "cause_pack" /* cause_pack */ };
  error.cause = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
};

// ../core/src/utils/packError/msgPack.ts
var msgPack = (error) => {
  error._packedState = { message: error.message, packedAs: "msg_pack" /* msg_pack */ };
  error.message = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
};

// ../core/src/utils/packError/packError.ts
var packError = (error, packType = "msg_pack") => {
  if (packType === "no_pack") {
    return error;
  }
  if (packType === "msg_pack") {
    return msgPack(error);
  }
  return causePack(error);
};

// ../core/src/NiceError/NiceError.ts
class NiceError extends Error {
  name = "NiceError";
  def;
  ids;
  wasntNice;
  httpStatusCode;
  originError;
  _packedState;
  _errorDataMap;
  constructor(options) {
    super(options.message);
    this.def = options.def;
    this.ids = options.ids;
    this._errorDataMap = options.errorData;
    this.wasntNice = options.wasntNice ?? false;
    this.httpStatusCode = options.httpStatusCode ?? 500;
    if (options.originError != null) {
      this.originError = options.originError;
    }
  }
  hasId(id) {
    return id in this._errorDataMap;
  }
  hasOneOfIds(ids) {
    return ids.some((id) => (id in this._errorDataMap));
  }
  get hasMultiple() {
    return Object.keys(this._errorDataMap).length > 1;
  }
  getIds() {
    return Object.keys(this._errorDataMap);
  }
  getContext(id) {
    const errorData = this._errorDataMap[id];
    const state = errorData?.contextState;
    if (state == null) {
      return;
    }
    if (state.kind === "unhydrated") {
      throw new Error(`[NiceError.getContext] Context for id "${String(id)}" is in the "unhydrated" state. ` + `The error was reconstructed from a serialized payload but has not been deserialized yet. ` + `Call \`niceErrorDefined.hydrate(error)\` to reconstruct the typed context.`);
    }
    return state.value;
  }
  getErrorDataForId(id) {
    return this._errorDataMap[id];
  }
  withOriginError(error) {
    this.originError = jsErrorOrCastJsError(error);
    if (this._packedState?.packedAs !== "cause_pack" /* cause_pack */) {
      this.cause = this.originError;
    }
    return this;
  }
  matches(other) {
    const myDef = this.def;
    const otherDef = other.def;
    if (myDef.domain !== otherDef.domain)
      return false;
    const myIds = this.getIds().map(String).sort();
    const otherIds = other.getIds().map(String).sort();
    if (myIds.length !== otherIds.length)
      return false;
    return myIds.every((id, i) => id === otherIds[i]);
  }
  toJsonObject() {
    const originError = this.originError ? {
      name: this.originError.name,
      message: this.originError.message,
      stack: this.originError.stack,
      cause: this.originError.cause
    } : undefined;
    const def = {
      domain: this.def.domain,
      allDomains: this.def.allDomains
    };
    if (this.def.defaultHttpStatusCode != null) {
      def["defaultHttpStatusCode"] = this.def.defaultHttpStatusCode;
    }
    if (this.def.defaultMessage != null) {
      def["defaultMessage"] = this.def.defaultMessage;
    }
    const errorData = {};
    for (const rawId of Object.keys(this._errorDataMap)) {
      const id = rawId;
      const data = this._errorDataMap[id];
      if (data == null)
        continue;
      let contextState;
      if (data.contextState.kind === "hydrated" /* hydrated */) {
        contextState = {
          kind: "unhydrated" /* unhydrated */,
          serialized: data.contextState.serialized
        };
      } else {
        contextState = data.contextState;
      }
      errorData[id] = { contextState, message: data.message, httpStatusCode: data.httpStatusCode };
    }
    return {
      name: "NiceError",
      def,
      ids: this.ids,
      errorData,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      ...this.stack != null ? { stack: this.stack } : {},
      originError
    };
  }
  hydrate(definedNiceError) {
    return definedNiceError.hydrate(this);
  }
  handleWith(cases) {
    for (const c of cases) {
      if (!c._domain.isExact(this))
        continue;
      if (c._ids != null && !this.hasOneOfIds(c._ids))
        continue;
      c._handler(c._domain.hydrate(this));
      return true;
    }
    return false;
  }
  async handleWithAsync(cases) {
    for (const c of cases) {
      if (!c._domain.isExact(this))
        continue;
      if (c._ids != null && !this.hasOneOfIds(c._ids))
        continue;
      await c._handler(c._domain.hydrate(this));
      return true;
    }
    return false;
  }
  get isPacked() {
    return this._packedState != null;
  }
  pack(packType = "msg_pack") {
    if (this.isPacked)
      return this;
    return packError(this, packType);
  }
  unpack() {
    if (this._packedState == null)
      return this;
    if (this._packedState.packedAs === "msg_pack" /* msg_pack */) {
      this.message = this._packedState.message;
    }
    if (this._packedState.packedAs === "cause_pack" /* cause_pack */) {
      this.cause = this._packedState.cause;
    }
    this._packedState = undefined;
    delete this._packedState;
    return this;
  }
}

// ../core/src/NiceError/NiceErrorHydrated.ts
class NiceErrorHydrated extends NiceError {
  def;
  niceErrorDefined;
  constructor(options) {
    super(options);
    this.def = options.def;
    this.niceErrorDefined = options.niceErrorDefined;
  }
  addContext(context) {
    const newIds = Object.keys(context);
    const newErrorData = {};
    for (const id of newIds) {
      newErrorData[id] = this.niceErrorDefined.reconcileErrorDataForId(id, context[id]);
    }
    const mergedErrorData = {
      ...this._errorDataMap,
      ...newErrorData
    };
    const mergedIds = Array.from(new Set([...this.getIds(), ...Object.keys(context)]));
    return new NiceErrorHydrated({
      def: this.def,
      niceErrorDefined: this.niceErrorDefined,
      ids: mergedIds,
      errorData: mergedErrorData,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError
    });
  }
  addId(...args) {
    const [id, context] = args;
    const reconciledData = this.niceErrorDefined.reconcileErrorDataForId(id, context);
    const errorDataMap = {};
    errorDataMap[id] = reconciledData;
    const mergedContexts = {
      ...this._errorDataMap,
      ...errorDataMap
    };
    const mergedIds = Array.from(new Set([...this.getIds(), id]));
    return new NiceErrorHydrated({
      def: this.def,
      niceErrorDefined: this.niceErrorDefined,
      ids: mergedIds,
      errorData: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError
    });
  }
}

// ../core/src/NiceErrorDefined/NiceErrorDefined.ts
class NiceErrorDefined {
  domain;
  allDomains;
  defaultHttpStatusCode;
  defaultMessage;
  _schema;
  _definedChildNiceErrors = [];
  _definedParentNiceError;
  _setPack;
  _packAsFn;
  constructor(definition) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this._schema = definition.schema;
    if (definition.packAs != null) {
      this._packAsFn = definition.packAs;
    }
    if (definition.defaultHttpStatusCode != null) {
      this.defaultHttpStatusCode = definition.defaultHttpStatusCode;
    }
    if (definition.defaultMessage != null) {
      this.defaultMessage = definition.defaultMessage;
    }
  }
  createChildDomain(subErrorDef) {
    const child = new NiceErrorDefined({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains],
      schema: subErrorDef.schema,
      defaultHttpStatusCode: subErrorDef.defaultHttpStatusCode,
      defaultMessage: subErrorDef.defaultMessage
    });
    this.addChildNiceErrorDefined(child);
    child.addParentNiceErrorDefined(this);
    if (subErrorDef.packAs != null) {
      child._packAsFn = subErrorDef.packAs;
    } else if (this._setPack) {
      child.packAs(this._setPack);
    } else if (this._packAsFn) {
      child._packAsFn = this._packAsFn;
    }
    return child;
  }
  addParentNiceErrorDefined(parentError) {
    if (this._definedParentNiceError?.domain === parentError.domain) {
      return;
    }
    this._definedParentNiceError = {
      domain: parentError.domain,
      definedError: parentError
    };
  }
  addChildNiceErrorDefined(child) {
    if (this._definedChildNiceErrors.some((linked) => linked.domain === child.domain)) {
      return;
    }
    this._definedChildNiceErrors.push({
      domain: child.domain,
      definedError: child
    });
    if (this._definedParentNiceError) {
      this._definedParentNiceError.definedError.addChildNiceErrorDefined(child);
    }
  }
  packAs(pack) {
    this._setPack = pack;
    return this;
  }
  createError(input) {
    const err = new NiceErrorHydrated(input);
    const packType = this._setPack ?? this._packAsFn?.();
    if (packType != null && packType !== "no_pack") {
      return err.pack(packType);
    }
    return err;
  }
  hydrate(error) {
    const errDef = error.def;
    if (errDef.domain !== this.domain) {
      throw new Error(`[NiceErrorDefined.hydrate] Domain mismatch: this definition is "${this.domain}" ` + `but the error belongs to "${errDef.domain}". ` + `Call \`niceErrorDefined.is(error)\` before hydrating to ensure compatibility.`);
    }
    const reconciledErrorData = {};
    for (const id of error.getIds()) {
      const existingData = error.getErrorDataForId(id);
      if (existingData == null)
        continue;
      let contextState = existingData.contextState;
      if (contextState.kind === "unhydrated") {
        const entry = this._schema[id];
        const deserialize = entry?.context?.serialization?.fromJsonSerializable;
        if (deserialize != null) {
          contextState = {
            kind: "hydrated" /* hydrated */,
            value: deserialize(contextState.serialized),
            serialized: contextState.serialized
          };
        }
      }
      reconciledErrorData[id] = {
        contextState,
        message: existingData.message,
        httpStatusCode: existingData.httpStatusCode
      };
    }
    return new NiceErrorHydrated({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids: error.ids,
      errorData: reconciledErrorData,
      message: error.message,
      httpStatusCode: error.httpStatusCode,
      wasntNice: error.wasntNice,
      originError: error.originError
    });
  }
  fromId(...args) {
    const [id, context] = args;
    const reconciledData = this.reconcileErrorDataForId(id, context);
    const errorData = {};
    errorData[id] = reconciledData;
    return this.createError({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids: [id],
      errorData,
      message: reconciledData.message,
      httpStatusCode: reconciledData.httpStatusCode
    });
  }
  fromContext(context) {
    const ids = Object.keys(context);
    if (ids.length === 0) {
      throw new Error("[NiceErrorDefined.fromContext] context object must contain at least one error id.");
    }
    const errorData = {};
    for (const id of ids) {
      errorData[id] = this.reconcileErrorDataForId(id, context[id]);
    }
    const primaryId = ids[0];
    return this.createError({
      def: this._buildDef(),
      niceErrorDefined: this,
      ids,
      errorData,
      message: errorData[primaryId].message,
      httpStatusCode: errorData[primaryId].httpStatusCode
    });
  }
  isExact(error) {
    if (!(error instanceof NiceError))
      return false;
    const errDef = error.def;
    return errDef.domain === this.domain;
  }
  isThisOrChild(error) {
    if (!(error instanceof NiceError))
      return false;
    const errDef = error.def;
    return errDef.domain === this.domain || this.allDomains.includes(errDef.domain);
  }
  isParentOf(target) {
    const allDomains = target instanceof NiceError ? target.def.allDomains : target.allDomains;
    return Array.isArray(allDomains) && allDomains.includes(this.domain);
  }
  _buildDef() {
    return {
      domain: this.domain,
      allDomains: this.allDomains,
      schema: this._schema
    };
  }
  _resolveMessage(id, context) {
    const entry = this._schema[id];
    if (typeof entry?.message === "function") {
      return entry.message(context);
    }
    if (typeof entry?.message === "string") {
      return entry.message;
    }
    return this.defaultMessage ?? `[${this.domain}::${id}] An error occurred.`;
  }
  _resolveHttpStatusCode(id, context) {
    const entry = this._schema[id];
    let httpStatusCode;
    if (typeof entry?.httpStatusCode === "function") {
      httpStatusCode = entry.httpStatusCode(context);
    }
    if (typeof entry?.httpStatusCode === "number") {
      httpStatusCode = entry.httpStatusCode;
    }
    return typeof httpStatusCode === "number" ? httpStatusCode : this.defaultHttpStatusCode ?? 500;
  }
  reconcileErrorDataForId(id, context) {
    const message = this._resolveMessage(id, context);
    const httpStatusCode = this._resolveHttpStatusCode(id, context);
    const entry = this._schema[id];
    let contextState;
    if (context != null && entry?.context?.serialization != null) {
      const serialized = entry.context.serialization.toJsonSerializable(context);
      contextState = { kind: "hydrated" /* hydrated */, value: context, serialized };
    } else {
      contextState = { kind: "serde_unset" /* serde_unset */, value: context };
    }
    return { contextState, message, httpStatusCode };
  }
}

// ../core/src/NiceErrorDefined/defineNiceError.ts
var defineNiceError = (definition) => {
  return new NiceErrorDefined({
    domain: definition.domain,
    allDomains: [definition.domain],
    schema: definition.schema,
    ...definition.packAs != null ? { packAs: definition.packAs } : {}
  });
};

// ../core/src/NiceErrorDefined/err.ts
function err(meta) {
  return meta ?? {};
}

// ../core/src/internal/nice_core_errors.ts
var err_nice = defineNiceError({
  domain: "err_nice",
  schema: {}
});
var err_cast_not_nice = err_nice.createChildDomain({
  domain: "err_cast_not_nice",
  defaultHttpStatusCode: StatusCodes.UNPROCESSABLE_ENTITY,
  schema: {
    ["native_error" /* js_error */]: err({
      context: {
        required: true
      },
      message: ({ jsError }) => `A native JavaScript Error was encountered during casting: ${jsError.message}`,
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR
    }),
    ["js_error_like_object" /* js_error_like_object */]: err({
      context: {
        required: true
      },
      message: ({ jsErrorObject }) => `An object resembling a JavaScript Error was encountered during casting: [${jsErrorObject.name}] ${jsErrorObject.message}`,
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR
    }),
    ["nullish_value" /* nullish_value */]: err({
      context: {
        required: true
      },
      message: ({ value }) => `A nullish value [${value === null ? "null" : "undefined"}] was encountered during casting`
    }),
    ["js_data_type" /* js_data_type */]: err({
      context: {
        required: true
      },
      message: ({ jsDataType, jsDataValue }) => {
        let inspectedValue;
        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {}
        return `A value of type [${jsDataType}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      }
    }),
    ["js_other" /* js_other */]: err({
      context: {
        required: true
      },
      message: ({ jsDataValue }) => {
        let inspectedValue;
        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {}
        return `An unhandled type [${typeof jsDataValue}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      }
    })
  }
});
// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/urlToObj.js
function urlToObject(url) {
  return {
    href: url.href,
    protocol: url.protocol,
    username: url.username,
    password: url.password,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    searchParams: [...url.searchParams].map(([key, value]) => ({ key, value })),
    hash: url.hash,
    origin: url.origin
  };
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/prettyLogStyles.js
var prettyLogStyles = {
  reset: [0, 0],
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  overline: [53, 55],
  inverse: [7, 27],
  hidden: [8, 28],
  strikethrough: [9, 29],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  blackBright: [90, 39],
  redBright: [91, 39],
  greenBright: [92, 39],
  yellowBright: [93, 39],
  blueBright: [94, 39],
  magentaBright: [95, 39],
  cyanBright: [96, 39],
  whiteBright: [97, 39],
  bgBlack: [40, 49],
  bgRed: [41, 49],
  bgGreen: [42, 49],
  bgYellow: [43, 49],
  bgBlue: [44, 49],
  bgMagenta: [45, 49],
  bgCyan: [46, 49],
  bgWhite: [47, 49],
  bgBlackBright: [100, 49],
  bgRedBright: [101, 49],
  bgGreenBright: [102, 49],
  bgYellowBright: [103, 49],
  bgBlueBright: [104, 49],
  bgMagentaBright: [105, 49],
  bgCyanBright: [106, 49],
  bgWhiteBright: [107, 49]
};

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/formatTemplate.js
function formatTemplate(settings, template, values, hideUnsetPlaceholder = false) {
  const templateString = String(template);
  const ansiColorWrap = (placeholderValue, code) => `\x1B[${code[0]}m${placeholderValue}\x1B[${code[1]}m`;
  const styleWrap = (value, style) => {
    if (style != null && typeof style === "string") {
      return ansiColorWrap(value, prettyLogStyles[style]);
    } else if (style != null && Array.isArray(style)) {
      return style.reduce((prevValue, thisStyle) => styleWrap(prevValue, thisStyle), value);
    } else {
      if (style != null && style[value.trim()] != null) {
        return styleWrap(value, style[value.trim()]);
      } else if (style != null && style["*"] != null) {
        return styleWrap(value, style["*"]);
      } else {
        return value;
      }
    }
  };
  const defaultStyle = null;
  return templateString.replace(/{{(.+?)}}/g, (_, placeholder) => {
    const value = values[placeholder] != null ? String(values[placeholder]) : hideUnsetPlaceholder ? "" : _;
    return settings.stylePrettyLogs ? styleWrap(value, settings?.prettyLogStyles?.[placeholder] ?? defaultStyle) + ansiColorWrap("", prettyLogStyles.reset) : value;
  });
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/formatNumberAddZeros.js
function formatNumberAddZeros(value, digits = 2, addNumber = 0) {
  if (value != null && isNaN(value)) {
    return "";
  }
  value = value != null ? value + addNumber : value;
  return digits === 2 ? value == null ? "--" : value < 10 ? "0" + value : value.toString() : value == null ? "---" : value < 10 ? "00" + value : value < 100 ? "0" + value : value.toString();
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/metaFormatting.js
function buildPrettyMeta(settings, meta) {
  if (meta == null) {
    return {
      text: "",
      template: settings.prettyLogTemplate,
      placeholders: {}
    };
  }
  let template = settings.prettyLogTemplate;
  const placeholderValues = {};
  if (template.includes("{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}")) {
    template = template.replace("{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}", "{{dateIsoStr}}");
  } else {
    if (settings.prettyLogTimeZone === "UTC") {
      placeholderValues["yyyy"] = meta.date?.getUTCFullYear() ?? "----";
      placeholderValues["mm"] = formatNumberAddZeros(meta.date?.getUTCMonth(), 2, 1);
      placeholderValues["dd"] = formatNumberAddZeros(meta.date?.getUTCDate(), 2);
      placeholderValues["hh"] = formatNumberAddZeros(meta.date?.getUTCHours(), 2);
      placeholderValues["MM"] = formatNumberAddZeros(meta.date?.getUTCMinutes(), 2);
      placeholderValues["ss"] = formatNumberAddZeros(meta.date?.getUTCSeconds(), 2);
      placeholderValues["ms"] = formatNumberAddZeros(meta.date?.getUTCMilliseconds(), 3);
    } else {
      placeholderValues["yyyy"] = meta.date?.getFullYear() ?? "----";
      placeholderValues["mm"] = formatNumberAddZeros(meta.date?.getMonth(), 2, 1);
      placeholderValues["dd"] = formatNumberAddZeros(meta.date?.getDate(), 2);
      placeholderValues["hh"] = formatNumberAddZeros(meta.date?.getHours(), 2);
      placeholderValues["MM"] = formatNumberAddZeros(meta.date?.getMinutes(), 2);
      placeholderValues["ss"] = formatNumberAddZeros(meta.date?.getSeconds(), 2);
      placeholderValues["ms"] = formatNumberAddZeros(meta.date?.getMilliseconds(), 3);
    }
  }
  const dateInSettingsTimeZone = settings.prettyLogTimeZone === "UTC" ? meta.date : meta.date != null ? new Date(meta.date.getTime() - meta.date.getTimezoneOffset() * 60000) : undefined;
  placeholderValues["rawIsoStr"] = dateInSettingsTimeZone?.toISOString() ?? "";
  placeholderValues["dateIsoStr"] = dateInSettingsTimeZone?.toISOString().replace("T", " ").replace("Z", "") ?? "";
  placeholderValues["logLevelName"] = meta.logLevelName;
  placeholderValues["fileNameWithLine"] = meta.path?.fileNameWithLine ?? "";
  placeholderValues["filePathWithLine"] = meta.path?.filePathWithLine ?? "";
  placeholderValues["fullFilePath"] = meta.path?.fullFilePath ?? "";
  let parentNamesString = settings.parentNames?.join(settings.prettyErrorParentNamesSeparator);
  parentNamesString = parentNamesString != null && meta.name != null ? parentNamesString + settings.prettyErrorParentNamesSeparator : undefined;
  const combinedName = meta.name != null || parentNamesString != null ? `${parentNamesString ?? ""}${meta.name ?? ""}` : "";
  placeholderValues["name"] = combinedName;
  placeholderValues["nameWithDelimiterPrefix"] = combinedName.length > 0 ? settings.prettyErrorLoggerNameDelimiter + combinedName : "";
  placeholderValues["nameWithDelimiterSuffix"] = combinedName.length > 0 ? combinedName + settings.prettyErrorLoggerNameDelimiter : "";
  if (settings.overwrite?.addPlaceholders != null) {
    settings.overwrite.addPlaceholders(meta, placeholderValues);
  }
  return {
    text: formatTemplate(settings, template, placeholderValues),
    template,
    placeholders: placeholderValues
  };
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/stackTrace.js
var DEFAULT_IGNORE_PATTERNS = [
  /(?:^|[\\/])node_modules[\\/].*tslog/i,
  /(?:^|[\\/])deps[\\/].*tslog/i,
  /tslog[\\/]+src[\\/]+internal[\\/]/i,
  /tslog[\\/]+src[\\/]BaseLogger/i,
  /tslog[\\/]+src[\\/]index/i
];
function splitStackLines(error) {
  const stack = typeof error?.stack === "string" ? error.stack : undefined;
  if (stack == null || stack.length === 0) {
    return [];
  }
  return stack.split(`
`).map((line) => line.trimEnd());
}
function sanitizeStackLines(lines) {
  return lines.filter((line) => line.length > 0 && !/^\s*Error\b/.test(line));
}
function toStackFrames(lines, parseLine) {
  const frames = [];
  for (const line of lines) {
    const frame = parseLine(line);
    if (frame != null) {
      frames.push(frame);
    }
  }
  return frames;
}
function findFirstExternalFrameIndex(frames, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
  for (let index = 0;index < frames.length; index += 1) {
    const frame = frames[index];
    const filePathCandidate = frame.filePath ?? "";
    const fullPathCandidate = frame.fullFilePath ?? "";
    if (!ignorePatterns.some((pattern) => pattern.test(filePathCandidate) || pattern.test(fullPathCandidate))) {
      return index;
    }
  }
  return 0;
}
function getCleanStackLines(error) {
  return sanitizeStackLines(splitStackLines(error));
}
function buildStackTrace(error, parseLine) {
  return toStackFrames(getCleanStackLines(error), parseLine);
}
function clampIndex(index, maxExclusive) {
  if (index < 0) {
    return 0;
  }
  if (index >= maxExclusive) {
    return Math.max(0, maxExclusive - 1);
  }
  return index;
}
function getDefaultIgnorePatterns() {
  return [...DEFAULT_IGNORE_PATTERNS];
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/errorUtils.js
var DEFAULT_CAUSE_DEPTH = 5;
function collectErrorCauses(error, options = {}) {
  const maxDepth = options.maxDepth ?? DEFAULT_CAUSE_DEPTH;
  const causes = [];
  const visited = new Set;
  let current = error;
  let depth = 0;
  while (current != null && depth < maxDepth) {
    const cause = current?.cause;
    if (cause == null || visited.has(cause)) {
      break;
    }
    visited.add(cause);
    causes.push(toError(cause));
    current = cause;
    depth += 1;
  }
  return causes;
}
function toError(value) {
  if (value instanceof Error) {
    return value;
  }
  const error = new Error(typeof value === "string" ? value : JSON.stringify(value));
  if (typeof value === "object" && value != null) {
    Object.assign(error, value);
  }
  return error;
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/jsonStringifyRecursive.js
function jsonStringifyRecursive(obj) {
  const cache = new Set;
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (cache.has(value)) {
        return "[Circular]";
      }
      cache.add(value);
    }
    if (typeof value === "bigint") {
      return `${value}`;
    }
    if (typeof value === "undefined") {
      return "[undefined]";
    }
    return value;
  });
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/util.inspect.polyfill.js
function inspect(obj, opts) {
  const ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  if (opts != null) {
    _extend(ctx, opts);
  }
  if (isUndefined(ctx.showHidden))
    ctx.showHidden = false;
  if (isUndefined(ctx.depth))
    ctx.depth = 2;
  if (isUndefined(ctx.colors))
    ctx.colors = true;
  if (isUndefined(ctx.customInspect))
    ctx.customInspect = true;
  if (ctx.colors)
    ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
inspect.colors = prettyLogStyles;
inspect.styles = {
  special: "cyan",
  number: "yellow",
  boolean: "yellow",
  undefined: "grey",
  null: "bold",
  string: "green",
  date: "magenta",
  regexp: "red"
};
function isBoolean(arg) {
  return typeof arg === "boolean";
}
function isUndefined(arg) {
  return arg === undefined;
}
function stylizeNoColor(str) {
  return str;
}
function stylizeWithColor(str, styleType) {
  const style = inspect.styles[styleType];
  if (style != null && inspect?.colors?.[style]?.[0] != null && inspect?.colors?.[style]?.[1] != null) {
    return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
  } else {
    return str;
  }
}
function isFunction(arg) {
  return typeof arg === "function";
}
function isString(arg) {
  return typeof arg === "string";
}
function isNumber(arg) {
  return typeof arg === "number";
}
function isNull(arg) {
  return arg === null;
}
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function isRegExp(re) {
  return isObject(re) && objectToString(re) === "[object RegExp]";
}
function isObject(arg) {
  return typeof arg === "object" && arg !== null;
}
function isError(e) {
  return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
}
function isDate(d) {
  return isObject(d) && objectToString(d) === "[object Date]";
}
function objectToString(o) {
  return Object.prototype.toString.call(o);
}
function arrayToHash(array) {
  const hash = {};
  array.forEach((val) => {
    hash[val] = true;
  });
  return hash;
}
function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  const output = [];
  for (let i = 0, l = value.length;i < l; ++i) {
    if (hasOwn(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
    } else {
      output.push("");
    }
  }
  keys.forEach((key) => {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
    }
  });
  return output;
}
function formatError(value) {
  return "[" + Error.prototype.toString.call(value) + "]";
}
function formatValue(ctx, value, recurseTimes = 0) {
  if (ctx.customInspect && value != null && isFunction(value) && value?.inspect !== inspect && !(value?.constructor && value?.constructor.prototype === value)) {
    if (typeof value.inspect !== "function" && value.toString != null) {
      return value.toString();
    }
    let ret = value?.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }
  const primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }
  let keys = Object.keys(value);
  const visibleKeys = arrayToHash(keys);
  try {
    if (ctx.showHidden && Object.getOwnPropertyNames) {
      keys = Object.getOwnPropertyNames(value);
    }
  } catch {}
  if (isError(value) && (keys.indexOf("message") >= 0 || keys.indexOf("description") >= 0)) {
    return formatError(value);
  }
  if (keys.length === 0) {
    if (isFunction(ctx.stylize)) {
      if (isFunction(value)) {
        const name = value.name ? ": " + value.name : "";
        return ctx.stylize("[Function" + name + "]", "special");
      }
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
      }
      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toISOString.call(value), "date");
      }
      if (isError(value)) {
        return formatError(value);
      }
    } else {
      return value;
    }
  }
  let base = "";
  let array = false;
  let braces = [`{
`, `
}`];
  if (Array.isArray(value)) {
    array = true;
    braces = [`[
`, `
]`];
  }
  if (isFunction(value)) {
    const n = value.name ? ": " + value.name : "";
    base = " [Function" + n + "]";
  }
  if (isRegExp(value)) {
    base = " " + RegExp.prototype.toString.call(value);
  }
  if (isDate(value)) {
    base = " " + Date.prototype.toUTCString.call(value);
  }
  if (isError(value)) {
    base = " " + formatError(value);
  }
  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }
  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), "regexp");
    } else {
      return ctx.stylize("[Object]", "special");
    }
  }
  ctx.seen.push(value);
  let output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map((key) => {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }
  ctx.seen.pop();
  return reduceToSingleString(output, base, braces);
}
function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  let name, str;
  let desc = { value: undefined };
  try {
    desc.value = value[key];
  } catch {}
  try {
    if (Object.getOwnPropertyDescriptor) {
      desc = Object.getOwnPropertyDescriptor(value, key) || desc;
    }
  } catch {}
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize("[Getter/Setter]", "special");
    } else {
      str = ctx.stylize("[Getter]", "special");
    }
  } else {
    if (desc.set) {
      str = ctx.stylize("[Setter]", "special");
    }
  }
  if (!hasOwn(visibleKeys, key)) {
    name = "[" + key + "]";
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, undefined);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf(`
`) > -1) {
        if (array) {
          str = str.split(`
`).map((line) => {
            return "  " + line;
          }).join(`
`).substr(2);
        } else {
          str = `
` + str.split(`
`).map((line) => {
            return "   " + line;
          }).join(`
`);
        }
      }
    } else {
      str = ctx.stylize("[Circular]", "special");
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify("" + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, "name");
    } else {
      name = name.replace(/'/g, "\\'").replace(/\\"/g, "\\'").replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, "string");
    }
  }
  return name + ": " + str;
}
function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize("undefined", "undefined");
  if (isString(value)) {
    const simple = "'" + JSON.stringify(value).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, "\\'") + "'";
    return ctx.stylize(simple, "string");
  }
  if (isNumber(value))
    return ctx.stylize("" + value, "number");
  if (isBoolean(value))
    return ctx.stylize("" + value, "boolean");
  if (isNull(value))
    return ctx.stylize("null", "null");
}
function reduceToSingleString(output, base, braces) {
  return braces[0] + (base === "" ? "" : base + `
`) + "  " + output.join(`,
  `) + " " + braces[1];
}
function _extend(origin, add) {
  const typedOrigin = { ...origin };
  if (!add || !isObject(add))
    return origin;
  const clonedAdd = { ...add };
  const keys = Object.keys(add);
  let i = keys.length;
  while (i--) {
    typedOrigin[keys[i]] = clonedAdd[keys[i]];
  }
  return typedOrigin;
}
function formatWithOptions(inspectOptions, ...args) {
  const ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  if (inspectOptions != null) {
    _extend(ctx, inspectOptions);
  }
  const first = args[0];
  let a = 0;
  let str = "";
  let join = "";
  if (typeof first === "string") {
    if (args.length === 1) {
      return first;
    }
    let tempStr;
    let lastPos = 0;
    for (let i = 0;i < first.length - 1; i++) {
      if (first.charCodeAt(i) === 37) {
        const nextChar = first.charCodeAt(++i);
        if (a + 1 !== args.length) {
          switch (nextChar) {
            case 115: {
              const tempArg = args[++a];
              if (typeof tempArg === "number") {
                tempStr = formatPrimitive(ctx, tempArg);
              } else if (typeof tempArg === "bigint") {
                tempStr = formatPrimitive(ctx, tempArg);
              } else if (typeof tempArg !== "object" || tempArg === null) {
                tempStr = String(tempArg);
              } else {
                tempStr = inspect(tempArg, {
                  ...inspectOptions,
                  compact: 3,
                  colors: false,
                  depth: 0
                });
              }
              break;
            }
            case 106:
              tempStr = jsonStringifyRecursive(args[++a]);
              break;
            case 100: {
              const tempNum = args[++a];
              if (typeof tempNum === "bigint") {
                tempStr = formatPrimitive(ctx, tempNum);
              } else if (typeof tempNum === "symbol") {
                tempStr = "NaN";
              } else {
                tempStr = formatPrimitive(ctx, tempNum);
              }
              break;
            }
            case 79:
              tempStr = inspect(args[++a], inspectOptions);
              break;
            case 111:
              tempStr = inspect(args[++a], {
                ...inspectOptions,
                showHidden: true,
                showProxy: true,
                depth: 4
              });
              break;
            case 105: {
              const tempInteger = args[++a];
              if (typeof tempInteger === "bigint") {
                tempStr = formatPrimitive(ctx, tempInteger);
              } else if (typeof tempInteger === "symbol") {
                tempStr = "NaN";
              } else {
                tempStr = formatPrimitive(ctx, parseInt(tempStr));
              }
              break;
            }
            case 102: {
              const tempFloat = args[++a];
              if (typeof tempFloat === "symbol") {
                tempStr = "NaN";
              } else {
                tempStr = formatPrimitive(ctx, parseInt(tempFloat));
              }
              break;
            }
            case 99:
              a += 1;
              tempStr = "";
              break;
            case 37:
              str += first.slice(lastPos, i);
              lastPos = i + 1;
              continue;
            default:
              continue;
          }
          if (lastPos !== i - 1) {
            str += first.slice(lastPos, i - 1);
          }
          str += tempStr;
          lastPos = i + 1;
        } else if (nextChar === 37) {
          str += first.slice(lastPos, i);
          lastPos = i + 1;
        }
      }
    }
    if (lastPos !== 0) {
      a++;
      join = " ";
      if (lastPos < first.length) {
        str += first.slice(lastPos);
      }
    }
  }
  while (a < args.length) {
    const value = args[a];
    str += join;
    str += typeof value !== "string" ? inspect(value, inspectOptions) : value;
    join = " ";
    a++;
  }
  return str;
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/environment.js
function safeGetCwd() {
  try {
    const nodeProcess = globalThis?.process;
    if (typeof nodeProcess?.cwd === "function") {
      return nodeProcess.cwd();
    }
  } catch {}
  try {
    const deno = globalThis?.["Deno"];
    if (typeof deno?.cwd === "function") {
      return deno.cwd();
    }
  } catch {}
  return;
}
function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
function consoleSupportsCssStyling() {
  if (!isBrowserEnvironment()) {
    return false;
  }
  const navigatorObj = globalThis?.navigator;
  const userAgent = navigatorObj?.userAgent ?? "";
  if (/firefox/i.test(userAgent)) {
    return true;
  }
  const windowObj = globalThis;
  if (windowObj?.CSS?.supports?.("color", "#000")) {
    return true;
  }
  return /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/BaseLogger.js
function createLoggerEnvironment() {
  const runtimeInfo = detectRuntimeInfo();
  const meta = createRuntimeMeta(runtimeInfo);
  const usesBrowserStack = runtimeInfo.name === "browser" || runtimeInfo.name === "worker";
  const callerIgnorePatterns = usesBrowserStack ? [...getDefaultIgnorePatterns(), /node_modules[\\/].*tslog/i] : [...getDefaultIgnorePatterns(), /node:(?:internal|vm)/i, /\binternal[\\/]/i];
  let cachedCwd;
  const environment = {
    getMeta(logLevelId, logLevelName, stackDepthLevel, hideLogPositionForPerformance, name, parentNames) {
      return Object.assign({}, meta, {
        name,
        parentNames,
        date: new Date,
        logLevelId,
        logLevelName,
        path: !hideLogPositionForPerformance ? environment.getCallerStackFrame(stackDepthLevel) : undefined
      });
    },
    getCallerStackFrame(stackDepthLevel, error = new Error) {
      const frames = buildStackTrace(error, (line) => parseStackLine(line));
      if (frames.length === 0) {
        return {};
      }
      const autoIndex = findFirstExternalFrameIndex(frames, callerIgnorePatterns);
      const useManualIndex = Number.isFinite(stackDepthLevel) && stackDepthLevel >= 0;
      const resolvedIndex = useManualIndex ? clampIndex(stackDepthLevel, frames.length) : clampIndex(autoIndex, frames.length);
      return frames[resolvedIndex] ?? {};
    },
    getErrorTrace(error) {
      return buildStackTrace(error, (line) => parseStackLine(line));
    },
    isError(value) {
      return isNativeError(value);
    },
    isBuffer(value) {
      return typeof Buffer !== "undefined" && typeof Buffer.isBuffer === "function" ? Buffer.isBuffer(value) : false;
    },
    prettyFormatLogObj(maskedArgs, settings) {
      return maskedArgs.reduce((result, arg) => {
        if (environment.isError(arg)) {
          result.errors.push(environment.prettyFormatErrorObj(arg, settings));
        } else {
          result.args.push(arg);
        }
        return result;
      }, { args: [], errors: [] });
    },
    prettyFormatErrorObj(error, settings) {
      const stackLines = formatStackFrames(environment.getErrorTrace(error), settings);
      const causeSections = collectErrorCauses(error).map((cause, index) => {
        const header = `Caused by (${index + 1}): ${cause.name ?? "Error"}${cause.message ? `: ${cause.message}` : ""}`;
        const frames = formatStackFrames(buildStackTrace(cause, (line) => parseStackLine(line)), settings);
        return [header, ...frames].join(`
`);
      });
      const placeholderValuesError = {
        errorName: ` ${error.name} `,
        errorMessage: formatErrorMessage(error),
        errorStack: [...stackLines, ...causeSections].join(`
`)
      };
      return formatTemplate(settings, settings.prettyErrorTemplate, placeholderValuesError);
    },
    transportFormatted(logMetaMarkup, logArgs, logErrors, logMeta, settings) {
      const prettyLogs = settings.stylePrettyLogs !== false;
      const logErrorsStr = (logErrors.length > 0 && logArgs.length > 0 ? `
` : "") + logErrors.join(`
`);
      const sanitizedMetaMarkup = stripAnsi(logMetaMarkup);
      const metaMarkupForText = prettyLogs ? logMetaMarkup : sanitizedMetaMarkup;
      if (shouldUseCss(prettyLogs)) {
        settings.prettyInspectOptions.colors = false;
        const formattedArgs2 = formatWithOptionsSafe(settings.prettyInspectOptions, logArgs);
        const cssMeta = logMeta != null ? buildCssMetaOutput(settings, logMeta) : { text: sanitizedMetaMarkup, styles: [] };
        const hasCssMeta = cssMeta.text.length > 0 && cssMeta.styles.length > 0;
        const metaOutput = hasCssMeta ? cssMeta.text : sanitizedMetaMarkup;
        const output = metaOutput + formattedArgs2 + logErrorsStr;
        if (hasCssMeta) {
          console.log(output, ...cssMeta.styles);
        } else {
          console.log(output);
        }
        return;
      }
      settings.prettyInspectOptions.colors = prettyLogs;
      const formattedArgs = formatWithOptionsSafe(settings.prettyInspectOptions, logArgs);
      console.log(metaMarkupForText + formattedArgs + logErrorsStr);
    },
    transportJSON(json) {
      console.log(jsonStringifyRecursive(json));
    }
  };
  if (getNodeEnv() === "test") {
    environment.__resetWorkingDirectoryCacheForTests = () => {
      cachedCwd = undefined;
    };
  }
  return environment;
  function parseStackLine(line) {
    return usesBrowserStack ? parseBrowserStackLine(line) : parseServerStackLine(line);
  }
  function parseServerStackLine(rawLine) {
    if (typeof rawLine !== "string" || rawLine.length === 0) {
      return;
    }
    const trimmedLine = rawLine.trim();
    if (!trimmedLine.includes(" at ") && !trimmedLine.startsWith("at ")) {
      return;
    }
    const line = trimmedLine.replace(/^at\s+/, "");
    let method;
    let location = line;
    const methodMatch = line.match(/^(.*?)\s+\((.*)\)$/);
    if (methodMatch) {
      method = methodMatch[1];
      location = methodMatch[2];
    }
    const sanitizedLocation = location.replace(/^\(/, "").replace(/\)$/, "");
    const withoutQuery = sanitizedLocation.replace(/\?.*$/, "");
    let fileLine;
    let fileColumn;
    let filePathCandidate = withoutQuery;
    const segments = withoutQuery.split(":");
    if (segments.length >= 3 && /^\d+$/.test(segments[segments.length - 1] ?? "")) {
      fileColumn = segments.pop();
      fileLine = segments.pop();
      filePathCandidate = segments.join(":");
    } else if (segments.length >= 2 && /^\d+$/.test(segments[segments.length - 1] ?? "")) {
      fileLine = segments.pop();
      filePathCandidate = segments.join(":");
    }
    let normalizedPath = filePathCandidate.replace(/^file:\/\//, "");
    const cwd = getWorkingDirectory();
    if (cwd != null && normalizedPath.startsWith(cwd)) {
      normalizedPath = normalizedPath.slice(cwd.length);
      normalizedPath = normalizedPath.replace(/^[\\/]/, "");
    }
    if (normalizedPath.length === 0) {
      normalizedPath = filePathCandidate;
    }
    const normalizedPathWithoutLine = normalizeFilePath(normalizedPath);
    const effectivePath = normalizedPathWithoutLine.length > 0 ? normalizedPathWithoutLine : normalizedPath;
    const pathSegments = effectivePath.split(/\\|\//);
    const fileName = pathSegments[pathSegments.length - 1];
    const fileNameWithLine = fileName && fileLine ? `${fileName}:${fileLine}` : undefined;
    const filePathWithLine = effectivePath && fileLine ? `${effectivePath}:${fileLine}` : undefined;
    return {
      fullFilePath: sanitizedLocation,
      fileName,
      fileNameWithLine,
      fileColumn,
      fileLine,
      filePath: effectivePath,
      filePathWithLine,
      method
    };
  }
  function parseBrowserStackLine(line) {
    const href = globalThis.location?.origin;
    if (line == null) {
      return;
    }
    const match = line.match(BROWSER_PATH_REGEX);
    if (!match) {
      return;
    }
    const filePath = match[1]?.replace(/\?.*$/, "");
    if (filePath == null) {
      return;
    }
    const pathParts = filePath.split("/");
    const fileLine = match[2];
    const fileColumn = match[3];
    const fileName = pathParts[pathParts.length - 1];
    return {
      fullFilePath: href ? `${href}${filePath}` : filePath,
      fileName,
      fileNameWithLine: fileName && fileLine ? `${fileName}:${fileLine}` : undefined,
      fileColumn,
      fileLine,
      filePath,
      filePathWithLine: fileLine ? `${filePath}:${fileLine}` : undefined,
      method: undefined
    };
  }
  function formatStackFrames(frames, settings) {
    return frames.map((stackFrame) => formatTemplate(settings, settings.prettyErrorStackTemplate, { ...stackFrame }, true));
  }
  function formatErrorMessage(error) {
    return Object.getOwnPropertyNames(error).filter((key) => key !== "stack" && key !== "cause").reduce((result, key) => {
      const value = error[key];
      if (typeof value === "function") {
        return result;
      }
      result.push(String(value));
      return result;
    }, []).join(", ");
  }
  function shouldUseCss(prettyLogs) {
    return prettyLogs && (runtimeInfo.name === "browser" || runtimeInfo.name === "worker") && consoleSupportsCssStyling();
  }
  function stripAnsi(value) {
    return value.replace(ANSI_REGEX, "");
  }
  function buildCssMetaOutput(settings, metaValue) {
    if (metaValue == null) {
      return { text: "", styles: [] };
    }
    const { template, placeholders } = buildPrettyMeta(settings, metaValue);
    const parts = [];
    const styles = [];
    let lastIndex = 0;
    const placeholderRegex = /{{(.+?)}}/g;
    let match;
    while ((match = placeholderRegex.exec(template)) != null) {
      if (match.index > lastIndex) {
        parts.push(template.slice(lastIndex, match.index));
      }
      const key = match[1];
      const rawValue = placeholders[key] != null ? String(placeholders[key]) : "";
      const tokens = collectStyleTokens(settings.prettyLogStyles?.[key], rawValue);
      const css = tokensToCss(tokens);
      if (css.length > 0) {
        parts.push(`%c${rawValue}%c`);
        styles.push(css, "");
      } else {
        parts.push(rawValue);
      }
      lastIndex = placeholderRegex.lastIndex;
    }
    if (lastIndex < template.length) {
      parts.push(template.slice(lastIndex));
    }
    return {
      text: parts.join(""),
      styles
    };
  }
  function collectStyleTokens(style, value) {
    if (style == null) {
      return [];
    }
    if (typeof style === "string") {
      return [style];
    }
    if (Array.isArray(style)) {
      return style.flatMap((token) => collectStyleTokens(token, value));
    }
    if (typeof style === "object") {
      const normalizedValue = value.trim();
      const nextStyle = style[normalizedValue] ?? style["*"];
      if (nextStyle == null) {
        return [];
      }
      return collectStyleTokens(nextStyle, value);
    }
    return [];
  }
  function tokensToCss(tokens) {
    const seen = new Set;
    const cssParts = [];
    for (const token of tokens) {
      const css = styleTokenToCss(token);
      if (css != null && css.length > 0 && !seen.has(css)) {
        seen.add(css);
        cssParts.push(css);
      }
    }
    return cssParts.join("; ");
  }
  function styleTokenToCss(token) {
    const color = COLOR_TOKENS[token];
    if (color != null) {
      return `color: ${color}`;
    }
    const background = BACKGROUND_TOKENS[token];
    if (background != null) {
      return `background-color: ${background}`;
    }
    switch (token) {
      case "bold":
        return "font-weight: bold";
      case "dim":
        return "opacity: 0.75";
      case "italic":
        return "font-style: italic";
      case "underline":
        return "text-decoration: underline";
      case "overline":
        return "text-decoration: overline";
      case "inverse":
        return "filter: invert(1)";
      case "hidden":
        return "visibility: hidden";
      case "strikethrough":
        return "text-decoration: line-through";
      default:
        return;
    }
  }
  function getWorkingDirectory() {
    if (cachedCwd === undefined) {
      cachedCwd = safeGetCwd() ?? null;
    }
    return cachedCwd ?? undefined;
  }
  function shouldCaptureHostname() {
    return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
  }
  function shouldCaptureRuntimeVersion() {
    return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
  }
  function createRuntimeMeta(info) {
    if (info.name === "browser" || info.name === "worker") {
      return {
        runtime: info.name,
        browser: info.userAgent
      };
    }
    const metaStatic = {
      runtime: info.name
    };
    if (shouldCaptureRuntimeVersion()) {
      metaStatic.runtimeVersion = info.version ?? "unknown";
    }
    if (shouldCaptureHostname()) {
      metaStatic.hostname = info.hostname ?? "unknown";
    }
    return metaStatic;
  }
  function formatWithOptionsSafe(options, args) {
    try {
      return formatWithOptions(options, ...args);
    } catch {
      return args.map(stringifyFallback).join(" ");
    }
  }
  function stringifyFallback(value) {
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  function normalizeFilePath(value) {
    if (typeof value !== "string" || value.length === 0) {
      return value;
    }
    const replaced = value.replace(/\\+/g, "\\").replace(/\\/g, "/");
    const hasRootDoubleSlash = replaced.startsWith("//");
    const hasLeadingSlash = replaced.startsWith("/") && !hasRootDoubleSlash;
    const driveMatch = replaced.match(/^[A-Za-z]:/);
    const drivePrefix = driveMatch ? driveMatch[0] : "";
    const withoutDrive = drivePrefix ? replaced.slice(drivePrefix.length) : replaced;
    const segments = withoutDrive.split("/");
    const normalizedSegments = [];
    for (const segment of segments) {
      if (segment === "" || segment === ".") {
        continue;
      }
      if (segment === "..") {
        if (normalizedSegments.length > 0) {
          normalizedSegments.pop();
        }
        continue;
      }
      normalizedSegments.push(segment);
    }
    let normalized = normalizedSegments.join("/");
    if (hasRootDoubleSlash) {
      normalized = `//${normalized}`;
    } else if (hasLeadingSlash) {
      normalized = `/${normalized}`;
    } else if (drivePrefix !== "") {
      normalized = `${drivePrefix}${normalized.length > 0 ? `/${normalized}` : ""}`;
    }
    if (normalized.length === 0) {
      return value;
    }
    return normalized;
  }
  function detectRuntimeInfo() {
    if (isBrowserEnvironment()) {
      const navigatorObj = globalThis.navigator;
      return {
        name: "browser",
        userAgent: navigatorObj?.userAgent
      };
    }
    const globalScope = globalThis;
    if (typeof globalScope.importScripts === "function") {
      return {
        name: "worker",
        userAgent: globalScope.navigator?.userAgent
      };
    }
    const globalAny = globalThis;
    if (globalAny.Bun != null) {
      const bunVersion = globalAny.Bun.version;
      return {
        name: "bun",
        version: bunVersion != null ? `bun/${bunVersion}` : undefined,
        hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
      };
    }
    if (globalAny.Deno != null) {
      const denoHostname = resolveDenoHostname(globalAny.Deno);
      const denoVersion = globalAny.Deno?.version?.deno;
      return {
        name: "deno",
        version: denoVersion != null ? `deno/${denoVersion}` : undefined,
        hostname: denoHostname ?? getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
      };
    }
    if (globalAny.process?.versions?.node != null || globalAny.process?.version != null) {
      return {
        name: "node",
        version: globalAny.process?.versions?.node ?? globalAny.process?.version,
        hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
      };
    }
    if (globalAny.process != null) {
      return {
        name: "node",
        version: "unknown",
        hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
      };
    }
    return {
      name: "unknown"
    };
  }
  function getEnvironmentHostname(nodeProcess, deno, bun, location) {
    const processHostname = nodeProcess?.env?.HOSTNAME ?? nodeProcess?.env?.HOST ?? nodeProcess?.env?.COMPUTERNAME;
    if (processHostname != null && processHostname.length > 0) {
      return processHostname;
    }
    const bunHostname = bun?.env?.HOSTNAME ?? bun?.env?.HOST ?? bun?.env?.COMPUTERNAME;
    if (bunHostname != null && bunHostname.length > 0) {
      return bunHostname;
    }
    try {
      const denoEnvGet = deno?.env?.get;
      if (typeof denoEnvGet === "function") {
        const value = denoEnvGet("HOSTNAME");
        if (value != null && value.length > 0) {
          return value;
        }
      }
    } catch {}
    if (location?.hostname != null && location.hostname.length > 0) {
      return location.hostname;
    }
    return;
  }
  function resolveDenoHostname(deno) {
    try {
      if (typeof deno?.hostname === "function") {
        const value = deno.hostname();
        if (value != null && value.length > 0) {
          return value;
        }
      }
    } catch {}
    const locationHostname = globalThis.location?.hostname;
    if (locationHostname != null && locationHostname.length > 0) {
      return locationHostname;
    }
    return;
  }
  function getNodeEnv() {
    const globalProcess = globalThis?.process;
    return globalProcess?.env?.NODE_ENV;
  }
  function isNativeError(value) {
    if (value instanceof Error) {
      return true;
    }
    if (value != null && typeof value === "object") {
      const objectTag = Object.prototype.toString.call(value);
      if (/\[object .*Error\]/.test(objectTag)) {
        return true;
      }
      const name = value.name;
      if (typeof name === "string" && name.endsWith("Error")) {
        return true;
      }
    }
    return false;
  }
}
var ANSI_REGEX = /\u001b\[[0-9;]*m/g;
var COLOR_TOKENS = {
  black: "#000000",
  red: "#ef5350",
  green: "#66bb6a",
  yellow: "#fdd835",
  blue: "#42a5f5",
  magenta: "#ab47bc",
  cyan: "#26c6da",
  white: "#fafafa",
  blackBright: "#424242",
  redBright: "#ff7043",
  greenBright: "#81c784",
  yellowBright: "#ffe082",
  blueBright: "#64b5f6",
  magentaBright: "#ce93d8",
  cyanBright: "#4dd0e1",
  whiteBright: "#ffffff"
};
var BACKGROUND_TOKENS = {
  bgBlack: "#000000",
  bgRed: "#ef5350",
  bgGreen: "#66bb6a",
  bgYellow: "#fdd835",
  bgBlue: "#42a5f5",
  bgMagenta: "#ab47bc",
  bgCyan: "#26c6da",
  bgWhite: "#fafafa",
  bgBlackBright: "#424242",
  bgRedBright: "#ff7043",
  bgGreenBright: "#81c784",
  bgYellowBright: "#ffe082",
  bgBlueBright: "#64b5f6",
  bgMagentaBright: "#ce93d8",
  bgCyanBright: "#4dd0e1",
  bgWhiteBright: "#ffffff"
};
var BROWSER_PATH_REGEX = /(?:(?:file|https?|global code|[^@]+)@)?(?:file:)?((?:\/[^:/]+){2,})(?::(\d+))?(?::(\d+))?/;
var runtime = createLoggerEnvironment();
class BaseLogger {
  constructor(settings, logObj, stackDepthLevel = Number.NaN) {
    this.logObj = logObj;
    this.stackDepthLevel = stackDepthLevel;
    this.runtime = runtime;
    this.maxErrorCauseDepth = 5;
    this.settings = {
      type: settings?.type ?? "pretty",
      name: settings?.name,
      parentNames: settings?.parentNames,
      minLevel: settings?.minLevel ?? 0,
      argumentsArrayName: settings?.argumentsArrayName,
      hideLogPositionForProduction: settings?.hideLogPositionForProduction ?? false,
      prettyLogTemplate: settings?.prettyLogTemplate ?? "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t{{filePathWithLine}}{{nameWithDelimiterPrefix}}\t",
      prettyErrorTemplate: settings?.prettyErrorTemplate ?? `
{{errorName}} {{errorMessage}}
error stack:
{{errorStack}}`,
      prettyErrorStackTemplate: settings?.prettyErrorStackTemplate ?? `  • {{fileName}}	{{method}}
	{{filePathWithLine}}`,
      prettyErrorParentNamesSeparator: settings?.prettyErrorParentNamesSeparator ?? ":",
      prettyErrorLoggerNameDelimiter: settings?.prettyErrorLoggerNameDelimiter ?? "\t",
      stylePrettyLogs: settings?.stylePrettyLogs ?? true,
      prettyLogTimeZone: settings?.prettyLogTimeZone ?? "UTC",
      prettyLogStyles: settings?.prettyLogStyles ?? {
        logLevelName: {
          "*": ["bold", "black", "bgWhiteBright", "dim"],
          SILLY: ["bold", "white"],
          TRACE: ["bold", "whiteBright"],
          DEBUG: ["bold", "green"],
          INFO: ["bold", "blue"],
          WARN: ["bold", "yellow"],
          ERROR: ["bold", "red"],
          FATAL: ["bold", "redBright"]
        },
        dateIsoStr: "white",
        filePathWithLine: "white",
        name: ["white", "bold"],
        nameWithDelimiterPrefix: ["white", "bold"],
        nameWithDelimiterSuffix: ["white", "bold"],
        errorName: ["bold", "bgRedBright", "whiteBright"],
        fileName: ["yellow"],
        fileNameWithLine: "white"
      },
      prettyInspectOptions: settings?.prettyInspectOptions ?? {
        colors: true,
        compact: false,
        depth: Infinity
      },
      metaProperty: settings?.metaProperty ?? "_meta",
      maskPlaceholder: settings?.maskPlaceholder ?? "[***]",
      maskValuesOfKeys: settings?.maskValuesOfKeys ?? ["password"],
      maskValuesOfKeysCaseInsensitive: settings?.maskValuesOfKeysCaseInsensitive ?? false,
      maskValuesRegEx: settings?.maskValuesRegEx,
      prefix: [...settings?.prefix ?? []],
      attachedTransports: [...settings?.attachedTransports ?? []],
      overwrite: {
        mask: settings?.overwrite?.mask,
        toLogObj: settings?.overwrite?.toLogObj,
        addMeta: settings?.overwrite?.addMeta,
        addPlaceholders: settings?.overwrite?.addPlaceholders,
        formatMeta: settings?.overwrite?.formatMeta,
        formatLogObj: settings?.overwrite?.formatLogObj,
        transportFormatted: settings?.overwrite?.transportFormatted,
        transportJSON: settings?.overwrite?.transportJSON
      }
    };
    this.captureStackForMeta = this._shouldCaptureStack();
  }
  log(logLevelId, logLevelName, ...args) {
    if (logLevelId < this.settings.minLevel) {
      return;
    }
    const resolvedArgs = this._resolveLogArguments(args);
    const logArgs = [...this.settings.prefix, ...resolvedArgs];
    const maskedArgs = this.settings.overwrite?.mask != null ? this.settings.overwrite?.mask(logArgs) : this.settings.maskValuesOfKeys != null && this.settings.maskValuesOfKeys.length > 0 ? this._mask(logArgs) : logArgs;
    const thisLogObj = this.logObj != null ? this._recursiveCloneAndExecuteFunctions(this.logObj) : undefined;
    const logObj = this.settings.overwrite?.toLogObj != null ? this.settings.overwrite?.toLogObj(maskedArgs, thisLogObj) : this._toLogObj(maskedArgs, thisLogObj);
    const logObjWithMeta = this.settings.overwrite?.addMeta != null ? this.settings.overwrite?.addMeta(logObj, logLevelId, logLevelName) : this._addMetaToLogObj(logObj, logLevelId, logLevelName);
    const logMeta = logObjWithMeta?.[this.settings.metaProperty];
    let logMetaMarkup;
    let logArgsAndErrorsMarkup = undefined;
    if (this.settings.overwrite?.formatMeta != null) {
      logMetaMarkup = this.settings.overwrite?.formatMeta(logObjWithMeta?.[this.settings.metaProperty]);
    }
    if (this.settings.overwrite?.formatLogObj != null) {
      logArgsAndErrorsMarkup = this.settings.overwrite?.formatLogObj(maskedArgs, this.settings);
    }
    if (this.settings.type === "pretty") {
      logMetaMarkup = logMetaMarkup ?? this._prettyFormatLogObjMeta(logObjWithMeta?.[this.settings.metaProperty]);
      logArgsAndErrorsMarkup = logArgsAndErrorsMarkup ?? runtime.prettyFormatLogObj(maskedArgs, this.settings);
    }
    if (logMetaMarkup != null && logArgsAndErrorsMarkup != null) {
      if (this.settings.overwrite?.transportFormatted != null) {
        const transport = this.settings.overwrite.transportFormatted;
        const declaredParams = transport.length;
        if (declaredParams < 4) {
          transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors);
        } else if (declaredParams === 4) {
          transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta);
        } else {
          transport(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta, this.settings);
        }
      } else {
        runtime.transportFormatted(logMetaMarkup, logArgsAndErrorsMarkup.args, logArgsAndErrorsMarkup.errors, logMeta, this.settings);
      }
    } else {
      if (this.settings.overwrite?.transportJSON != null) {
        this.settings.overwrite.transportJSON(logObjWithMeta);
      } else if (this.settings.type !== "hidden") {
        runtime.transportJSON(logObjWithMeta);
      }
    }
    if (this.settings.attachedTransports != null && this.settings.attachedTransports.length > 0) {
      this.settings.attachedTransports.forEach((transportLogger) => {
        transportLogger(logObjWithMeta);
      });
    }
    return logObjWithMeta;
  }
  attachTransport(transportLogger) {
    this.settings.attachedTransports.push(transportLogger);
  }
  getSubLogger(settings, logObj) {
    const subLoggerSettings = {
      ...this.settings,
      ...settings,
      parentNames: this.settings?.parentNames != null && this.settings?.name != null ? [...this.settings.parentNames, this.settings.name] : this.settings?.name != null ? [this.settings.name] : undefined,
      prefix: [...this.settings.prefix, ...settings?.prefix ?? []]
    };
    const subLogger = new this.constructor(subLoggerSettings, logObj ?? this.logObj, this.stackDepthLevel);
    return subLogger;
  }
  _mask(args) {
    const maskKeys = this._getMaskKeys();
    return args?.map((arg) => {
      return this._recursiveCloneAndMaskValuesOfKeys(arg, maskKeys);
    });
  }
  _getMaskKeys() {
    const maskKeys = this.settings.maskValuesOfKeys ?? [];
    const signature = maskKeys.map(String).join("|");
    if (this.settings.maskValuesOfKeysCaseInsensitive === true) {
      if (this.maskKeysCache?.source === maskKeys && this.maskKeysCache.caseInsensitive === true && this.maskKeysCache.signature === signature) {
        return this.maskKeysCache.normalized;
      }
      const normalized = maskKeys.map((key) => typeof key === "string" ? key.toLowerCase() : String(key).toLowerCase());
      this.maskKeysCache = {
        source: maskKeys,
        caseInsensitive: true,
        normalized,
        signature
      };
      return normalized;
    }
    this.maskKeysCache = {
      source: maskKeys,
      caseInsensitive: false,
      normalized: maskKeys,
      signature
    };
    return maskKeys;
  }
  _resolveLogArguments(args) {
    if (args.length === 1 && typeof args[0] === "function") {
      const candidate = args[0];
      if (candidate.length === 0) {
        const result = candidate();
        return Array.isArray(result) ? result : [result];
      }
    }
    return args;
  }
  _recursiveCloneAndMaskValuesOfKeys(source, keys, seen = []) {
    if (seen.includes(source)) {
      return { ...source };
    }
    if (typeof source === "object" && source !== null) {
      seen.push(source);
    }
    if (runtime.isError(source) || runtime.isBuffer(source)) {
      return source;
    } else if (source instanceof Map) {
      return new Map(source);
    } else if (source instanceof Set) {
      return new Set(source);
    } else if (Array.isArray(source)) {
      return source.map((item) => this._recursiveCloneAndMaskValuesOfKeys(item, keys, seen));
    } else if (source instanceof Date) {
      return new Date(source.getTime());
    } else if (source instanceof URL) {
      return urlToObject(source);
    } else if (source !== null && typeof source === "object") {
      const baseObject = runtime.isError(source) ? this._cloneError(source) : Object.create(Object.getPrototypeOf(source));
      return Object.getOwnPropertyNames(source).reduce((o, prop) => {
        const lookupKey = this.settings?.maskValuesOfKeysCaseInsensitive !== true ? prop : typeof prop === "string" ? prop.toLowerCase() : String(prop).toLowerCase();
        o[prop] = keys.includes(lookupKey) ? this.settings.maskPlaceholder : (() => {
          try {
            return this._recursiveCloneAndMaskValuesOfKeys(source[prop], keys, seen);
          } catch {
            return null;
          }
        })();
        return o;
      }, baseObject);
    } else {
      if (typeof source === "string") {
        let modifiedSource = source;
        for (const regEx of this.settings?.maskValuesRegEx || []) {
          modifiedSource = modifiedSource.replace(regEx, this.settings?.maskPlaceholder || "");
        }
        return modifiedSource;
      }
      return source;
    }
  }
  _recursiveCloneAndExecuteFunctions(source, seen = []) {
    if (this.isObjectOrArray(source) && seen.includes(source)) {
      return this.shallowCopy(source);
    }
    if (this.isObjectOrArray(source)) {
      seen.push(source);
    }
    if (Array.isArray(source)) {
      return source.map((item) => this._recursiveCloneAndExecuteFunctions(item, seen));
    } else if (source instanceof Date) {
      return new Date(source.getTime());
    } else if (this.isObject(source)) {
      return Object.getOwnPropertyNames(source).reduce((o, prop) => {
        const descriptor = Object.getOwnPropertyDescriptor(source, prop);
        if (descriptor) {
          Object.defineProperty(o, prop, descriptor);
          const value = source[prop];
          o[prop] = typeof value === "function" ? value() : this._recursiveCloneAndExecuteFunctions(value, seen);
        }
        return o;
      }, Object.create(Object.getPrototypeOf(source)));
    } else {
      return source;
    }
  }
  isObjectOrArray(value) {
    return typeof value === "object" && value !== null;
  }
  isObject(value) {
    return typeof value === "object" && !Array.isArray(value) && value !== null;
  }
  shallowCopy(source) {
    if (Array.isArray(source)) {
      return [...source];
    } else {
      return { ...source };
    }
  }
  _toLogObj(args, clonedLogObj = {}) {
    args = args?.map((arg) => runtime.isError(arg) ? this._toErrorObject(arg) : arg);
    if (this.settings.argumentsArrayName == null) {
      if (args.length === 1 && !Array.isArray(args[0]) && runtime.isBuffer(args[0]) !== true && !(args[0] instanceof Date)) {
        clonedLogObj = typeof args[0] === "object" && args[0] != null ? { ...args[0], ...clonedLogObj } : { 0: args[0], ...clonedLogObj };
      } else {
        clonedLogObj = { ...clonedLogObj, ...args };
      }
    } else {
      clonedLogObj = {
        ...clonedLogObj,
        [this.settings.argumentsArrayName]: args
      };
    }
    return clonedLogObj;
  }
  _cloneError(error) {
    const cloned = new error.constructor;
    Object.getOwnPropertyNames(error).forEach((key) => {
      cloned[key] = error[key];
    });
    return cloned;
  }
  _toErrorObject(error, depth = 0, seen = new Set) {
    if (!seen.has(error)) {
      seen.add(error);
    }
    const errorObject = {
      nativeError: error,
      name: error.name ?? "Error",
      message: error.message,
      stack: runtime.getErrorTrace(error)
    };
    if (depth >= this.maxErrorCauseDepth) {
      return errorObject;
    }
    const causeValue = error.cause;
    if (causeValue != null) {
      const normalizedCause = toError(causeValue);
      if (!seen.has(normalizedCause)) {
        errorObject.cause = this._toErrorObject(normalizedCause, depth + 1, seen);
      }
    }
    return errorObject;
  }
  _addMetaToLogObj(logObj, logLevelId, logLevelName) {
    return {
      ...logObj,
      [this.settings.metaProperty]: runtime.getMeta(logLevelId, logLevelName, this.stackDepthLevel, !this.captureStackForMeta, this.settings.name, this.settings.parentNames)
    };
  }
  _shouldCaptureStack() {
    if (this.settings.hideLogPositionForProduction) {
      return false;
    }
    if (this.settings.type === "json") {
      return true;
    }
    const template = this.settings.prettyLogTemplate ?? "";
    const stackPlaceholders = /{{\s*(file(Name|Path|Line|PathWithLine|NameWithLine)|fullFilePath)\s*}}/;
    if (stackPlaceholders.test(template)) {
      return true;
    }
    return false;
  }
  _prettyFormatLogObjMeta(logObjMeta) {
    return buildPrettyMeta(this.settings, logObjMeta).text;
  }
}

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/index.js
class Logger extends BaseLogger {
  constructor(settings, logObj) {
    const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
    const normalizedSettings = { ...settings ?? {} };
    if (isBrowser) {
      normalizedSettings.stylePrettyLogs = settings?.stylePrettyLogs ?? true;
    }
    super(normalizedSettings, logObj, Number.NaN);
  }
  log(logLevelId, logLevelName, ...args) {
    return super.log(logLevelId, logLevelName, ...args);
  }
  silly(...args) {
    return super.log(0, "SILLY", ...args);
  }
  trace(...args) {
    return super.log(1, "TRACE", ...args);
  }
  debug(...args) {
    return super.log(2, "DEBUG", ...args);
  }
  info(...args) {
    return super.log(3, "INFO", ...args);
  }
  warn(...args) {
    return super.log(4, "WARN", ...args);
  }
  error(...args) {
    return super.log(5, "ERROR", ...args);
  }
  fatal(...args) {
    return super.log(6, "FATAL", ...args);
  }
  getSubLogger(settings, logObj) {
    return super.getSubLogger(settings, logObj);
  }
}

// ../core/src/utils/logger.ts
var logger_NiceError = new Logger({
  name: "NiceErrorLogger"
});
var logger_NiceError_testing = logger_NiceError.getSubLogger({
  name: "NiceErrorTestingLogger"
});
// src/validation/standard_schema/extractMessageFromStandardSchema.ts
function extractPathFromIssue(issue) {
  let pathString = "";
  for (const segment of issue) {
    if (typeof segment === "object") {
      if (segment.key != null) {
        if (typeof segment.key === "number") {
          pathString += `[${String(segment.key)}]`;
        } else if (typeof segment.key === "symbol") {
          pathString += `[SYMBOL:${String(segment.key)}]`;
        } else {
          pathString += `.${String(segment.key)}`;
        }
      }
    } else {
      pathString += `.${String(segment)}`;
    }
  }
  return pathString.slice(1);
}
var extractMessageFromStandardSchema = (failureResult) => {
  let message = `Data validation failed:
`;
  let issueCount = 0;
  for (const issue of failureResult.issues) {
    issueCount++;
    if (issue.path == null || issue.path.length === 0) {
      message += ` (issue ${issueCount}) ${issue.message}
`;
    } else {
      message += ` (issue ${issueCount}) [${extractPathFromIssue(issue.path)}]: ${issue.message}
`;
    }
  }
  return message;
};

// src/validation/err_validation.ts
var EValidator;
((EValidator2) => {
  EValidator2["standard_schema"] = "standard_schema";
})(EValidator ||= {});
var err_validation = err_nice.createChildDomain({
  domain: "err_validation",
  defaultHttpStatusCode: StatusCodes.BAD_REQUEST,
  schema: {
    ["standard_schema" /* standard_schema */]: err({
      message: ({ issues }) => extractMessageFromStandardSchema({ issues })
    })
  }
});
export {
  extractMessageFromStandardSchema,
  err_validation,
  EValidator
};
