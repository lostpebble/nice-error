import { createActionRootDomain } from "../../ActionDomain/helpers/createRootActionDomain";
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

export const createTestDomains = () => {
  const test_domain_root = createTestRootDomain();

  const test_act_domain_user_comment = test_domain_root.createChildDomain({
    domain: "user_comment",
    actions: {
      [ETestActId_UserComment.new_comment]: action(),
    },
  });

  return { test_domain_root, test_act_domain_user_comment };
};
