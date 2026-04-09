import { env } from "cloudflare:workers";
import { castNiceError, NiceError, NiceErrorHydrated } from "@nice-error/core";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { demo_err_nice, EErrId_DemoNiceBackend } from "../../errors/demo_err_nice";

const honoApi = new Hono();

honoApi.onError((err, ctx) => {
  const ctxErr = ctx.error;
  console.log(JSON.stringify(ctxErr, null, 2));
  console.log(JSON.stringify(err, null, 2));
  console.log(typeof ctxErr);
  console.log(typeof err);
  console.log(ctxErr instanceof NiceErrorHydrated);
  console.log(ctxErr instanceof NiceError);
  console.log(err instanceof NiceError);
  console.log(err instanceof NiceErrorHydrated);
  const niceError = castNiceError(err);
  console.log({ ...ctx.error });

  return ctx.json(
    niceError.toJsonObject(),
    (niceError.httpStatusCode as ContentfulStatusCode) ?? 500,
  );
});

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
