import type { JSONSerializableValue } from "@nice-code/error";
import * as v from "valibot";
import { createActionRootDomain } from "../ActionDomain/helpers/createRootActionDomain";
import { action } from "../ActionSchema/action";

export const demo_domain = createActionRootDomain({
  domain: "demo_domain",
  actions: {
    action1: action().input({
      schema: v.object({
        a: v.string(),
        cust: v.custom<JSONSerializableValue>(() => true),
      }),
    }),
  },
});
