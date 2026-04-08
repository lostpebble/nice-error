import {
  defineNiceError,
  castNiceError,
  NiceError,
  isNiceErrorObject,
} from "@nice-error/core";

// ---------------------------------------------------------------------------
// 1. Define error domains
// ---------------------------------------------------------------------------

const err_app = defineNiceError({
  domain: "err_app",
  schema: {
    internal: { message: "Internal server error", httpStatusCode: 500 },
  },
} as const);

enum EAuth {
  invalid_credentials = "invalid_credentials",
  token_expired = "token_expired",
}

const err_auth = err_app.createChildDomain({
  domain: "err_auth",
  schema: {
    [EAuth.invalid_credentials]: {
      message: (ctx: { username: string }) =>
        `Invalid credentials for user "${ctx.username}"`,
      httpStatusCode: 401,
      context: { required: true, type: {} as { username: string } },
    },
    [EAuth.token_expired]: {
      message: "Authentication token has expired",
      httpStatusCode: 401,
    },
  },
} as const);

// ---------------------------------------------------------------------------
// 2. Simple Bun HTTP server that exercises the full API
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: 3456,
  async fetch(req) {
    const url = new URL(req.url);

    // --- Health check -------------------------------------------------------
    if (url.pathname === "/") {
      return Response.json({ ok: true, message: "nice-error demo is running" });
    }

    // --- Login route (demonstrates fromId + context) ------------------------
    if (url.pathname === "/login") {
      const username = url.searchParams.get("user") ?? "anonymous";
      const password = url.searchParams.get("pass");

      if (password !== "secret") {
        const err = err_auth.fromId(EAuth.invalid_credentials, { username });
        return Response.json(err.toJsonObject(), {
          status: err.httpStatusCode,
        });
      }
      return Response.json({ ok: true, user: username });
    }

    // --- Expire route (demonstrates addId chaining) -------------------------
    if (url.pathname === "/expire") {
      const err = err_auth
        .fromId(EAuth.token_expired)
        .addId(EAuth.invalid_credentials, { username: "stale-session" });

      return Response.json(
        {
          error: err.toJsonObject(),
          ids: err.getIds(),
          hasMultiple: err.hasMultiple,
        },
        { status: err.httpStatusCode },
      );
    }

    // --- Cast route (demonstrates castNiceError + is() + isParentOf()) ------
    if (url.pathname === "/cast") {
      const errors: unknown[] = [
        new Error("plain JS error"),
        null,
        "string thrown as error",
        42,
        err_auth.fromId(EAuth.token_expired),
        err_auth
          .fromId(EAuth.invalid_credentials, { username: "bob" })
          .toJsonObject(),
      ];

      const results = errors.map((raw) => {
        const casted = castNiceError(raw);
        return {
          input: String(raw),
          message: casted.message,
          httpStatusCode: casted.httpStatusCode,
          isAuthDomain: err_auth.is(casted),
          isAppParent: err_app.isParentOf(casted),
          isNiceErrorObj: isNiceErrorObject(
            typeof raw === "object" && raw !== null ? raw : {},
          ),
        };
      });

      return Response.json(results);
    }

    // --- hasId narrowing route -----------------------------------------------
    if (url.pathname === "/narrow") {
      const err = err_auth.fromId(EAuth.invalid_credentials, {
        username: "carol",
      });

      const result: Record<string, unknown> = {
        id: err.id,
        hasInvalidCreds: err.hasId(EAuth.invalid_credentials),
        hasTokenExpired: err.hasId(EAuth.token_expired),
      };

      if (err.hasId(EAuth.invalid_credentials)) {
        result.context = err.getContext(EAuth.invalid_credentials);
      }

      return Response.json(result);
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
});

console.log(`\n  nice-error demo-backend running at http://localhost:${server.port}\n`);
console.log("  Routes:");
console.log("    GET /            — health check");
console.log("    GET /login       — ?user=alice&pass=secret (401 on bad pass)");
console.log("    GET /expire      — addId chaining demo");
console.log("    GET /cast        — castNiceError + is() + isParentOf()");
console.log("    GET /narrow      — hasId type narrowing + getContext");
console.log("");
