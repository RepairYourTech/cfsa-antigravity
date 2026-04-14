import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { clearDaemonState, processExists, readDaemonState, waitForHealth } from "./runtime.mjs";

const root = process.cwd();
const daemonPath = join(root, ".memory", "mcp-server", "daemon.mjs");
if (!existsSync(daemonPath)) {
  console.error(`Missing daemon at ${daemonPath}`);
  process.exit(1);
}

const host = process.env.CFSA_MEMORY_HOST || "127.0.0.1";
const port = Number(process.env.CFSA_MEMORY_PORT || 4317);
const healthUrl = process.env.CFSA_MEMORY_HEALTH_URL || `http://${host}:${port}/health`;

const current = readDaemonState(root);
if (current?.pid && processExists(current.pid)) {
  const healthy = await waitForHealth(current.healthUrl || healthUrl, 2, 100);
  if (healthy) {
    console.log("cfsa-memory-daemon already running");
    process.exit(0);
  }
  clearDaemonState(root);
}

const child = spawn("node", [daemonPath], {
  detached: true,
  stdio: "ignore",
  env: {
    ...process.env,
    CFSA_MEMORY_HOST: host,
    CFSA_MEMORY_PORT: String(port),
  },
});
child.unref();

const healthy = await waitForHealth(healthUrl, 20, 150);
if (!healthy) {
  console.error("cfsa-memory-daemon failed readiness check");
  process.exit(1);
}

console.log("cfsa-memory-daemon started");
