import { describe, it } from "vitest";
import { action } from "../NiceAction/ActionSchema/action";
import { createActionDomain } from "../NiceAction/createActionDomain";

describe("Nice Action Usage", () => {
  it("should create a NiceActionDomain", () => {
    const testActionDomain = createActionDomain({
      domain: "test_domain",
      schema: {
        test_action: action(),
      },
    });
  });
});
