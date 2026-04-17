import type { INiceErrorOptions } from "../../NiceError/NiceError";
import type { INiceErrorDefinedProps } from "../../NiceError/NiceError.types";

export const nice_error_test_options: INiceErrorOptions<
  INiceErrorDefinedProps,
  keyof INiceErrorDefinedProps["schema"]
> = {
  def: {
    domain: "TEST_DOMAIN",
    allDomains: ["TEST_DOMAIN"],
  },
  message: "Test error",
  errorData: {},
  ids: [],
  wasntNice: false,
};
