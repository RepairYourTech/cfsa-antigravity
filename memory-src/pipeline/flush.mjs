import { join } from "node:path";
import { appendJsonl, ensureMemoryScaffold, getMemoryRoot } from "./utils.mjs";

export function flushEntry(entry, options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);

  const now = new Date();
  const type = entry.type ?? "event";
  const targetFile = entry.sessionId
    ? join(memoryRoot, "raw", "sessions", `${entry.sessionId}.jsonl`)
    : join(memoryRoot, "raw", "events", `${now.toISOString().slice(0, 10)}.jsonl`);

  const record = {
    id: entry.id ?? `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp ?? now.toISOString(),
    agent: entry.agent ?? "unknown",
    source: entry.source ?? "manual",
    type,
    title: entry.title ?? null,
    text: entry.text ?? "",
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    metadata: entry.metadata ?? {},
  };

  appendJsonl(targetFile, record);

  return {
    ok: true,
    path: targetFile,
    record,
  };
}
