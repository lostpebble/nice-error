import { DurableObject } from "cloudflare:workers";
import { EErrorPackType } from "@nice-error/core";
import { demo_err_nice, EErrId_DemoNiceBackend, errorGlobalEnv } from "../../errors/demo_err_nice";

errorGlobalEnv.packAs = EErrorPackType.msg_pack;

export class DurObjExampleUser extends DurableObject {
  async throwErrorNoContext() {
    throw demo_err_nice.fromId(EErrId_DemoNiceBackend.simple_error_no_context);
  }

  async throwErrorWithContext() {
    throw demo_err_nice.fromId(EErrId_DemoNiceBackend.error_with_context, {
      detail: "TEST_CONTEXT_DETAIL",
    });
  }

  async throwErrorWithSerializableContext() {
    throw demo_err_nice
      .fromId(EErrId_DemoNiceBackend.error_with_serializable_context, {
        dateNow: new Date(),
      })
      .pack();
  }
}
