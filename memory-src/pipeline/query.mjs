import { join } from "node:path";
import { semanticCapabilities, semanticQuery } from "./semantic.mjs";
import { ensureMemoryScaffold, getMemoryRoot, readJsonl, scoreText } from "./utils.mjs";

function rankEntry(entry, query) {
  const titleScore = scoreText(entry.title ?? "", query) * 2;
  const excerptScore = scoreText(entry.excerpt ?? "", query);
  return titleScore + excerptScore;
}

export function queryMemory(query, options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);

  const semantic = semanticCapabilities({ memoryRoot });
  if (semantic.enabled) {
    return semanticQuery(query, { memoryRoot, limit: options.limit });
  }

  const indexEntries = readJsonl(join(memoryRoot, "schema", "index.jsonl"));
  const chunkEntries = readJsonl(join(memoryRoot, "schema", "chunks.jsonl"));
  const limit = options.limit ?? 5;
  const types = options.types ?? null;
  const parents = new Map(indexEntries.map((entry) => [entry.id, entry]));
  const byParent = new Map();

  for (const chunk of chunkEntries) {
    const chunkScore = scoreText(chunk.text, query);
    const parent = parents.get(chunk.parentId);
    if (!parent) {
      continue;
    }
    if (types && !types.includes(parent.type)) {
      continue;
    }

    const aggregateScore = chunkScore + rankEntry(parent, query);
    if (aggregateScore <= 0) {
      continue;
    }

    const current = byParent.get(chunk.parentId);
    const candidate = {
      id: chunk.id,
      parentId: chunk.parentId,
      score: aggregateScore,
      text: chunk.text,
      path: chunk.path,
      title: parent.title ?? chunk.parentId,
      type: parent.type ?? "knowledge",
      timestamp: parent.timestamp ?? null,
      source: parent.source ?? null,
      excerpt: parent.excerpt ?? chunk.text,
    };

    if (!current || candidate.score > current.score) {
      byParent.set(chunk.parentId, candidate);
    }
  }

  const scored = [...byParent.values()]
    .sort((left, right) => right.score - left.score || String(right.timestamp).localeCompare(String(left.timestamp)))
    .slice(0, limit);

  return {
    ok: true,
    query,
    count: scored.length,
    results: scored,
  };
}

export function buildContext(task, options = {}) {
  const results = queryMemory(task, options).results;
  const grouped = new Map();
  for (const result of results) {
    const bucket = grouped.get(result.type) ?? [];
    bucket.push(result);
    grouped.set(result.type, bucket);
  }

  const lines = ["# Memory Context", "", `Task: ${task}`, ""];

  if (results.length === 0) {
    lines.push("No relevant memory entries found.");
  } else {
    const order = ["decision", "pattern", "blocker", "knowledge", "event"];
    for (const type of order) {
      const entries = grouped.get(type);
      if (!entries || entries.length === 0) {
        continue;
      }
      lines.push(`## ${type[0].toUpperCase()}${type.slice(1)}s`);
      lines.push("");
      for (const result of entries) {
        lines.push(`- ${result.title} (${result.path})`);
        lines.push(`  ${result.text}`);
      }
      lines.push("");
    }
  }

  return {
    ok: true,
    context: lines.join("\n").trimEnd(),
    results,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error("Usage: node query.mjs <query>");
    process.exit(1);
  }

  console.log(JSON.stringify(queryMemory(query), null, 2));
}
