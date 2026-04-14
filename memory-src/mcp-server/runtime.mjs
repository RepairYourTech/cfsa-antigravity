import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function getRuntimeDir(root = process.cwd()) {
  return join(root, ".memory", "runtime");
}

export function ensureRuntimeDir(root = process.cwd()) {
  const runtimeDir = getRuntimeDir(root);
  if (!existsSync(runtimeDir)) {
    mkdirSync(runtimeDir, { recursive: true });
  }
  return runtimeDir;
}

export function pidFile(root = process.cwd()) {
  return join(getRuntimeDir(root), "cfsa-memory-daemon.pid");
}

export function stateFile(root = process.cwd()) {
  return join(getRuntimeDir(root), "cfsa-memory-daemon.json");
}

export function writeDaemonState(root, state) {
  ensureRuntimeDir(root);
  writeFileSync(stateFile(root), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  writeFileSync(pidFile(root), `${state.pid}\n`, "utf8");
}

export function readDaemonState(root = process.cwd()) {
  if (!existsSync(stateFile(root))) {
    return null;
  }
  return JSON.parse(readFileSync(stateFile(root), "utf8"));
}

export function clearDaemonState(root = process.cwd()) {
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

export async function waitForHealth(url, retries = 20, delayMs = 150) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // keep retrying
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}
