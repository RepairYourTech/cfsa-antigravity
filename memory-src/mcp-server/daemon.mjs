import { createServer } from "node:http";
import { memoryCompile } from "./tools/compile.mjs";
import { memoryFlush } from "./tools/flush.mjs";
import { memoryGraphQuery } from "./tools/graph.mjs";
import { memoryIngest, memoryLogDaily, memoryGetActiveBlockers } from "./tools/ingest.mjs";
import { memoryLint } from "./tools/lint.mjs";
import { memoryContext, memoryQuery, memorySemanticStatus } from "./tools/query.mjs";
import { clearDaemonState, writeDaemonState } from "./runtime.mjs";

const host = process.env.CFSA_MEMORY_HOST || "127.0.0.1";
const preferredPort = Number(process.env.CFSA_MEMORY_PORT || 4317);
const projectRoot = process.cwd();
let actualPort = preferredPort;

const tools = {
  memory_flush: memoryFlush,
  memory_compile: memoryCompile,
  memory_query: memoryQuery,
  memory_graph_query: memoryGraphQuery,
  memory_context: memoryContext,
  memory_semantic_status: memorySemanticStatus,
  memory_lint: memoryLint,
  memory_ingest: memoryIngest,
  memory_log_daily: memoryLogDaily,
  memory_get_active_blockers: memoryGetActiveBlockers,
};

const toolDefinitions = [
  { name: "memory_flush", description: "Append an entry to unified raw memory." },
  { name: "memory_compile", description: "Compile raw/wiki memory into derived schema artifacts." },
  { name: "memory_query", description: "Query compiled memory entries." },
  { name: "memory_graph_query", description: "Traverse the typed spec graph emitted by the memory compiler." },
  { name: "memory_context", description: "Build a ready-to-inject context block from memory." },
  { name: "memory_semantic_status", description: "Report semantic retrieval capability status." },
  { name: "memory_lint", description: "Validate the unified memory scaffold." },
  { name: "memory_ingest", description: "Ingest external content into unified memory." },
  { name: "memory_log_daily", description: "Append a line to the daily log." },
  { name: "memory_get_active_blockers", description: "Return unresolved blocker entries." },
];

function statePayload(extra = {}) {
  return {
    pid: process.pid,
    host,
    port: actualPort,
    requestedPort: preferredPort,
    healthUrl: `http://${host}:${actualPort}/health`,
    startedAt: new Date().toISOString(),
    ...extra,
  };
}

function writeState(extra = {}) {
  writeDaemonState(projectRoot, statePayload(extra));
}

async function handleRpc(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "cfsa-memory", version: "1.0.0" },
        capabilities: { tools: {} },
      },
    };
  }

  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: toolDefinitions } };
  }

  if (message.method === "tools/call") {
    const tool = tools[message.params?.name];
    if (!tool) {
      return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Unknown tool: ${message.params?.name}` } };
    }

    try {
      const result = await tool(message.params?.arguments ?? {});
      return { jsonrpc: "2.0", id: message.id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } };
    } catch (error) {
      return { jsonrpc: "2.0", id: message.id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } };
    }
  }

  return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: `Unsupported method: ${message.method}` } };
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ...statePayload({ healthy: true }) }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/mcp") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not-found" }));
    return;
  }

  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", async () => {
    try {
      const message = JSON.parse(body || "{}");
      if (!message || typeof message.method !== "string") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid JSON-RPC request" } }));
        return;
      }
      const response = await handleRpc(message);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
  });
});

function shutdown(code = 0) {
  clearDaemonState(projectRoot);
  server.close(() => process.exit(code));
}

process.on("exit", () => clearDaemonState(projectRoot));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error(error);
  shutdown(1);
});
process.on("unhandledRejection", (error) => {
  console.error(error);
  shutdown(1);
});

server.on("listening", () => {
  const address = server.address();
  if (address && typeof address === "object") {
    actualPort = address.port;
  }
  writeState({ healthy: true });
  process.stdout.write(`cfsa-memory-daemon listening on http://${host}:${actualPort}/mcp\n`);
});

server.on("close", () => clearDaemonState(projectRoot));
server.listen(preferredPort, host);
