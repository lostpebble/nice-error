import { env } from "cloudflare:workers";
import { niceCatchSValidation, niceSValidator } from "@nice-code/common-errors/hono";
import { castNiceError, EErrorPackType } from "@nice-code/error";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { demo_err_nice, EErrId_DemoNiceBackend, errorGlobalEnv } from "../../errors/demo_err_nice";
import { getDemoBackendHandler } from "../../nice_actions/demo_resolver";
import { vTestValidationObject } from "../validation/test_valibot_validation.schema";

const honoApi = new Hono();

honoApi.onError((err, ctx) => {
  errorGlobalEnv.packAs = EErrorPackType.msg_pack;
  const niceError = castNiceError(err);

  return ctx.json(
    niceError.toJsonObject(),
    (niceError.httpStatusCode as ContentfulStatusCode) ?? 500,
  );
});

honoApi.use(niceCatchSValidation());

honoApi.get("/throw_error/no_context", async (c) => {
  throw demo_err_nice.fromId(EErrId_DemoNiceBackend.simple_error_no_context);
});

honoApi.get("/throw_error/with_context", async (c) => {
  throw demo_err_nice.fromId(EErrId_DemoNiceBackend.error_with_context, {
    detail: "TEST_CONTEXT_DETAIL",
  });
});

honoApi.get("/throw_error/with_serializable_context", async (c) => {
  throw demo_err_nice.fromId(EErrId_DemoNiceBackend.error_with_serializable_context, {
    dateNow: new Date(),
  });
});

honoApi.post(
  "/throw_validation/valibot",
  niceSValidator("json", vTestValidationObject),
  async (c) => {
    const validatedData = c.req.valid("json");
    return c.json({ message: "Validation succeeded", data: validatedData });
  },
);

honoApi.on(["POST", "OPTIONS"], "/resolve_action", cors(), async (c) => {
  const wire = await c.req.json();
  const result = await getDemoBackendHandler().handleWire(wire);
  if (!result.handled) return c.json({ error: "Action not handled" }, 404);
  return c.json(result.response.toJsonObject());
});

honoApi.get("/dur_obj/no_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorNoContext();
});

honoApi.get("/dur_obj/with_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorWithContext();
});

honoApi.get("/dur_obj/with_serializable_context", async (c) => {
  const id = env.DO_EXAMPLE_USER.idFromName("example");
  const stub = env.DO_EXAMPLE_USER.get(id);
  await stub.throwErrorWithSerializableContext();
});

export { honoApi };
