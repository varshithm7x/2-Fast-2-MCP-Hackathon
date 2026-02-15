// ============================================================================
// Procrastination Shame Engine - MCP Server Entry Point
// The merciless AI agent that tracks, calculates, and shames.
// ============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, DASHBOARD_PORT, MCP_TRANSPORT, MCP_HTTP_PORT } from "./config.js";
import { registerTools } from "./tools/index.js";
import { startDashboardServer } from "./dashboard-api.js";

const ASCII_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║        🔔 PROCRASTINATION SHAME ENGINE 🔔                  ║
║                                                              ║
║   "Your productivity, mercilessly tracked and judged."       ║
║                                                              ║
║   Score: 0-20  😊 Gentle Nudge                              ║
║   Score: 21-40 🙄 Passive Aggressive                        ║
║   Score: 41-60 😤 Direct Call-Out                            ║
║   Score: 61-80 🔥 Aggressive Shame                          ║
║   Score: 81-100 ☢️  NUCLEAR OPTION                           ║
║                                                              ║
║   Archestra MCP Server • v1.0.0                              ║
╚══════════════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  console.error(ASCII_BANNER);

  // Load configuration
  const config = loadConfig();
  console.error(`[Shame Engine] User: ${config.userName}`);
  console.error(`[Shame Engine] Timezone: ${config.timezone}`);
  console.error(`[Shame Engine] Work Hours: ${config.workHoursStart}:00 - ${config.workHoursEnd}:00`);
  console.error(`[Shame Engine] Task Sources: ${config.taskSources.map((s) => s.type).join(", ") || "none configured"}`);
  console.error(`[Shame Engine] Activity Sources: ${config.activitySources.map((s) => s.type).join(", ") || "none configured"}`);
  console.error(`[Shame Engine] Discord: ${config.discordWebhookUrl ? "✅ configured" : "❌ not configured"}`);
  console.error(`[Shame Engine] Mom Email: ${config.momEmail?.enabled ? `✅ armed (${config.momEmail.momEmail})` : "❌ not configured"}`);
  console.error(`[Shame Engine] Transport: ${MCP_TRANSPORT}`);

  // Create MCP server
  const server = new McpServer({
    name: "procrastination-shame-engine",
    version: "1.0.0",
  });

  // Register all tools
  registerTools(server);
  console.error("[Shame Engine] Tools registered ✅");

  // Start the dashboard API server (runs alongside MCP)
  try {
    await startDashboardServer(DASHBOARD_PORT);
    console.error(`[Shame Engine] Dashboard API running on port ${DASHBOARD_PORT} ✅`);
  } catch (err) {
    console.error(`[Shame Engine] Dashboard API failed to start: ${err}`);
  }

  // Connect transport
  if (MCP_TRANSPORT === "stdio") {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[Shame Engine] Connected via stdio transport ✅");
  } else {
    // HTTP transport for Archestra orchestrator / remote connections
    console.error(`[Shame Engine] Starting HTTP transport on port ${MCP_HTTP_PORT}...`);
    const { StreamableHTTPServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/streamableHttp.js"
    );
    const { randomUUID } = await import("crypto");
    const expressModule = await import("express");
    const corsModule = await import("cors");
    const express = expressModule.default;
    const corsMiddleware = corsModule.default;
    const app = express();
    app.use(express.json());
    app.use(corsMiddleware());

    // Track active transports per session for multi-client support (Archestra + others)
    const transports = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

    // Health endpoint for Archestra connectivity checks
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", server: "procrastination-shame-engine", version: "1.0.0" });
    });

    // MCP Streamable HTTP endpoint (Archestra connects here via Private MCP Registry)
    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        // Existing session — route to correct transport
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId && !transports.has(sessionId)) {
        // Unknown session ID
        res.status(400).json({ error: "Invalid session ID" });
        return;
      }

      // New session — create transport and connect a new server instance
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };

      const sessionServer = new McpServer({
        name: "procrastination-shame-engine",
        version: "1.0.0",
      });
      registerTools(sessionServer);

      await sessionServer.connect(transport);
      await transport.handleRequest(req, res, req.body);

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport);
      }
    });

    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        return;
      }
      res.status(400).json({ error: "Invalid or missing session ID for GET request" });
    });

    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && transports.has(sessionId)) {
        const transport = transports.get(sessionId)!;
        await transport.handleRequest(req, res);
        transports.delete(sessionId);
        return;
      }
      res.status(400).json({ error: "Invalid or missing session ID for DELETE request" });
    });

    app.listen(MCP_HTTP_PORT, "0.0.0.0", () => {
      console.error(`[Shame Engine] HTTP transport listening on 0.0.0.0:${MCP_HTTP_PORT} ✅`);
      console.error(`[Shame Engine] Register in Archestra MCP Registry → http://shame-engine:${MCP_HTTP_PORT}/mcp`);
    });
  }

  console.error("[Shame Engine] The Shame Engine is watching... 👁️");
}

main().catch((error) => {
  console.error("[Shame Engine] Fatal error:", error);
  process.exit(1);
});
