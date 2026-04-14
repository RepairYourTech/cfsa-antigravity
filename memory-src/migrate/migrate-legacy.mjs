import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { ensureMemoryScaffold, getFileText, getMemoryRoot, setFileText, slugify } from "../pipeline/utils.mjs";
import { flushEntry } from "../pipeline/flush.mjs";
import { compileMemory } from "../pipeline/compile.mjs";

const LEGACY_MAP = [
  { source: ".claude/memory/patterns.md", target: "wiki/patterns.md" },
  { source: ".claude/memory/decisions.md", target: "wiki/decisions.md" },
  { source: ".claude/memory/blockers.md", target: "wiki/blockers.md" },
  { source: ".claude/progress/memory", targetDir: "wiki/knowledge", runtime: "claude-progress" },
  { source: ".agent/progress/memory", targetDir: "wiki/knowledge", runtime: "agent-progress" },
  { source: ".factory/memory", targetDir: "wiki/knowledge", runtime: "factory-memory" },
  { source: ".factory/progress/memory", targetDir: "wiki/knowledge", runtime: "factory-progress" },
];

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function structuredTypeFromTarget(target) {
  if (target.includes("patterns.md")) return "pattern";
  if (target.includes("decisions.md")) return "decision";
  if (target.includes("blockers.md")) return "blocker";
  return "knowledge";
}

function stripMarkdownHeading(text) {
  return text
    .split("\n")
    .filter((line, index) => !(index === 0 && line.startsWith("# ")))
    .join("\n")
    .trim();
}

function importStructuredRecord(mapping, content, memoryRoot, migratedAt) {
  const normalized = stripMarkdownHeading(content);
  if (!normalized) {
    return { status: "skipped", reason: "empty" };
  }

  const result = flushEntry({
    type: structuredTypeFromTarget(mapping.target),
    agent: "migration",
    source: mapping.source,
    title: `${structuredTypeFromTarget(mapping.target)} import`,
    text: normalized,
    metadata: {
      migratedAt,
      legacySource: mapping.source,
      importMode: "structured-file"
    },
    sessionId: "legacy-migration"
  }, { memoryRoot });

  return { status: "created", destination: result.path };
}

function writeKnowledgeImport(destination, content, sourceLabel, runtime, migratedAt) {
  const existingText = getFileText(destination, "");
  if (existingText.trim() && hashText(existingText) === hashText(content)) {
    return { status: "skipped", destination, reason: "identical" };
  }

  if (existingText.trim()) {
    const conflictDestination = destination.replace(/\.md$/, `.conflict-${migratedAt.slice(0, 10)}.md`);
    setFileText(conflictDestination, content);
    return { status: "conflict", destination: conflictDestination, runtime, source: sourceLabel };
  }

  setFileText(destination, content);
  return { status: "created", destination, runtime, source: sourceLabel };
}

export function migrateLegacyMemory(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(projectRoot);
  ensureMemoryScaffold(memoryRoot);

  const migrated = [];
  const skipped = [];
  const conflicts = [];
  const migratedAt = new Date().toISOString();

  for (const mapping of LEGACY_MAP) {
    const absoluteSource = join(projectRoot, mapping.source);
    if (!existsSync(absoluteSource)) {
      continue;
    }

    if (mapping.target) {
      const content = getFileText(absoluteSource, "");
      if (!content.trim()) {
        continue;
      }
      const result = importStructuredRecord(mapping, content, memoryRoot, migratedAt);
      if (result.status === "skipped") {
        skipped.push({ from: mapping.source, to: mapping.target, reason: result.reason });
      } else {
        migrated.push({ from: mapping.source, to: mapping.target, status: result.status });
      }
      continue;
    }

    const entries = ["patterns.md", "decisions.md", "blockers.md"].map((name) => join(absoluteSource, name)).filter((path) => existsSync(path));
    for (const entryPath of entries) {
      const text = getFileText(entryPath, "");
      if (!text.trim()) {
        continue;
      }
      const fileName = `${slugify(mapping.runtime)}-${slugify(basename(entryPath, ".md"))}.md`;
      const destination = join(memoryRoot, mapping.targetDir, fileName);
      const sourceLabel = `${mapping.source}/${basename(entryPath)}`;
      const content = [
        "---",
        `source: ${sourceLabel}`,
        `runtime: ${mapping.runtime}`,
        `migrated_at: ${migratedAt}`,
        "---",
        "",
        text.trim(),
        "",
      ].join("\n");
      const result = writeKnowledgeImport(destination, content, sourceLabel, mapping.runtime, migratedAt);
      if (result.status === "skipped") {
        skipped.push({ from: entryPath, to: destination, reason: result.reason });
      } else if (result.status === "conflict") {
        conflicts.push({ from: entryPath, to: result.destination });
      } else {
        migrated.push({ from: entryPath, to: destination, status: result.status });
      }
    }
  }

  const compileResult = compileMemory({ projectRoot, memoryRoot });
  return {
    ok: true,
    migratedCount: migrated.length,
    skippedCount: skipped.length,
    conflictCount: conflicts.length,
    migrated,
    skipped,
    conflicts,
    compileResult,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(migrateLegacyMemory(), null, 2));
}
