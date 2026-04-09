import { DurableObject } from "cloudflare:workers";
import { demo_err_nice, EErrId_DemoNiceBackend } from "../../errors/demo_err_nice";

export class DurObjExampleUser extends DurableObject {
  async throwErrorNoContext() {
    throw demo_err_nice.fromId(EErrId_DemoNiceBackend.simple_error_no_context).msgPack();
  }

  async throwErrorWithContext() {
    throw demo_err_nice
      .fromId(EErrId_DemoNiceBackend.error_with_context, {
        detail: "TEST_CONTEXT_DETAIL",
      })
      .msgPack();
  }

  async throwErrorWithSerializableContext() {
    throw demo_err_nice
      .fromId(EErrId_DemoNiceBackend.error_with_serializable_context, {
        dateNow: new Date(),
      })
      .msgPack();
  }
}
