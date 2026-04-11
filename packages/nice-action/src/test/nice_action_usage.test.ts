import * as v from "valibot";
import { describe, it } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";

describe("Nice Action Usage", () => {
  it("should create a NiceActionDomain", () => {
    const testActionDomain = createActionDomain({
      domain: "test_domain",
      schema: {
        test_action: action().input({
          schema: v.object({
            timeStart: v.date(),
          }),
          serialization: {
            serialize: ({ timeStart }) => {
              return { iso: timeStart.toISOString() };
            },
            deserialize: (ser) => {
              return { timeStart: new Date(ser.iso) };
            },
          },
        }),
      },
    });

    const testAction = testActionDomain.newAction("test_action", {
      timeStart: new Date("2024-01-01T00:00:00Z"),
    });
  });
});
