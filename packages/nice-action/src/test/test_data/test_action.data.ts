import { createActionRootDomain } from "../../ActionDomain/RootDomain/createActionRootDomain";
import { action } from "../../ActionSchema/action";

const createTestActionDomain = () => {
  const test_act_domain = createActionRootDomain({
    domain: "test_domain",
    actions: {},
  });

  return test_act_domain;
};

export enum ETestActId_UserComment {
  new_comment = "new_comment",
  delete_comment = "delete_comment",
  edit_comment = "edit_comment",
}

export const createTestDomains = () => {
  const test_act_domain = createTestActionDomain();

  const test_act_domain_user_comment = test_act_domain.createChildDomain({
    domain: "user_comment",
    actions: {
      [ETestActId_UserComment.new_comment]: action(),
    },
  });

  return { test_act_domain, test_act_domain_user_comment };
};
