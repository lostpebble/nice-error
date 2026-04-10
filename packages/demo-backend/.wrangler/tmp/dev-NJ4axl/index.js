var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../node_modules/.bun/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");

// ../../node_modules/.bun/unenv@2.0.0-rc.24/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../node_modules/.bun/@cloudflare+unenv-preset@2.16.0+325f81afe00bd94b/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// src/cloudflare_worker/durable_object/DurObjExampleUser.ts
import { DurableObject } from "cloudflare:workers";

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
  "Accepted": 202,
  "Bad Gateway": 502,
  "Bad Request": 400,
  "Conflict": 409,
  "Continue": 100,
  "Created": 201,
  "Expectation Failed": 417,
  "Failed Dependency": 424,
  "Forbidden": 403,
  "Gateway Timeout": 504,
  "Gone": 410,
  "HTTP Version Not Supported": 505,
  "I'm a teapot": 418,
  "Insufficient Space on Resource": 419,
  "Insufficient Storage": 507,
  "Internal Server Error": 500,
  "Length Required": 411,
  "Locked": 423,
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
  "OK": 200,
  "Partial Content": 206,
  "Payment Required": 402,
  "Permanent Redirect": 308,
  "Precondition Failed": 412,
  "Precondition Required": 428,
  "Processing": 102,
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
  "Unauthorized": 401,
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
__name(getReasonPhrase, "getReasonPhrase");
function getStatusCode(reasonPhrase) {
  var result = reasonPhraseToStatusCode[reasonPhrase];
  if (!result) {
    throw new Error("Reason phrase does not exist: " + reasonPhrase);
  }
  return result;
}
__name(getStatusCode, "getStatusCode");
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
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
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
__name(jsErrorOrCastJsError, "jsErrorOrCastJsError");

// ../core/src/NiceError/nice_error.static.ts
var DUR_OBJ_PACK_PREFIX = "NE_DUROBJ[[";
var DUR_OBJ_PACK_SUFFIX = "]]NE_DUROBJ";

// ../core/src/utils/packError/causePack.ts
var causePack = /* @__PURE__ */ __name((error) => {
  error._packedState = { cause: error.cause, packedAs: "cause_pack" /* cause_pack */ };
  error.cause = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
}, "causePack");

// ../core/src/utils/packError/msgPack.ts
var msgPack = /* @__PURE__ */ __name((error) => {
  error._packedState = { message: error.message, packedAs: "msg_pack" /* msg_pack */ };
  error.message = `${DUR_OBJ_PACK_PREFIX}${JSON.stringify(error.toJsonObject())}${DUR_OBJ_PACK_SUFFIX}`;
  return error;
}, "msgPack");

// ../core/src/utils/packError/packError.ts
var packError = /* @__PURE__ */ __name((error, packType = "cause_pack") => {
  if (packType === "msg_pack") {
    return msgPack(error);
  }
  return causePack(error);
}, "packError");

