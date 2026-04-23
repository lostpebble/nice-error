import { expect, it, vi } from "vitest";
import { createHandler } from "../../ActionRuntimeEnvironment/ActionHandler/ActionHandler";
import { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { createTestDomains, ETestActId_UserComment } from "../test_data/test_action.data";

it("SUC - Action Runtime Handling", async () => {
  const { test_domain_root, test_act_domain_user_comment } = createTestDomains();

  expect(test_domain_root.domain).toBe("test_domain_root");
  expect(test_act_domain_user_comment.domain).toBe("user_comment");

  const mockHandlerFn = vi.fn();

  const handler = createHandler().forAction(
    test_act_domain_user_comment,
    ETestActId_UserComment.new_comment,
    {
      execution: (primed) => {
        mockHandlerFn(primed.input);
      },
    },
  );

  const actionRuntimeEnvironment = new ActionRuntimeEnvironment({
    envId: "test_env",
  }).addHandlers([handler]);

  test_domain_root.setRuntimeEnvironment(actionRuntimeEnvironment);

  const response = await test_act_domain_user_comment
    .action(ETestActId_UserComment.new_comment)
    .prime({ text: "Hello world!" })
    .executeSafe();

  expect(response.ok).toBe(true);

  if (!response.ok) {
    throw new Error("Expected action execution to succeed");
  }

  expect(mockHandlerFn).toHaveBeenCalledWith({ text: "Hello world!" });
});
