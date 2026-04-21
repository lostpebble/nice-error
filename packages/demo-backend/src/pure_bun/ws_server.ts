/**
 * Bun WebSocket server demonstrating ActionConnect integration.
 *
 * Run with: bun run src/pure_bun/ws_server.ts
 *
 * Serves the same demo actions as the Cloudflare Worker but over WebSocket.
 * Each incoming connection gets a per-connection reply transport so responses
 * are routed back to the correct client.
 */
import type { IActionConnectTransport } from "@nice-code/connect";
import { ActionConnect, EActionConnectRole } from "@nice-code/connect";
import { registerDemoResolvers } from "../nice_actions/demo_resolver";

const PORT = 4567;

// One server-side ActionConnect instance shared across connections.
// Each call to onMessage supplies a per-connection replyTransport.
const serverConnect = registerDemoResolvers(new ActionConnect({ role: EActionConnectRole.server }));

const server = Bun.serve({
  port: PORT,

  fetch(req, srv) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      const upgraded = srv.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Nice Connect demo WS server", wsPath: "/ws" }),
      { headers: { "Content-Type": "application/json" } },
    );
  },

  websocket: {
    open(ws) {
      console.log("[ws] client connected");
    },

    message(ws, raw) {
      const text = typeof raw === "string" ? raw : Buffer.from(raw).toString("utf8");

      const replyTransport: IActionConnectTransport = {
        send: (data) => {
          ws.send(data);
        },
        get connected() {
          return ws.readyState === 1;
        },
      };

      void serverConnect.onMessage(text, { replyTransport });
    },

    close(ws, code, reason) {
      console.log(`[ws] client disconnected (${code} ${reason})`);
    },
  },
});

console.log(`\n  Nice Connect WS demo running`);
console.log(`    HTTP  http://localhost:${PORT}/`);
console.log(`    WS    ws://localhost:${PORT}/ws\n`);
