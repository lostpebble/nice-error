import * as v from "valibot";
import { describe, it, vi } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";

describe("Nice Action Usage", () => {
  it("should create a NiceActionDomain", async () => {
    const mockRequest = vi.fn();

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

    testActionDomain.setActionHandler().forDomain(testActionDomain, (action) => {
      if (testActionDomain.matchAction(action, "test_action")) {
        const { timeStart } = action.input;
        mockRequest(`Action received with timeStart: ${timeStart.toISOString()}`);
        return undefined;
      }
    });

    const testAction = testActionDomain.action("test_action");

    await testAction.execute({ timeStart: new Date("2024-01-01T00:00:00Z") });
  });
});