// ../core/src/NiceError/NiceError.ts
var NiceError = class extends Error {
  static {
    __name(this, "NiceError");
  }
  name = "NiceError";
  def;
  /** Primary id is first entry in ids. */
  ids;
  wasntNice;
  httpStatusCode;
  originError;
  _packedState;
  /** Internal: all active id → reconciled data pairs. */
  _errorDataMap;
  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------
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
  // -------------------------------------------------------------------------
  // hasId — narrows ACTIVE_IDS to exactly ID
  // -------------------------------------------------------------------------
  /**
   * Type guard: returns `true` if this error was created with (or contains) the
   * given `id`. After the guard, `getContext(id)` will be strongly typed.
   */
  hasId(id) {
    return id in this._errorDataMap;
  }
  // -------------------------------------------------------------------------
  // hasOneOfIds — narrows ACTIVE_IDS to the supplied subset
  // -------------------------------------------------------------------------
  /**
   * Returns `true` if this error contains **at least one** of the supplied ids.
   * Narrows `ACTIVE_IDS` to the matching subset of `IDS`.
   */
  hasOneOfIds(ids) {
    return ids.some((id) => id in this._errorDataMap);
  }
  // -------------------------------------------------------------------------
  // get hasMultiple
  // -------------------------------------------------------------------------
  /** `true` when this error was created with more than one id (via `fromContext`). */
  get hasMultiple() {
    return Object.keys(this._errorDataMap).length > 1;
  }
  // -------------------------------------------------------------------------
  // getIds
  // -------------------------------------------------------------------------
  /** Returns all active error ids on this instance. */
  getIds() {
    return Object.keys(this._errorDataMap);
  }
  // -------------------------------------------------------------------------
  // getContext — strongly typed per ACTIVE_IDS
  // -------------------------------------------------------------------------
  /**
   * Returns the typed context value for the given error id.
   *
   * TypeScript will only allow you to call this with an id that is part of
   * `ACTIVE_IDS` (i.e. an id confirmed via `hasId` / `hasOneOfIds`, or passed
   * to `fromId` / `fromContext`).
   *
   * @throws If the context is in the `"unhydrated"` state — the error was
   * reconstructed from a JSON payload and its context has a custom serializer
   * that hasn't been run yet. Call `niceErrorDefined.hydrate(error)` first.
   */
  getContext(id) {
    const errorData = this._errorDataMap[id];
    const state = errorData?.contextState;
    if (state == null) {
      return void 0;
    }
    if (state.kind === "unhydrated") {
      throw new Error(
        `[NiceError.getContext] Context for id "${String(id)}" is in the "unhydrated" state. The error was reconstructed from a serialized payload but has not been deserialized yet. Call \`niceErrorDefined.hydrate(error)\` to reconstruct the typed context.`
      );
    }
    return state.value;
  }
  // -------------------------------------------------------------------------
  // getErrorDataForId
  // -------------------------------------------------------------------------
  getErrorDataForId(id) {
    return this._errorDataMap[id];
  }
  // -------------------------------------------------------------------------
  // withOriginError
  // -------------------------------------------------------------------------
  withOriginError(error) {
    this.originError = jsErrorOrCastJsError(error);
    this.cause = this.originError;
    return this;
  }
  // -------------------------------------------------------------------------
  // matches — fingerprint comparison
  // -------------------------------------------------------------------------
  /**
   * Returns `true` if `other` has the same domain and the exact same set of
   * active error ids as this error (order-independent).
   *
   * Useful for deduplication, retry logic, and asserting that two errors
   * represent the same "kind" of problem without comparing context values.
   *
   * ```ts
   * const a = err_auth.fromId("invalid_credentials", { username: "alice" });
   * const b = err_auth.fromId("invalid_credentials", { username: "bob" });
   * a.matches(b); // true  — same domain + same id set
   *
   * const c = err_auth.fromId("account_locked");
   * a.matches(c); // false — same domain, different id
   * ```
   */
  matches(other) {
    const myDef = this.def;
    const otherDef = other.def;
    if (myDef.domain !== otherDef.domain) return false;
    const myIds = this.getIds().map(String).sort();
    const otherIds = other.getIds().map(String).sort();
    if (myIds.length !== otherIds.length) return false;
    return myIds.every((id, i) => id === otherIds[i]);
  }
  // -------------------------------------------------------------------------
  // toJsonObject
  // -------------------------------------------------------------------------
  toJsonObject() {
    const originError = this.originError ? {
      name: this.originError.name,
      message: this.originError.message,
      stack: this.originError.stack,
      cause: this.originError.cause
    } : void 0;
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
      if (data == null) continue;
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
      ...this.stack !== void 0 ? { stack: this.stack } : {},
      originError
    };
  }
  // -------------------------------------------------------------------------
  // hydrate — convenience delegation to NiceErrorDefined
  // -------------------------------------------------------------------------
  hydrate(definedNiceError) {
    return definedNiceError.hydrate(this);
  }
  // -------------------------------------------------------------------------
  // handleWith — synchronous domain-dispatched error handling
  // -------------------------------------------------------------------------
  /**
   * Iterates `cases` in order, finds the first whose domain matches this error
   * (via `is()`), optionally further filters by active ids, hydrates the error,
   * calls the handler, and returns `true`. Returns `false` if no case matched.
   *
   * Build cases with `forDomain` (any id in the domain) or `forIds` (specific
   * id subset). Handlers are invoked synchronously — any returned Promise is
   * not awaited. Use `handleWithAsync` when handlers are async.
   *
   * @example
   * ```ts
   * const handled = error.handleWith([
   *   forIds(err_feature, ["not_found"], (h) => {
   *     res.status(404).json({ missing: h.getContext("not_found").resource });
   *   }),
   *   forDomain(err_feature, (h) => {
   *     matchFirst(h, {
   *       forbidden: ({ userId }) => res.status(403).json({ userId }),
   *       _: () => res.status(500).end(),
   *     });
   *   }),
   *   forDomain(err_service, (h) => {
   *     res.status(h.httpStatusCode).json({ error: h.message });
   *   }),
   * ]);
   * if (!handled) next(error);
   * ```
   */
  handleWith(cases) {
    for (const c of cases) {
      if (!c._domain.is(this)) continue;
      if (c._ids !== void 0 && !this.hasOneOfIds(c._ids)) continue;
      c._handler(c._domain.hydrate(this));
      return true;
    }
    return false;
  }
  // -------------------------------------------------------------------------
  // handleWithAsync — async domain-dispatched error handling
  // -------------------------------------------------------------------------
  /**
   * Same matching logic as `handleWith`, but `await`s the handler's returned
   * Promise before resolving. Use this when your handlers perform async work
   * (database writes, HTTP calls, etc.).
   *
   * @example
   * ```ts
   * const handled = await error.handleWithAsync([
   *   forDomain(err_payments, async (h) => {
   *     await db.logFailedPayment(h);
   *     await notifyOps(h.message);
   *   }),
   * ]);
   * ```
   */
  async handleWithAsync(cases) {
    for (const c of cases) {
      if (!c._domain.is(this)) continue;
      if (c._ids !== void 0 && !this.hasOneOfIds(c._ids)) continue;
      await c._handler(c._domain.hydrate(this));
      return true;
    }
    return false;
  }
  pack(packType = "msg_pack") {
    if (this._packedState != null) return this;
    return packError(this, packType);
  }
  unpack() {
    if (this._packedState == null) return this;
    if (this._packedState.packedAs === "msg_pack" /* msg_pack */) {
      this.message = this._packedState.message;
    }
    if (this._packedState.packedAs === "cause_pack" /* cause_pack */) {
      this.cause = this._packedState.cause;
    }
    this._packedState = void 0;
    delete this._packedState;
    return this;
  }
};

