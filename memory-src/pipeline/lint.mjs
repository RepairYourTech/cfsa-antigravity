import { join } from "node:path";
import { ensureMemoryScaffold, fileExists, getMemoryRoot, listFilesRecursively, readJsonl } from "./utils.mjs";

export function lintMemory(options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);

  const requiredPaths = [
    join(memoryRoot, "raw"),
    join(memoryRoot, "wiki", "index.md"),
    join(memoryRoot, "wiki", "patterns.md"),
    join(memoryRoot, "wiki", "decisions.md"),
    join(memoryRoot, "wiki", "blockers.md"),
    join(memoryRoot, "schema", "index.jsonl"),
    join(memoryRoot, "schema", "chunks.jsonl"),
    join(memoryRoot, "config.json"),
  ];

  const errors = [];
  for (const requiredPath of requiredPaths) {
    if (!fileExists(requiredPath)) {
      errors.push(`Missing required path: ${requiredPath}`);
    }
  }

  const knowledgeFiles = listFilesRecursively(join(memoryRoot, "wiki", "knowledge")).filter((filePath) => filePath.endsWith(".md"));
  const indexEntries = readJsonl(join(memoryRoot, "schema", "index.jsonl"));
  if (indexEntries.length < knowledgeFiles.length) {
    errors.push("Compiled index has fewer entries than knowledge articles.");
  }

  const warnings = [];
  if (indexEntries.length === 0) {
    warnings.push("No compiled memory entries yet. Run a flush/compile cycle to populate schema outputs.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    knowledgeFiles: knowledgeFiles.length,
    indexEntries: indexEntries.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(lintMemory(), null, 2));
}
