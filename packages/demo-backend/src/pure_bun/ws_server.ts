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
import { getDemoBackendHandler, registerDemoActionHandler } from "../nice_actions/demo_resolver";

const PORT = 4567;

// One server-side ActionConnect instance shared across connections.
// Each call to onMessage supplies a per-connection replyTransport.
const serverConnect = registerDemoActionHandler(
  new ActionConnect({ role: EActionConnectRole.server }),
);

Bun.serve({
  port: PORT,

  async fetch(req, srv) {
    const url = new URL(req.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (url.pathname === "/resolve_action") {
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (req.method === "POST") {
        const wire = await req.json();
        const result = await getDemoBackendHandler().handleWire(wire);
        if (!result.handled) return new Response(null, { status: 404 });
        return new Response(result.response.toJsonString(), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

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
    open(_ws) {
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

    close(_ws, code, reason) {
      console.log(`[ws] client disconnected (${code} ${reason})`);
    },
  },
});

console.log(`\n  Nice Connect WS demo running`);
console.log(`    HTTP   http://localhost:${PORT}/`);
console.log(`    WS     ws://localhost:${PORT}/ws`);
console.log(`    POST   http://localhost:${PORT}/resolve_action  (HTTP fallback)\n`);