// ../core/src/NiceError/NiceErrorHydrated.ts
var NiceErrorHydrated = class _NiceErrorHydrated extends NiceError {
  static {
    __name(this, "NiceErrorHydrated");
  }
  def;
  niceErrorDefined;
  constructor(options) {
    super(options);
    this.def = options.def;
    this.niceErrorDefined = options.niceErrorDefined;
  }
  // -------------------------------------------------------------------------
  // addContext — merge additional id+context entries into this error
  // -------------------------------------------------------------------------
  /**
   * Returns a **new** `NiceErrorHydrated` with additional id+context entries merged in.
   * The returned error's `ACTIVE_IDS` is the union of the original ids and the
   * newly supplied keys.
   *
   * ```ts
   * const err = errDef.fromId("id_a", { a: 1 })
   *   .addContext({ id_b: { b: "x" } });
   * err.getIds(); // ["id_a", "id_b"]
   * ```
   */
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
    const mergedIds = Array.from(/* @__PURE__ */ new Set([...this.getIds(), ...Object.keys(context)]));
    return new _NiceErrorHydrated({
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
  // -------------------------------------------------------------------------
  // addId — add a single id (with optional context) to this error
  // -------------------------------------------------------------------------
  /**
   * Returns a **new** `NiceErrorHydrated` with an additional error id (and its context,
   * if the schema requires one). Equivalent to `addContext({ [id]: context })`
   * but mirrors the `fromId` ergonomics for single-id additions.
   */
  addId(...args) {
    const [id, context] = args;
    const reconciledData = this.niceErrorDefined.reconcileErrorDataForId(id, context);
    const errorDataMap = {};
    errorDataMap[id] = reconciledData;
    const mergedContexts = {
      ...this._errorDataMap,
      ...errorDataMap
    };
    const mergedIds = Array.from(/* @__PURE__ */ new Set([...this.getIds(), id]));
    return new _NiceErrorHydrated({
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
};

// ../core/src/NiceErrorDefined/NiceErrorDefined.ts
var NiceErrorDefined = class _NiceErrorDefined {
  static {
    __name(this, "NiceErrorDefined");
  }
  domain;
  allDomains;
  defaultHttpStatusCode;
  defaultMessage;
  /** Kept for runtime use (message resolution, httpStatusCode, context serialization, etc.). */
  _schema;
  _definedChildNiceErrors = [];
  _definedParentNiceError;
  /** Set by `.packAs()` — explicit per-instance override, takes priority over `_packAsFn`. */
  _setPack;
  /** Set at definition time — called dynamically each time an error is created. */
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
  // -------------------------------------------------------------------------
  // createChildDomain
  // -------------------------------------------------------------------------
  /**
   * Creates a child domain that inherits this domain in `allDomains`.
   * The child has its own schema and its own domain string.
   */
  createChildDomain(subErrorDef) {
    const child = new _NiceErrorDefined({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains],
      schema: subErrorDef.schema
    });
    this.addChildNiceErrorDefined(child);
    child.addParentNiceErrorDefined(this);
    if (this._setPack) {
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
    const err2 = new NiceErrorHydrated(input);
    const packType = this._setPack ?? this._packAsFn?.();
    if (packType != null && packType !== "no_pack") {
      return err2.pack(packType);
    }
    return err2;
  }
  // -------------------------------------------------------------------------
  // hydrate
  // -------------------------------------------------------------------------
  /**
   * Promotes a plain `NiceError<ERR_DEF>` back into a `NiceErrorHydrated` so
   * that builder methods (`addId`, `addContext`, etc.) are available again.
   *
   * For each active id, if the context is in the `"unhydrated"` state (i.e. the
   * error was reconstructed from a JSON payload), `hydrate` calls
   * `fromJsonSerializable` to reconstruct the typed value and advances the state
   * to `"hydrated"`. Ids already in `"hydrated"` or `"raw_unset"` state
   * are passed through unchanged.
   *
   * @throws If `error.def.domain` does not match this definition's domain. Use
   * `niceErrorDefined.is(error)` before calling `hydrate` to ensure compatibility.
   *
   * ```ts
   * const raw = castNiceError(apiResponseBody);
   *
   * if (err_user_auth.is(raw)) {
   *   const hydrated = err_user_auth.hydrate(raw);
   *   // hydrated.getContext("invalid_credentials") — fully typed, no throw
   *   // hydrated.addId / addContext — available again
   * }
   * ```
   */
  hydrate(error) {
    const errDef = error.def;
    if (errDef.domain !== this.domain) {
      throw new Error(
        `[NiceErrorDefined.hydrate] Domain mismatch: this definition is "${this.domain}" but the error belongs to "${errDef.domain}". Call \`niceErrorDefined.is(error)\` before hydrating to ensure compatibility.`
      );
    }
    const reconciledErrorData = {};
    for (const id of error.getIds()) {
      const existingData = error.getErrorDataForId(id);
      if (existingData == null) continue;
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
  // -------------------------------------------------------------------------
  // fromId — single-id construction
  // -------------------------------------------------------------------------
  /**
   * Creates a `NiceErrorHydrated` for a single error id.
   *
   * - `id` autocompletes to the schema keys.
   * - The second argument `context` is required / optional / absent based on
   *   whether the schema entry declares `context.required: true`.
   * - The returned error has `ACTIVE_IDS` narrowed to exactly `K`, so
   *   `getContext(id)` is immediately strongly typed.
   */
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
  // -------------------------------------------------------------------------
  // fromContext — multi-id construction
  // -------------------------------------------------------------------------
  fromContext(context) {
    const ids = Object.keys(context);
    if (ids.length === 0) {
      throw new Error(
        "[NiceErrorDefined.fromContext] context object must contain at least one error id."
      );
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
  // -------------------------------------------------------------------------
  // is — type-narrowing guard
  // -------------------------------------------------------------------------
  /**
   * Returns `true` if `error` is a `NiceError` whose `def.domain` exactly matches
   * this definition's domain.
   *
   * Use this after `castNiceError` to narrow an unknown error to this specific
   * domain before accessing its typed ids/context:
   *
   * ```ts
   * const caught = castNiceError(e);
   *
   * if (err_user_auth.is(caught)) {
   *   // caught is now NiceError<typeof err_user_auth's ERR_DEF>
   *   const hydrated = err_user_auth.hydrate(caught);
   *   const { username } = hydrated.getContext("invalid_credentials");
   * }
   * ```
   */
  is(error) {
    if (!(error instanceof NiceError)) return false;
    const errDef = error.def;
    return errDef.domain === this.domain;
  }
  // -------------------------------------------------------------------------
  // isParentOf — ancestry check
  // -------------------------------------------------------------------------
  /**
   * Returns `true` if this domain appears anywhere in the target's ancestry
   * chain (including an exact domain match).
   *
   * Accepts either a `NiceErrorDefined` (domain definition) or a `NiceError`
   * instance (extracts the domain from its `def`).
   */
  isParentOf(target) {
    const allDomains = target instanceof NiceError ? target.def.allDomains : target.allDomains;
    return Array.isArray(allDomains) && allDomains.includes(this.domain);
  }
  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------
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
};

// ../core/src/NiceErrorDefined/defineNiceError.ts
var defineNiceError = /* @__PURE__ */ __name((definition) => {
  return new NiceErrorDefined({
    domain: definition.domain,
    allDomains: [definition.domain],
    schema: definition.schema,
    ...definition.packAs != null ? { packAs: definition.packAs } : {}
  });
}, "defineNiceError");

// ../core/src/NiceErrorDefined/err.ts
function err(meta) {
  return meta ?? {};
}
__name(err, "err");

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
      message: /* @__PURE__ */ __name(({ jsError }) => `A native JavaScript Error was encountered during casting: ${jsError.message}`, "message"),
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR
    }),
    ["js_error_like_object" /* js_error_like_object */]: err({
      context: {
        required: true
      },
      message: /* @__PURE__ */ __name(({ jsErrorObject }) => `An object resembling a JavaScript Error was encountered during casting: [${jsErrorObject.name}] ${jsErrorObject.message}`, "message"),
      httpStatusCode: StatusCodes.INTERNAL_SERVER_ERROR
    }),
    ["nullish_value" /* nullish_value */]: err({
      context: {
        required: true
      },
      message: /* @__PURE__ */ __name(({ value }) => `A nullish value [${value === null ? "null" : "undefined"}] was encountered during casting`, "message")
    }),
    ["js_data_type" /* js_data_type */]: err({
      context: {
        required: true
      },
      message: /* @__PURE__ */ __name(({ jsDataType, jsDataValue }) => {
        let inspectedValue;
        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {
        }
        return `A value of type [${jsDataType}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      }, "message")
    }),
    ["js_other" /* js_other */]: err({
      context: {
        required: true
      },
      message: /* @__PURE__ */ __name(({ jsDataValue }) => {
        let inspectedValue;
        try {
          inspectedValue = JSON.stringify(jsDataValue);
        } catch {
        }
        return `An unhandled type [${typeof jsDataValue}] with value [${inspectedValue ?? "UNSERIALIZABLE"}] was encountered during casting, which is not a valid error type`;
      }, "message")
    })
  }
});

// ../core/src/utils/isNiceErrorObject.ts
function isNiceErrorObject(obj) {
  if (typeof obj !== "object" || obj == null) return false;
  const o = obj;
  if (o["name"] !== "NiceError" || typeof o["message"] !== "string" || typeof o["wasntNice"] !== "boolean" || typeof o["httpStatusCode"] !== "number") {
    return false;
  }
  const def = o["def"];
  if (typeof def !== "object" || def == null) return false;
  const d = def;
  if (typeof d["domain"] !== "string" || !Array.isArray(d["allDomains"])) return false;
  const errorData = o["errorData"];
  if (errorData != null) {
    if (typeof errorData !== "object") return false;
    for (const entry of Object.values(errorData)) {
      if (entry == null) continue;
      if (typeof entry !== "object") return false;
      const e = entry;
      const state = e["contextState"];
      if (state == null || typeof state !== "object") return false;
      const kind = state["kind"];
      if (kind !== "serde_unset" /* serde_unset */ && kind !== "unhydrated" /* unhydrated */)
        return false;
    }
  }
  return true;
}
__name(isNiceErrorObject, "isNiceErrorObject");

// ../core/src/utils/isRegularErrorObject.ts
function isRegularErrorJsonObject(obj) {
  if (typeof obj !== "object" || obj == null) return false;
  const o = obj;
  return typeof o["name"] === "string" && typeof o["message"] === "string";
}
__name(isRegularErrorJsonObject, "isRegularErrorJsonObject");

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
__name(urlToObject, "urlToObject");

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
  const ansiColorWrap = /* @__PURE__ */ __name((placeholderValue, code) => `\x1B[${code[0]}m${placeholderValue}\x1B[${code[1]}m`, "ansiColorWrap");
  const styleWrap = /* @__PURE__ */ __name((value, style) => {
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
  }, "styleWrap");
  const defaultStyle = null;
  return templateString.replace(/{{(.+?)}}/g, (_, placeholder) => {
    const value = values[placeholder] != null ? String(values[placeholder]) : hideUnsetPlaceholder ? "" : _;
    return settings.stylePrettyLogs ? styleWrap(value, settings?.prettyLogStyles?.[placeholder] ?? defaultStyle) + ansiColorWrap("", prettyLogStyles.reset) : value;
  });
}
__name(formatTemplate, "formatTemplate");

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/formatNumberAddZeros.js
function formatNumberAddZeros(value, digits = 2, addNumber = 0) {
  if (value != null && isNaN(value)) {
    return "";
  }
  value = value != null ? value + addNumber : value;
  return digits === 2 ? value == null ? "--" : value < 10 ? "0" + value : value.toString() : value == null ? "---" : value < 10 ? "00" + value : value < 100 ? "0" + value : value.toString();
}
__name(formatNumberAddZeros, "formatNumberAddZeros");

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
  const dateInSettingsTimeZone = settings.prettyLogTimeZone === "UTC" ? meta.date : meta.date != null ? new Date(meta.date.getTime() - meta.date.getTimezoneOffset() * 6e4) : void 0;
  placeholderValues["rawIsoStr"] = dateInSettingsTimeZone?.toISOString() ?? "";
  placeholderValues["dateIsoStr"] = dateInSettingsTimeZone?.toISOString().replace("T", " ").replace("Z", "") ?? "";
  placeholderValues["logLevelName"] = meta.logLevelName;
  placeholderValues["fileNameWithLine"] = meta.path?.fileNameWithLine ?? "";
  placeholderValues["filePathWithLine"] = meta.path?.filePathWithLine ?? "";
  placeholderValues["fullFilePath"] = meta.path?.fullFilePath ?? "";
  let parentNamesString = settings.parentNames?.join(settings.prettyErrorParentNamesSeparator);
  parentNamesString = parentNamesString != null && meta.name != null ? parentNamesString + settings.prettyErrorParentNamesSeparator : void 0;
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
__name(buildPrettyMeta, "buildPrettyMeta");

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/stackTrace.js
var DEFAULT_IGNORE_PATTERNS = [
  /(?:^|[\\/])node_modules[\\/].*tslog/i,
  /(?:^|[\\/])deps[\\/].*tslog/i,
  /tslog[\\/]+src[\\/]+internal[\\/]/i,
  /tslog[\\/]+src[\\/]BaseLogger/i,
  /tslog[\\/]+src[\\/]index/i
];
function splitStackLines(error) {
  const stack = typeof error?.stack === "string" ? error.stack : void 0;
  if (stack == null || stack.length === 0) {
    return [];
  }
  return stack.split("\n").map((line) => line.trimEnd());
}
__name(splitStackLines, "splitStackLines");
function sanitizeStackLines(lines) {
  return lines.filter((line) => line.length > 0 && !/^\s*Error\b/.test(line));
}
__name(sanitizeStackLines, "sanitizeStackLines");
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
__name(toStackFrames, "toStackFrames");
function findFirstExternalFrameIndex(frames, ignorePatterns = DEFAULT_IGNORE_PATTERNS) {
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const filePathCandidate = frame.filePath ?? "";
    const fullPathCandidate = frame.fullFilePath ?? "";
    if (!ignorePatterns.some((pattern) => pattern.test(filePathCandidate) || pattern.test(fullPathCandidate))) {
      return index;
    }
  }
  return 0;
}
__name(findFirstExternalFrameIndex, "findFirstExternalFrameIndex");
function getCleanStackLines(error) {
  return sanitizeStackLines(splitStackLines(error));
}
__name(getCleanStackLines, "getCleanStackLines");
function buildStackTrace(error, parseLine) {
  return toStackFrames(getCleanStackLines(error), parseLine);
}
__name(buildStackTrace, "buildStackTrace");
function clampIndex(index, maxExclusive) {
  if (index < 0) {
    return 0;
  }
  if (index >= maxExclusive) {
    return Math.max(0, maxExclusive - 1);
  }
  return index;
}
__name(clampIndex, "clampIndex");
function getDefaultIgnorePatterns() {
  return [...DEFAULT_IGNORE_PATTERNS];
}
__name(getDefaultIgnorePatterns, "getDefaultIgnorePatterns");

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/errorUtils.js
var DEFAULT_CAUSE_DEPTH = 5;
function collectErrorCauses(error, options = {}) {
  const maxDepth = options.maxDepth ?? DEFAULT_CAUSE_DEPTH;
  const causes = [];
  const visited = /* @__PURE__ */ new Set();
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
__name(collectErrorCauses, "collectErrorCauses");
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
__name(toError, "toError");

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/jsonStringifyRecursive.js
function jsonStringifyRecursive(obj) {
  const cache = /* @__PURE__ */ new Set();
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
__name(jsonStringifyRecursive, "jsonStringifyRecursive");

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
__name(inspect, "inspect");
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
__name(isBoolean, "isBoolean");
function isUndefined(arg) {
  return arg === void 0;
}
__name(isUndefined, "isUndefined");
function stylizeNoColor(str) {
  return str;
}
__name(stylizeNoColor, "stylizeNoColor");
function stylizeWithColor(str, styleType) {
  const style = inspect.styles[styleType];
  if (style != null && inspect?.colors?.[style]?.[0] != null && inspect?.colors?.[style]?.[1] != null) {
    return "\x1B[" + inspect.colors[style][0] + "m" + str + "\x1B[" + inspect.colors[style][1] + "m";
  } else {
    return str;
  }
}
__name(stylizeWithColor, "stylizeWithColor");
function isFunction(arg) {
  return typeof arg === "function";
}
__name(isFunction, "isFunction");
function isString(arg) {
  return typeof arg === "string";
}
__name(isString, "isString");
function isNumber(arg) {
  return typeof arg === "number";
}
__name(isNumber, "isNumber");
function isNull(arg) {
  return arg === null;
}
__name(isNull, "isNull");
function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
__name(hasOwn, "hasOwn");
function isRegExp(re) {
  return isObject(re) && objectToString(re) === "[object RegExp]";
}
__name(isRegExp, "isRegExp");
function isObject(arg) {
  return typeof arg === "object" && arg !== null;
}
__name(isObject, "isObject");
function isError(e) {
  return isObject(e) && (objectToString(e) === "[object Error]" || e instanceof Error);
}
__name(isError, "isError");
function isDate(d) {
  return isObject(d) && objectToString(d) === "[object Date]";
}
__name(isDate, "isDate");
function objectToString(o) {
  return Object.prototype.toString.call(o);
}
__name(objectToString, "objectToString");
function arrayToHash(array) {
  const hash = {};
  array.forEach((val) => {
    hash[val] = true;
  });
  return hash;
}
__name(arrayToHash, "arrayToHash");
function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  const output = [];
  for (let i = 0, l = value.length; i < l; ++i) {
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
__name(formatArray, "formatArray");
function formatError(value) {
  return "[" + Error.prototype.toString.call(value) + "]";
}
__name(formatError, "formatError");
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
  } catch {
  }
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
  let braces = ["{\n", "\n}"];
  if (Array.isArray(value)) {
    array = true;
    braces = ["[\n", "\n]"];
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
__name(formatValue, "formatValue");
function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  let name, str;
  let desc = { value: void 0 };
  try {
    desc.value = value[key];
  } catch {
  }
  try {
    if (Object.getOwnPropertyDescriptor) {
      desc = Object.getOwnPropertyDescriptor(value, key) || desc;
    }
  } catch {
  }
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
        str = formatValue(ctx, desc.value, void 0);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf("\n") > -1) {
        if (array) {
          str = str.split("\n").map((line) => {
            return "  " + line;
          }).join("\n").substr(2);
        } else {
          str = "\n" + str.split("\n").map((line) => {
            return "   " + line;
          }).join("\n");
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
__name(formatProperty, "formatProperty");
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
__name(formatPrimitive, "formatPrimitive");
function reduceToSingleString(output, base, braces) {
  return braces[0] + (base === "" ? "" : base + "\n") + "  " + output.join(",\n  ") + " " + braces[1];
}
__name(reduceToSingleString, "reduceToSingleString");
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
__name(_extend, "_extend");
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
    for (let i = 0; i < first.length - 1; i++) {
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
__name(formatWithOptions, "formatWithOptions");

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/internal/environment.js
function safeGetCwd() {
  try {
    const nodeProcess = globalThis?.process;
    if (typeof nodeProcess?.cwd === "function") {
      return nodeProcess.cwd();
    }
  } catch {
  }
  try {
    const deno = globalThis?.["Deno"];
    if (typeof deno?.cwd === "function") {
      return deno.cwd();
    }
  } catch {
  }
  return void 0;
}
__name(safeGetCwd, "safeGetCwd");
function isBrowserEnvironment() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
__name(isBrowserEnvironment, "isBrowserEnvironment");
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
__name(consoleSupportsCssStyling, "consoleSupportsCssStyling");

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
        date: /* @__PURE__ */ new Date(),
        logLevelId,
        logLevelName,
        path: !hideLogPositionForPerformance ? environment.getCallerStackFrame(stackDepthLevel) : void 0
      });
    },
    getCallerStackFrame(stackDepthLevel, error = new Error()) {
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
        return [header, ...frames].join("\n");
      });
      const placeholderValuesError = {
        errorName: ` ${error.name} `,
        errorMessage: formatErrorMessage(error),
        errorStack: [...stackLines, ...causeSections].join("\n")
      };
      return formatTemplate(settings, settings.prettyErrorTemplate, placeholderValuesError);
    },
    transportFormatted(logMetaMarkup, logArgs, logErrors, logMeta, settings) {
      const prettyLogs = settings.stylePrettyLogs !== false;
      const logErrorsStr = (logErrors.length > 0 && logArgs.length > 0 ? "\n" : "") + logErrors.join("\n");
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
      cachedCwd = void 0;
    };
  }
  return environment;
  function parseStackLine(line) {
    return usesBrowserStack ? parseBrowserStackLine(line) : parseServerStackLine(line);
  }
  __name(parseStackLine, "parseStackLine");
  function parseServerStackLine(rawLine) {
    if (typeof rawLine !== "string" || rawLine.length === 0) {
      return void 0;
    }
    const trimmedLine = rawLine.trim();
    if (!trimmedLine.includes(" at ") && !trimmedLine.startsWith("at ")) {
      return void 0;
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
    const fileNameWithLine = fileName && fileLine ? `${fileName}:${fileLine}` : void 0;
    const filePathWithLine = effectivePath && fileLine ? `${effectivePath}:${fileLine}` : void 0;
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
  __name(parseServerStackLine, "parseServerStackLine");
  function parseBrowserStackLine(line) {
    const href = globalThis.location?.origin;
    if (line == null) {
      return void 0;
    }
    const match2 = line.match(BROWSER_PATH_REGEX);
    if (!match2) {
      return void 0;
    }
    const filePath = match2[1]?.replace(/\?.*$/, "");
    if (filePath == null) {
      return void 0;
    }
    const pathParts = filePath.split("/");
    const fileLine = match2[2];
    const fileColumn = match2[3];
    const fileName = pathParts[pathParts.length - 1];
    return {
      fullFilePath: href ? `${href}${filePath}` : filePath,
      fileName,
      fileNameWithLine: fileName && fileLine ? `${fileName}:${fileLine}` : void 0,
      fileColumn,
      fileLine,
      filePath,
      filePathWithLine: fileLine ? `${filePath}:${fileLine}` : void 0,
      method: void 0
    };
  }
  __name(parseBrowserStackLine, "parseBrowserStackLine");
  function formatStackFrames(frames, settings) {
    return frames.map((stackFrame) => formatTemplate(settings, settings.prettyErrorStackTemplate, { ...stackFrame }, true));
  }
  __name(formatStackFrames, "formatStackFrames");
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
  __name(formatErrorMessage, "formatErrorMessage");
  function shouldUseCss(prettyLogs) {
    return prettyLogs && (runtimeInfo.name === "browser" || runtimeInfo.name === "worker") && consoleSupportsCssStyling();
  }
  __name(shouldUseCss, "shouldUseCss");
  function stripAnsi(value) {
    return value.replace(ANSI_REGEX, "");
  }
  __name(stripAnsi, "stripAnsi");
  function buildCssMetaOutput(settings, metaValue) {
    if (metaValue == null) {
      return { text: "", styles: [] };
    }
    const { template, placeholders } = buildPrettyMeta(settings, metaValue);
    const parts = [];
    const styles = [];
    let lastIndex = 0;
    const placeholderRegex = /{{(.+?)}}/g;
    let match2;
    while ((match2 = placeholderRegex.exec(template)) != null) {
      if (match2.index > lastIndex) {
        parts.push(template.slice(lastIndex, match2.index));
      }
      const key = match2[1];
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
  __name(buildCssMetaOutput, "buildCssMetaOutput");
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
  __name(collectStyleTokens, "collectStyleTokens");
  function tokensToCss(tokens) {
    const seen = /* @__PURE__ */ new Set();
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
  __name(tokensToCss, "tokensToCss");
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
        return void 0;
    }
  }
  __name(styleTokenToCss, "styleTokenToCss");
  function getWorkingDirectory() {
    if (cachedCwd === void 0) {
      cachedCwd = safeGetCwd() ?? null;
    }
    return cachedCwd ?? void 0;
  }
  __name(getWorkingDirectory, "getWorkingDirectory");
  function shouldCaptureHostname() {
    return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
  }
  __name(shouldCaptureHostname, "shouldCaptureHostname");
  function shouldCaptureRuntimeVersion() {
    return runtimeInfo.name === "node" || runtimeInfo.name === "deno" || runtimeInfo.name === "bun";
  }
  __name(shouldCaptureRuntimeVersion, "shouldCaptureRuntimeVersion");
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
  __name(createRuntimeMeta, "createRuntimeMeta");
  function formatWithOptionsSafe(options, args) {
    try {
      return formatWithOptions(options, ...args);
    } catch {
      return args.map(stringifyFallback).join(" ");
    }
  }
  __name(formatWithOptionsSafe, "formatWithOptionsSafe");
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
  __name(stringifyFallback, "stringifyFallback");
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
  __name(normalizeFilePath, "normalizeFilePath");
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
        version: bunVersion != null ? `bun/${bunVersion}` : void 0,
        hostname: getEnvironmentHostname(globalAny.process, globalAny.Deno, globalAny.Bun, globalAny.location)
      };
    }
    if (globalAny.Deno != null) {
      const denoHostname = resolveDenoHostname(globalAny.Deno);
      const denoVersion = globalAny.Deno?.version?.deno;
      return {
        name: "deno",
        version: denoVersion != null ? `deno/${denoVersion}` : void 0,
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
  __name(detectRuntimeInfo, "detectRuntimeInfo");
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
    } catch {
    }
    if (location?.hostname != null && location.hostname.length > 0) {
      return location.hostname;
    }
    return void 0;
  }
  __name(getEnvironmentHostname, "getEnvironmentHostname");
  function resolveDenoHostname(deno) {
    try {
      if (typeof deno?.hostname === "function") {
        const value = deno.hostname();
        if (value != null && value.length > 0) {
          return value;
        }
      }
    } catch {
    }
    const locationHostname = globalThis.location?.hostname;
    if (locationHostname != null && locationHostname.length > 0) {
      return locationHostname;
    }
    return void 0;
  }
  __name(resolveDenoHostname, "resolveDenoHostname");
  function getNodeEnv() {
    const globalProcess = globalThis?.process;
    return globalProcess?.env?.NODE_ENV;
  }
  __name(getNodeEnv, "getNodeEnv");
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
  __name(isNativeError, "isNativeError");
}
__name(createLoggerEnvironment, "createLoggerEnvironment");
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
var BaseLogger = class {
  static {
    __name(this, "BaseLogger");
  }
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
      prettyLogTemplate: settings?.prettyLogTemplate ?? "{{yyyy}}.{{mm}}.{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}	{{logLevelName}}	{{filePathWithLine}}{{nameWithDelimiterPrefix}}	",
      prettyErrorTemplate: settings?.prettyErrorTemplate ?? "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}",
      prettyErrorStackTemplate: settings?.prettyErrorStackTemplate ?? "  \u2022 {{fileName}}	{{method}}\n	{{filePathWithLine}}",
      prettyErrorParentNamesSeparator: settings?.prettyErrorParentNamesSeparator ?? ":",
      prettyErrorLoggerNameDelimiter: settings?.prettyErrorLoggerNameDelimiter ?? "	",
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
    const thisLogObj = this.logObj != null ? this._recursiveCloneAndExecuteFunctions(this.logObj) : void 0;
    const logObj = this.settings.overwrite?.toLogObj != null ? this.settings.overwrite?.toLogObj(maskedArgs, thisLogObj) : this._toLogObj(maskedArgs, thisLogObj);
    const logObjWithMeta = this.settings.overwrite?.addMeta != null ? this.settings.overwrite?.addMeta(logObj, logLevelId, logLevelName) : this._addMetaToLogObj(logObj, logLevelId, logLevelName);
    const logMeta = logObjWithMeta?.[this.settings.metaProperty];
    let logMetaMarkup;
    let logArgsAndErrorsMarkup = void 0;
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
      parentNames: this.settings?.parentNames != null && this.settings?.name != null ? [...this.settings.parentNames, this.settings.name] : this.settings?.name != null ? [this.settings.name] : void 0,
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
    const cloned = new error.constructor();
    Object.getOwnPropertyNames(error).forEach((key) => {
      cloned[key] = error[key];
    });
    return cloned;
  }
  _toErrorObject(error, depth = 0, seen = /* @__PURE__ */ new Set()) {
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
};

// ../../node_modules/.bun/tslog@4.10.2/node_modules/tslog/esm/index.js
var Logger = class extends BaseLogger {
  static {
    __name(this, "Logger");
  }
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
};

// ../core/src/utils/logger.ts
var logger_NiceError = new Logger({
  name: "NiceErrorLogger"
});
var logger_NiceError_testing = logger_NiceError.getSubLogger({
  name: "NiceErrorTestingLogger"
});

// ../core/src/utils/inspectPotentialError/inspectPotentialError.ts
function interpretMessagePackedError(parsedError) {
  let packedErrorStr;
  if (typeof parsedError.message === "string" && parsedError.message.includes(DUR_OBJ_PACK_PREFIX) && parsedError.message.includes(DUR_OBJ_PACK_SUFFIX)) {
    packedErrorStr = parsedError.message;
  }
  if (typeof parsedError.cause === "string" && parsedError.cause.includes(DUR_OBJ_PACK_PREFIX) && parsedError.cause.includes(DUR_OBJ_PACK_SUFFIX)) {
    packedErrorStr = parsedError.cause;
  }
  if (packedErrorStr != null) {
    const jsonStr = packedErrorStr.split(DUR_OBJ_PACK_PREFIX)[1].split(DUR_OBJ_PACK_SUFFIX)[0];
    try {
      const errorObj = JSON.parse(jsonStr);
      if (isNiceErrorObject(errorObj)) {
        return {
          type: "niceErrorObject" /* niceErrorObject */,
          niceErrorObject: errorObj
        };
      }
    } catch {
    }
  }
  return null;
}
__name(interpretMessagePackedError, "interpretMessagePackedError");
var inspectPotentialError = /* @__PURE__ */ __name((potentialError) => {
  if (potentialError == null) {
    return {
      type: "nullish" /* nullish */,
      value: potentialError
    };
  }
  if (typeof potentialError === "number") {
    return {
      type: "jsDataType" /* jsDataType */,
      jsDataType: "number",
      jsDataValue: potentialError
    };
  }
  if (typeof potentialError === "boolean") {
    return {
      type: "jsDataType" /* jsDataType */,
      jsDataType: "boolean",
      jsDataValue: potentialError
    };
  }
  let parsedError = potentialError;
  if (typeof potentialError === "string") {
    if (potentialError.includes("{") && potentialError.includes("name")) {
      try {
        parsedError = JSON.parse(potentialError);
      } catch {
        return {
          type: "jsDataType" /* jsDataType */,
          jsDataType: "string",
          jsDataValue: potentialError
        };
      }
    } else {
      return {
        type: "jsDataType" /* jsDataType */,
        jsDataType: "string",
        jsDataValue: potentialError
      };
    }
  }
  if (typeof parsedError !== "object" || parsedError === null) {
    logger_NiceError.warn({
      message: "Received a potential error that is a primitive data type other than string, number, or boolean. This is unexpected and may indicate an issue with error handling in the code.",
      potentialError
    });
    return {
      jsDataValue: potentialError,
      type: "jsOther" /* jsOther */
    };
  }
  if (parsedError instanceof NiceError) {
    return {
      type: "niceError" /* niceError */,
      niceError: parsedError
    };
  }
  if (isNiceErrorObject(parsedError)) {
    return {
      type: "niceErrorObject" /* niceErrorObject */,
      niceErrorObject: parsedError
    };
  }
  if (parsedError instanceof Error) {
    const durObjResult = interpretMessagePackedError(parsedError);
    if (durObjResult != null) {
      return durObjResult;
    }
    return {
      type: "jsError" /* jsError */,
      jsError: parsedError
    };
  }
  if (isRegularErrorJsonObject(parsedError)) {
    const durObjResult = interpretMessagePackedError(parsedError);
    if (durObjResult != null) {
      return durObjResult;
    }
    return {
      type: "jsErrorObject" /* jsErrorObject */,
      jsErrorObject: parsedError
    };
  }
  return {
    type: "jsDataType" /* jsDataType */,
    jsDataType: "object",
    jsDataValue: parsedError
  };
}, "inspectPotentialError");

// ../core/src/utils/castNiceError.ts
var castNiceError = /* @__PURE__ */ __name((error) => {
  const inspected = inspectPotentialError(error);
  switch (inspected.type) {
    case "niceError" /* niceError */:
      return inspected.niceError;
    case "niceErrorObject" /* niceErrorObject */: {
      const obj = inspected.niceErrorObject;
      return new NiceError(obj);
    }
    case "jsError" /* jsError */: {
      return err_cast_not_nice.fromContext({
        ["native_error" /* js_error */]: inspected
      }).withOriginError(inspected.jsError);
    }
    case "jsErrorObject" /* jsErrorObject */: {
      const err2 = err_cast_not_nice.fromContext({
        ["js_error_like_object" /* js_error_like_object */]: inspected
      });
      err2.cause = inspected.jsErrorObject;
      return err2;
    }
    case "nullish" /* nullish */:
      return err_cast_not_nice.fromContext({
        ["nullish_value" /* nullish_value */]: inspected
      });
    case "jsDataType" /* jsDataType */: {
      return err_cast_not_nice.fromContext({
        ["js_data_type" /* js_data_type */]: inspected
      });
    }
    default:
      return err_cast_not_nice.fromContext({
        ["js_other" /* js_other */]: inspected
      });
  }
}, "castNiceError");

// src/errors/demo_err_nice.ts
var errorGlobalEnv = {
  packAs: "no_pack" /* no_pack */
};
var demo_err_nice = defineNiceError({
  domain: "err_nice_backend",
  packAs: /* @__PURE__ */ __name(() => {
    return errorGlobalEnv.packAs;
  }, "packAs"),
  schema: {
    ["simple_error_no_context" /* simple_error_no_context */]: err({
      message: "This is a simple error with no context",
      httpStatusCode: 400
    }),
    ["error_with_context" /* error_with_context */]: err({
      message: /* @__PURE__ */ __name(({ detail }) => `This error has context: ${detail}`, "message"),
      httpStatusCode: 400
    }),
    ["error_with_serializable_context" /* error_with_serializable_context */]: err({
      message: /* @__PURE__ */ __name(({ dateNow }) => `This error has serializable context: ${dateNow.toISOString()}`, "message"),
      httpStatusCode: 400,
      context: {
        required: true,
        serialization: {
          fromJsonSerializable: /* @__PURE__ */ __name(({ isoString }) => {
            return {
              dateNow: new Date(isoString)
            };
          }, "fromJsonSerializable"),
          toJsonSerializable: /* @__PURE__ */ __name(({ dateNow }) => {
            return {
              isoString: dateNow.toISOString()
            };
          }, "toJsonSerializable")
        }
      }
    })
  }
});

// src/cloudflare_worker/durable_object/DurObjExampleUser.ts
errorGlobalEnv.packAs = "msg_pack" /* msg_pack */;
var DurObjExampleUser = class extends DurableObject {
  static {
    __name(this, "DurObjExampleUser");
  }
  async throwErrorNoContext() {
    throw demo_err_nice.fromId("simple_error_no_context" /* simple_error_no_context */);
  }
  async throwErrorWithContext() {
    throw demo_err_nice.fromId("error_with_context" /* error_with_context */, {
      detail: "TEST_CONTEXT_DETAIL"
    });
  }
  async throwErrorWithSerializableContext() {
    throw demo_err_nice.fromId("error_with_serializable_context" /* error_with_serializable_context */, {
      dateNow: /* @__PURE__ */ new Date()
    }).pack();
  }
};

// src/cloudflare_worker/hono_api/hono_api.ts
import { env } from "cloudflare:workers";

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError2 = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err2) {
          if (err2 instanceof Error && onError) {
            context.error = err2;
            res = await onError(err2, context);
            isError2 = true;
          } else {
            throw err2;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError2)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err2, c) => {
  if ("getResponse" in err2) {
    const res = err2.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err2);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app) {
    const subApp = this.basePath(path);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err2, c) {
    if (err2 instanceof Error) {
      return this.errorHandler(err2, c);
    }
    throw err2;
  }
  #dispatch(request, executionCtx, env2, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env2, "GET")))();
    }
    const path = this.getPath(request, { env: env2 });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env: env2,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err2) {
        return this.#handleError(err2, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err2) => this.#handleError(err2, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err2) {
        return this.#handleError(err2, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// ../../node_modules/.bun/hono@4.12.9/node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/cloudflare_worker/hono_api/hono_api.ts
var honoApi = new Hono2();
honoApi.onError((err2, ctx) => {
  errorGlobalEnv.packAs = "msg_pack" /* msg_pack */;
  const ctxErr = ctx.error;
  console.log(JSON.stringify(ctxErr, null, 2));
  console.log(JSON.stringify(err2, null, 2));
  console.log(typeof ctxErr);
  console.log(typeof err2);
  console.log(ctxErr instanceof NiceErrorHydrated);
  console.log(ctxErr instanceof NiceError);
  console.log(err2 instanceof NiceError);
  console.log(err2 instanceof NiceErrorHydrated);
  const niceError = castNiceError(err2);
  console.log({ ...ctx.error });
  return ctx.json(
    niceError.toJsonObject(),
    niceError.httpStatusCode ?? 500
  );
});
honoApi.get("/throw_error/no_context", async (c) => {
  throw demo_err_nice.fromId("simple_error_no_context" /* simple_error_no_context */);
});
honoApi.get("/throw_error/with_context", async (c) => {
  throw demo_err_nice.fromId("error_with_context" /* error_with_context */, {
    detail: "TEST_CONTEXT_DETAIL"
  });
});
honoApi.get("/throw_error/with_serializable_context", async (c) => {
  throw demo_err_nice.fromId("error_with_serializable_context" /* error_with_serializable_context */, {
    dateNow: /* @__PURE__ */ new Date()
  });
});
honoApi.get("/dur_obj/no_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorNoContext();
});
honoApi.get("/dur_obj/with_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorWithContext();
});
honoApi.get("/dur_obj/with_serializable_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorWithSerializableContext();
});

// src/cloudflare_worker/index.ts
var cloudflare_worker_default = honoApi;

// ../../node_modules/.bun/wrangler@4.81.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/.bun/wrangler@4.81.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-dj3vdZ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = cloudflare_worker_default;

// ../../node_modules/.bun/wrangler@4.81.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-dj3vdZ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  DurObjExampleUser,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
