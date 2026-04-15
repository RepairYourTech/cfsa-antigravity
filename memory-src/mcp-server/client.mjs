import { buildDaemonEndpoints, fetchHealth, readDaemonState, resolveProjectRoot } from "./runtime.mjs";

const projectRoot = resolveProjectRoot();
const state = readDaemonState(projectRoot);
const envEndpoint = process.env.CFSA_MEMORY_URL || null;
const envHealthUrl = process.env.CFSA_MEMORY_HEALTH_URL || null;
const fallbackEndpoint = `http://${process.env.CFSA_MEMORY_HOST || "127.0.0.1"}:${process.env.CFSA_MEMORY_PORT || "4317"}/mcp`;
const fallbackHealthUrl = envHealthUrl || fallbackEndpoint.replace(/\/mcp$/, "/health");

function resolveConnectionTarget() {
  if (state) {
    return { source: "runtime-state", ...buildDaemonEndpoints(state) };
  }
  if (envEndpoint || envHealthUrl) {
    return {
      source: "environment",
      endpoint: envEndpoint || fallbackEndpoint,
      healthUrl: envHealthUrl || (envEndpoint || fallbackEndpoint).replace(/\/mcp$/, "/health"),
    };
  }
  return {
    source: "fallback",
    endpoint: fallbackEndpoint,
    healthUrl: fallbackHealthUrl,
  };
}

const connection = resolveConnectionTarget();

async function ensureReady() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const health = await fetchHealth(connection.healthUrl);
      const daemonProjectRoot = health?.projectRoot;
      if (daemonProjectRoot && daemonProjectRoot !== projectRoot) {
        throw new Error(`Workspace mismatch: client for ${projectRoot} is pointing at daemon for ${daemonProjectRoot}`);
      }
      if (!daemonProjectRoot && state?.projectRoot) {
        throw new Error(`Workspace identity missing from daemon health response at ${connection.healthUrl}`);
      }
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Workspace ")) {
        throw error;
      }
      if (error instanceof Error && error.message.startsWith("Workspace identity missing")) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let requestId = null;
    try {
      const parsed = JSON.parse(trimmed);
      requestId = parsed?.id ?? null;
      const ready = await ensureReady();
      if (!ready) {
        process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, error: { code: -32000, message: "cfsa-memory-daemon is not ready" } })}\n`);
        continue;
      }
      const response = await fetch(connection.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: trimmed,
      });
      const text = await response.text();
      process.stdout.write(`${text}\n`);
    } catch (error) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: requestId, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } })}\n`);
    }
  }
});
