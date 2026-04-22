import { expect, it, vi } from "vitest";
import { handle } from "../../ActionRuntimeEnvironment/ActionHandler/handle";
import { ActionRuntimeEnvironment } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { createTestDomains, ETestActId_UserComment } from "../test_data/test_action.data";

it("SUC - Action Runtime Handling", async () => {
  const { test_domain_root, test_act_domain_user_comment } = createTestDomains();

  expect(test_domain_root.domain).toBe("test_domain_root");
  expect(test_act_domain_user_comment.domain).toBe("user_comment");

  const mockHandlerFn = vi.fn().mockResolvedValue("handler_result");

  const handler = handle().forAction(
    test_act_domain_user_comment,
    ETestActId_UserComment.new_comment,
    mockHandlerFn,
  );

  const actionRuntimeEnvironment = new ActionRuntimeEnvironment({
    envId: "test_env",
  }).addHandler(handler);

  test_domain_root.setRuntimeEnvironment(actionRuntimeEnvironment);

  const response = await test_act_domain_user_comment
    .action(ETestActId_UserComment.new_comment)
    .prime({ text: "Hello world!" })
    .executeSafe("test_env");

  expect(response.ok).toBe(true);

  if (!response.ok) {
    throw new Error("Expected action execution to succeed");
  }

  expect(mockHandlerFn).toHaveBeenCalledWith({ text: "Hello world!" });
});
