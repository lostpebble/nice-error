import { Logger } from "tslog";

export const logger_NiceError = new Logger({
  name: "NiceErrorLogger",
});

export const logger_NiceError_testing = logger_NiceError.getSubLogger({
  name: "NiceErrorTestingLogger",
});
