import { basename, join } from "node:path";
import { getFileText, getMemoryRoot, ensureMemoryScaffold } from "./utils.mjs";
import { flushEntry } from "./flush.mjs";

export function ingestFile(filePath, options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);

  const text = getFileText(filePath, "");
  if (!text.trim()) {
    return { ok: false, reason: "empty-file", path: filePath };
  }

  return flushEntry(
    {
      type: options.type ?? "knowledge",
      source: options.source ?? "ingest",
      agent: options.agent ?? "system",
      title: options.title ?? basename(filePath),
      text,
      metadata: {
        path: filePath,
      },
      sessionId: options.sessionId,
    },
    { memoryRoot },
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node ingest.mjs <file>");
    process.exit(1);
  }

  const result = ingestFile(join(process.cwd(), filePath));
  console.log(JSON.stringify(result, null, 2));
}
