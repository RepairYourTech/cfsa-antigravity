import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export function resolveProjectRoot(root = process.env.CFSA_MEMORY_PROJECT_ROOT || process.cwd()) {
  return resolve(root);
}

export function getRuntimeDir(root = resolveProjectRoot()) {
  return join(root, ".memory", "runtime");
}

export function ensureRuntimeDir(root = resolveProjectRoot()) {
  const runtimeDir = getRuntimeDir(root);
  if (!existsSync(runtimeDir)) {
    mkdirSync(runtimeDir, { recursive: true });
  }
  return runtimeDir;
}

export function pidFile(root = resolveProjectRoot()) {
  return join(getRuntimeDir(root), "cfsa-memory-daemon.pid");
}

export function stateFile(root = resolveProjectRoot()) {
  return join(getRuntimeDir(root), "cfsa-memory-daemon.json");
}

export function workspaceMemoryRoot(root = resolveProjectRoot()) {
  return join(root, ".memory");
}

export function buildDaemonEndpoints(state) {
  const host = state.host || "127.0.0.1";
  const port = state.port;
  const healthUrl = state.healthUrl || `http://${host}:${port}/health`;
  const endpoint = state.endpoint || `http://${host}:${port}/mcp`;
  return { endpoint, healthUrl };
}

export function normalizeDaemonState(root, state = {}) {
  const projectRoot = resolveProjectRoot(root);
  const memoryRoot = state.memoryRoot ? resolve(state.memoryRoot) : workspaceMemoryRoot(projectRoot);
  const normalized = {
    ...state,
    projectRoot,
    memoryRoot,
  };
  const { endpoint, healthUrl } = buildDaemonEndpoints(normalized);
  normalized.endpoint = endpoint;
  normalized.healthUrl = healthUrl;
  return normalized;
}

export function writeDaemonState(root, state) {
  ensureRuntimeDir(root);
  const normalized = normalizeDaemonState(root, state);
  writeFileSync(stateFile(root), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  writeFileSync(pidFile(root), `${normalized.pid}\n`, "utf8");
}

export function readDaemonState(root = resolveProjectRoot()) {
  if (!existsSync(stateFile(root))) {
    return null;
  }
  return normalizeDaemonState(root, JSON.parse(readFileSync(stateFile(root), "utf8")));
}

export function clearDaemonState(root = resolveProjectRoot()) {
  if (existsSync(pidFile(root))) rmSync(pidFile(root), { force: true });
  if (existsSync(stateFile(root))) rmSync(stateFile(root), { force: true });
}

export function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function fetchHealth(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  return response.json();
}

export async function waitForHealth(url, retries = 20, delayMs = 150) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await fetchHealth(url);
      return true;
    } catch {
      // keep retrying
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}
