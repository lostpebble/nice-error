// src/NiceError/NiceError.ts
var UNKNOWN_DEF = {
  domain: "unknown",
  allDomains: ["unknown"],
  schema: {}
};

class NiceError extends Error {
  name = "NiceError";
  def;
  id;
  wasntNice;
  httpStatusCode;
  originError;
  _contexts;
  constructor(messageOrOptions) {
    if (messageOrOptions === undefined || typeof messageOrOptions === "string") {
      super(messageOrOptions ?? "NiceError");
      this.def = UNKNOWN_DEF;
      this.id = "unknown";
      this._contexts = {};
      this.wasntNice = false;
      this.httpStatusCode = 500;
    } else {
      const opts = messageOrOptions;
      super(opts.message);
      this.def = opts.def;
      this.id = opts.id;
      this._contexts = opts.contexts;
      this.wasntNice = opts.wasntNice ?? false;
      this.httpStatusCode = opts.httpStatusCode ?? 500;
      this.originError = opts.originError;
    }
  }
  hasId(id) {
    return id in this._contexts;
  }
  hasOneOfIds(ids) {
    return ids.some((id) => (id in this._contexts));
  }
  get hasMultiple() {
    return Object.keys(this._contexts).length > 1;
  }
  getIds() {
    return Object.keys(this._contexts);
  }
  getContext(id) {
    return this._contexts[id];
  }
  addContext(context) {
    const mergedContexts = { ...this._contexts, ...context };
    return new NiceError({
      def: this.def,
      id: this.id,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError
    });
  }
  addId(...args) {
    const [id, context] = args;
    const mergedContexts = { ...this._contexts, [id]: context };
    return new NiceError({
      def: this.def,
      id: this.id,
      contexts: mergedContexts,
      message: this.message,
      wasntNice: this.wasntNice,
      httpStatusCode: this.httpStatusCode,
      originError: this.originError
    });
  }
  toJsonObject() {
    const originError = this.originError ? {
      name: this.originError.name,
      message: this.originError.message,
      stack: this.originError.stack,
      cause: this.originError.cause
    } : undefined;
    return {
      name: "NiceError",
      def: this.def,
      wasntNice: this.wasntNice,
      message: this.message,
      httpStatusCode: this.httpStatusCode,
      originError
    };
  }
}
// src/NiceErrorDefined/NiceErrorDefined.ts
class NiceErrorDefined {
  domain;
  allDomains;
  _schema;
  constructor(definition) {
    this.domain = definition.domain;
    this.allDomains = definition.allDomains;
    this._schema = definition.schema;
  }
  createChildDomain(subErrorDef) {
    return new NiceErrorDefined({
      domain: subErrorDef.domain,
      allDomains: [subErrorDef.domain, ...this.allDomains],
      schema: subErrorDef.schema
    });
  }
  fromId(...args) {
    const [id, context] = args;
    const entry = this._schema[id];
    const message = this._resolveMessage(entry, context);
    const httpStatusCode = this._resolveHttpStatusCode(entry);
    const contexts = { [id]: context };
    return new NiceError({
      def: this._buildDef(),
      id,
      contexts,
      message,
      httpStatusCode
    });
  }
  fromContext(context) {
    const ids = Object.keys(context);
    if (ids.length === 0) {
      throw new Error("[NiceErrorDefined.fromContext] context object must contain at least one error id.");
    }
    const primaryId = ids[0];
    const primaryEntry = this._schema[primaryId];
    const primaryContext = context[primaryId];
    const message = this._resolveMessage(primaryEntry, primaryContext);
    const httpStatusCode = this._resolveHttpStatusCode(primaryEntry);
    return new NiceError({
      def: this._buildDef(),
      id: primaryId,
      contexts: context,
      message,
      httpStatusCode
    });
  }
  is(error) {
    if (!(error instanceof NiceError))
      return false;
    const errDef = error.def;
    return errDef.domain === this.domain;
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
  _resolveMessage(entry, context) {
    if (typeof entry?.message === "function") {
      return entry.message(context);
    }
    if (typeof entry?.message === "string") {
      return entry.message;
    }
    return "NiceError";
  }
  _resolveHttpStatusCode(entry) {
    return typeof entry?.httpStatusCode === "number" ? entry.httpStatusCode : 500;
  }
}

// src/NiceErrorDefined/defineNiceError.ts
var defineNiceError = (definition) => {
  return new NiceErrorDefined({
    domain: definition.domain,
    allDomains: [definition.domain],
    schema: definition.schema
  });
};
// src/utils/isNiceErrorObject.ts
function isNiceErrorObject(obj) {
  if (typeof obj !== "object" || obj == null)
    return false;
  const o = obj;
  if (o.name !== "NiceError" || typeof o.message !== "string" || typeof o.wasntNice !== "boolean" || typeof o.httpStatusCode !== "number") {
    return false;
  }
  const def = o.def;
  if (typeof def !== "object" || def == null)
    return false;
  const d = def;
  return typeof d.domain === "string" && Array.isArray(d.allDomains);
}

// src/utils/isRegularErrorObject.ts
function isRegularErrorJsonObject(obj) {
  if (typeof obj !== "object" || obj == null)
    return false;
  const o = obj;
  return typeof o.name === "string" && typeof o.message === "string";
}

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

// src/utils/logger.ts
var logger_NiceError = new Logger({
  name: "NiceErrorLogger"
});
var logger_NiceError_testing = logger_NiceError.getSubLogger({
  name: "NiceErrorTestingLogger"
});

// src/utils/inspectPotentialError.ts
var inspectPotentialError = (potentialError) => {
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
    return {
      type: "jsError" /* jsError */,
      jsError: parsedError
    };
  }
  if (isRegularErrorJsonObject(parsedError)) {
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
};

// src/utils/castNiceError.ts
var castNiceError = (error) => {
  const inspected = inspectPotentialError(error);
  switch (inspected.type) {
    case "niceError" /* niceError */:
      return inspected.niceError;
    case "niceErrorObject" /* niceErrorObject */: {
      const obj = inspected.niceErrorObject;
      return new NiceError(obj.message);
    }
    case "jsError" /* jsError */: {
      const err = new NiceError(inspected.jsError.message);
      err.cause = inspected.jsError;
      return err;
    }
    case "jsErrorObject" /* jsErrorObject */: {
      const err = new NiceError(inspected.jsErrorObject.message);
      err.cause = inspected.jsErrorObject;
      return err;
    }
    case "nullish" /* nullish */:
      return new NiceError("Unknown error: null or undefined");
    case "jsDataType" /* jsDataType */: {
      const value = inspected.jsDataValue;
      const message = typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
      return new NiceError(message);
    }
    default:
      return new NiceError("Unknown error");
  }
};
export {
  isRegularErrorJsonObject,
  isNiceErrorObject,
  defineNiceError,
  castNiceError,
  NiceErrorDefined,
  NiceError
};
