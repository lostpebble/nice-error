import * as v from "valibot";
import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
import { createActionRuntime } from "../../ActionRuntimeEnvironment/ActionRuntimeEnvironment";
import { action } from "../../ActionSchema/action";

const createTestRootDomain = () => {
  const test_domain_root = createActionRootDomain({
    domain: "test_domain_root",
  });

  return test_domain_root;
};

export enum ETestActId_UserComment {
  new_comment = "new_comment",
  delete_comment = "delete_comment",
  edit_comment = "edit_comment",
}

export const test_createActionTestData = () => {
  const test_domain_root = createTestRootDomain();

  const test_act_domain_user_comment = test_domain_root.createChildDomain({
    domain: "user_comment",
    actions: {
      [ETestActId_UserComment.new_comment]: action().input({
        schema: v.object({
          text: v.string(),
        }),
      }),
      [ETestActId_UserComment.delete_comment]: action().input({
        schema: v.object({
          commentId: v.string(),
        }),
      }),
      [ETestActId_UserComment.edit_comment]: action().input({
        schema: v.object({
          commentId: v.string(),
          newText: v.string(),
        }),
      }),
    },
  });

  const test_runtime = createActionRuntime({
    envId: "test_env",
  });

  test_domain_root.setRuntimeEnvironment(test_runtime);

  return { test_domain_root, test_act_domain_user_comment, test_runtime };
};
