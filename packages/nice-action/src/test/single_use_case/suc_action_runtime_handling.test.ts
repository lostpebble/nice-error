import { expect, it } from "vitest";
import { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { createTestDomains } from "../test_data/test_action.data";

it("SUC - Action Runtime Handling", () => {
  const { test_act_domain, test_act_domain_user_comment } = createTestDomains();

  expect(test_act_domain.domain).toBe("test_domain");
  expect(test_act_domain_user_comment.domain).toBe("user_comment");

  const actionRuntimeEnvironment = new ActionRuntimeEnvironment({
    envId: "test_env",
  });

  test_act_domain.setRuntimeEnvironment(actionRuntimeEnvironment);
});
