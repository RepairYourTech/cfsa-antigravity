import { join } from "node:path";
import {
  chunkText,
  ensureMemoryScaffold,
  getFileText,
  getMemoryRoot,
  listFilesRecursively,
  readJsonl,
  setFileText,
  toRelativePath,
  writeJson,
} from "./utils.mjs";
import { buildSpecGraph } from "./spec-graph.mjs";
import { buildSemanticIndex } from "./semantic.mjs";

function articleHeader(record) {
  return [
    "---",
    `id: ${record.id}`,
    `type: ${record.type}`,
    `agent: ${record.agent}`,
    `source: ${record.source}`,
    `timestamp: ${record.timestamp}`,
    "---",
    "",
  ].join("\n");
}

function buildKnowledgeArticle(record) {
  const title = record.title || `${record.type}-${record.id}`;
  const tags = Array.isArray(record.tags) && record.tags.length > 0 ? `**Tags**: ${record.tags.join(", ")}\n\n` : "";
  return `${articleHeader(record)}# ${title}\n\n${tags}${record.text.trim()}\n`;
}

function summarizeStructuredEntries(entries, singularLabel) {
  if (entries.length === 0) {
    return [];
  }

  const byTitle = new Map();
  for (const entry of entries) {
    const key = entry.title ?? entry.id;
    const bucket = byTitle.get(key) ?? [];
    bucket.push(entry);
    byTitle.set(key, bucket);
  }

  return [...byTitle.entries()]
    .map(([title, bucket]) => {
      const latest = [...bucket].sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)))[0];
      const agents = [...new Set(bucket.map((entry) => entry.agent))].join(", ");
      const sources = [...new Set(bucket.map((entry) => entry.source))].join(", ");
      return [
        `## ${title}`,
        "",
        `- **Occurrences**: ${bucket.length}`,
        `- **Latest timestamp**: ${latest.timestamp}`,
        `- **Agents**: ${agents}`,
        `- **Sources**: ${sources}`,
        `- **Index**: [[index]]`,
        "",
        latest.text.trim(),
        "",
      ].join("\n");
    });
}

export function compileMemory(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(projectRoot);
  ensureMemoryScaffold(memoryRoot);
  const specGraph = buildSpecGraph({ projectRoot, memoryRoot });

  const rawFiles = [
    ...listFilesRecursively(join(memoryRoot, "raw", "events")),
    ...listFilesRecursively(join(memoryRoot, "raw", "sessions")),
  ].filter((filePath) => filePath.endsWith(".jsonl"));

  const records = rawFiles.flatMap((filePath) => readJsonl(filePath));
  const patterns = records.filter((record) => record.type === "pattern");
  const decisions = records.filter((record) => record.type === "decision");
  const blockers = records.filter((record) => record.type === "blocker");
  const knowledge = records.filter((record) => !["pattern", "decision", "blocker"].includes(record.type));

  const knowledgeDir = join(memoryRoot, "wiki", "knowledge");
  const specsRoot = join(memoryRoot, "wiki", "specs");
  const indexEntries = [];
  const chunkEntries = [];
  const specFiles = listFilesRecursively(specsRoot)
    .filter((filePath) => filePath.endsWith(".md"))
    .filter((filePath) => !filePath.endsWith("README.md"))
    .filter((filePath) => !filePath.endsWith(".gitkeep"));

  const specTypeForPath = (relativePath) => {
    if (relativePath.includes('/specs/ia/')) return 'ia-spec';
    if (relativePath.includes('/specs/be/')) return 'be-spec';
    if (relativePath.includes('/specs/fe/')) return 'fe-spec';
    if (relativePath.includes('/specs/phases/')) return 'phase-plan';
    if (relativePath.includes('/specs/ideation/')) return 'ideation';
    if (relativePath.includes('/specs/audits/')) return 'audit';
    if (relativePath.includes('/specs/architecture/')) return 'architecture';
    return 'spec';
  };

  const specTitleForText = (relativePath, text) => {
    const heading = text.split("\n").find((line) => line.startsWith("# "));
    if (heading) {
      return heading.replace(/^#\s+/, '').trim();
    }
    return relativePath.split('/').at(-1)?.replace(/\.md$/, '') ?? relativePath;
  };

  for (const filePath of specFiles) {
    const text = getFileText(filePath, '');
    if (!text.trim()) {
      continue;
    }
    const relativePath = toRelativePath(projectRoot, filePath);
    const type = specTypeForPath(relativePath);
    const title = specTitleForText(relativePath, text);
    indexEntries.push({
      id: `spec:${relativePath.replace(/^\.memory\/wiki\/specs\//, '').replace(/\.md$/, '')}`,
      type,
      title,
      path: relativePath,
      source: relativePath,
      agent: 'spec-vault',
      timestamp: 'spec-vault',
      excerpt: text.slice(0, 240),
    });

    for (const [index, chunk] of chunkText(text).entries()) {
      chunkEntries.push({
        id: `spec:${relativePath}:${index + 1}`,
        parentId: `spec:${relativePath.replace(/^\.memory\/wiki\/specs\//, '').replace(/\.md$/, '')}`,
        path: relativePath,
        text: chunk,
      });
    }
  }

  const seenIndexEntryIds = new Set(indexEntries.map((entry) => entry.id));
  const seenChunkEntryIds = new Set(chunkEntries.map((entry) => entry.id));

  const getRecordPath = (record) => {
    if (record.type === "pattern") {
      return join(memoryRoot, "wiki", "patterns.md");
    }
    if (record.type === "decision") {
      return join(memoryRoot, "wiki", "decisions.md");
    }
    if (record.type === "blocker") {
      return join(memoryRoot, "wiki", "blockers.md");
    }

    const slugBase = `${record.timestamp.slice(0, 10)}-${(record.title ?? record.type).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/^-+|-+$/g, "");
    const fileName = `${slugBase || record.id}.md`;
    return join(knowledgeDir, fileName);
  };

  for (const record of knowledge) {
    const absolutePath = getRecordPath(record);
    const content = buildKnowledgeArticle(record);
    setFileText(absolutePath, content);
  }

  for (const record of records) {
    const absolutePath = getRecordPath(record);
    if (!seenIndexEntryIds.has(record.id)) {
      indexEntries.push({
        id: record.id,
        type: record.type,
        title: record.title ?? record.id,
        path: toRelativePath(projectRoot, absolutePath),
        source: record.source,
        agent: record.agent,
        timestamp: record.timestamp,
        excerpt: record.text.slice(0, 240),
      });
      seenIndexEntryIds.add(record.id);
    }

    for (const [index, chunk] of chunkText(record.text).entries()) {
      const chunkId = `${record.id}:${index + 1}`;
      if (seenChunkEntryIds.has(chunkId)) {
        continue;
      }
      chunkEntries.push({
        id: chunkId,
        parentId: record.id,
        path: toRelativePath(projectRoot, absolutePath),
        text: chunk,
      });
      seenChunkEntryIds.add(chunkId);
    }
  }

  indexEntries.sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
  chunkEntries.sort((left, right) => left.parentId.localeCompare(right.parentId) || left.id.localeCompare(right.id));

  const knowledgeIndexEntries = indexEntries.filter((entry) => !["pattern", "decision", "blocker"].includes(entry.type));

  const specEntries = indexEntries.filter((entry) => entry.path.startsWith('.memory/wiki/specs/'));
  const phaseEntries = specEntries.filter((entry) => entry.path.includes('/phases/'));
  const iaEntries = specEntries.filter((entry) => entry.path.includes('/ia/'));
  const beEntries = specEntries.filter((entry) => entry.path.includes('/be/'));
  const feEntries = specEntries.filter((entry) => entry.path.includes('/fe/'));
  const blockerEntries = indexEntries.filter((entry) => entry.type === 'blocker');
  const decisionEntries = indexEntries.filter((entry) => entry.type === 'decision');
  const patternEntries = indexEntries.filter((entry) => entry.type === 'pattern');

  const indexMarkdown = [
    "# Memory Index",
    "",
    "## Vault Home",
    "",
    "- [[wiki-home|Vault Home]]",
    "- [[decisions]]",
    "- [[patterns]]",
    "- [[blockers]]",
    "",
    "## Graph Hubs",
    "",
    "- [[hubs/shards|Shards Hub]]",
    "- [[hubs/phases|Phases Hub]]",
    "- [[hubs/operations|Operations Hub]]",
    "- [[hubs/surfaces|Surface Hub]]",
    "",
    "## Knowledge",
    "",
    ...knowledgeIndexEntries.map((entry) => {
      const linkTarget = entry.path.replace(/^\.memory\/wiki\//, "").replace(/^\.memory\//, "").replace(/\.md$/, "");
      return `- [[${linkTarget}|${entry.title}]] — ${entry.type} — ${entry.timestamp}`;
    }),
    "",
    "## Structured Memory",
    "",
    ...indexEntries
      .filter((entry) => ["pattern", "decision", "blocker"].includes(entry.type))
      .map((entry) => `- ${entry.type}: ${entry.title} — ${entry.timestamp}`),
    "",
  ].join("\n");
  setFileText(join(memoryRoot, "wiki", "index.md"), indexMarkdown);

  const sectionify = (title, entries, singularLabel) => [
    `# ${title}`,
    "",
    `## Summary`,
    "",
    `- **Total ${singularLabel}s**: ${entries.length}`,
    `- **Unique ${singularLabel} titles**: ${new Set(entries.map((entry) => entry.title ?? entry.id)).size}`,
    "",
    ...summarizeStructuredEntries(entries, singularLabel),
    `## Full Log`,
    "",
    ...entries.map((entry) => {
      const tags = Array.isArray(entry.tags) && entry.tags.length > 0
        ? `- **Tags**: ${entry.tags.join(", ")}\n`
        : "";
      return `### ${entry.title ?? entry.id}\n\n- **Timestamp**: ${entry.timestamp}\n- **Agent**: ${entry.agent}\n- **Source**: ${entry.source}\n${tags}\n${entry.text.trim()}\n`;
    }),
  ].join("\n");

  setFileText(join(memoryRoot, "wiki", "patterns.md"), sectionify("Patterns", patterns, "pattern"));
  setFileText(join(memoryRoot, "wiki", "decisions.md"), sectionify("Decisions", decisions, "decision"));
  setFileText(join(memoryRoot, "wiki", "blockers.md"), sectionify("Blockers", blockers, "blocker"));

  setFileText(join(memoryRoot, "wiki", "hubs", "shards.md"), [
    "# Shards Hub",
    "",
    `- **IA specs**: ${iaEntries.length}`,
    `- **BE specs**: ${beEntries.length}`,
    `- **FE specs**: ${feEntries.length}`,
    "",
    "## IA",
    ...iaEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
    "## BE",
    ...beEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
    "## FE",
    ...feEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "hubs", "phases.md"), [
    "# Phases Hub",
    "",
    `- **Phase documents**: ${phaseEntries.length}`,
    "",
    ...phaseEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "hubs", "operations.md"), [
    "# Operations Hub",
    "",
    `- **Decisions**: ${decisionEntries.length}`,
    `- **Patterns**: ${patternEntries.length}`,
    `- **Blockers**: ${blockerEntries.length}`,
    "",
    "- [[decisions]]",
    "- [[patterns]]",
    "- [[blockers]]",
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "hubs", "surfaces.md"), [
    "# Surface Hub",
    "",
    `- **IA ↔ BE ↔ FE graph nodes**: ${iaEntries.length + beEntries.length + feEntries.length}`,
    "",
    "- [[specs/ia/ia-index|IA Specs]]",
    "- [[specs/be/be-index|BE Specs]]",
    "- [[specs/fe/fe-index|FE Specs]]",
    "",
    "## Cross-layer navigation",
    "",
    ...iaEntries.map((entry) => `- IA: [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    ...beEntries.map((entry) => `- BE: [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    ...feEntries.map((entry) => `- FE: [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "architecture.md"), [
    "# Architecture Hub",
    "",
    ...specEntries.filter((entry) => entry.path.includes('/architecture/')).map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "audits.md"), [
    "# Audits Hub",
    "",
    ...specEntries.filter((entry) => entry.path.includes('/audits/')).map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "phases.md"), [
    "# Phases Hub",
    "",
    ...phaseEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "ideation.md"), [
    "# Ideation Hub",
    "",
    ...specEntries.filter((entry) => entry.path.includes('/ideation/')).map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "specs", "ia.md"), [
    "# IA Specs Hub",
    "",
    ...iaEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "specs", "be.md"), [
    "# BE Specs Hub",
    "",
    ...beEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "specs", "fe.md"), [
    "# FE Specs Hub",
    "",
    ...feEntries.map((entry) => `- [[${entry.path.replace(/^\.memory\/wiki\//, '').replace(/\.md$/, '')}|${entry.title}]]`),
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "wiki", "specs", "index.md"), [
    "# Specs Hub",
    "",
    "- [[ia|IA Specs]]",
    "- [[be|BE Specs]]",
    "- [[fe|FE Specs]]",
    "",
  ].join("\n"));

  setFileText(join(memoryRoot, "schema", "index.jsonl"), indexEntries.map((entry) => JSON.stringify(entry)).join("\n") + (indexEntries.length ? "\n" : ""));

  setFileText(join(memoryRoot, "schema", "index.jsonl"), indexEntries.map((entry) => JSON.stringify(entry)).join("\n") + (indexEntries.length ? "\n" : ""));
  setFileText(join(memoryRoot, "schema", "chunks.jsonl"), chunkEntries.map((entry) => JSON.stringify(entry)).join("\n") + (chunkEntries.length ? "\n" : ""));
  const semanticIndex = buildSemanticIndex({ memoryRoot, projectRoot });

  writeJson(join(memoryRoot, "schema", "summary.json"), {
    compiledAt: new Date().toISOString(),
    rawFiles: rawFiles.length,
    knowledgeEntries: indexEntries.length,
    chunkEntries: chunkEntries.length,
    semanticEntries: semanticIndex.count,
    specGraphNodes: specGraph.nodeCount,
    specGraphEdges: specGraph.edgeCount,
    specGraphLintIssues: specGraph.lintIssues,
    patterns: patterns.length,
    decisions: decisions.length,
    blockers: blockers.length,
  });

  return {
    ok: true,
    rawFiles: rawFiles.length,
    knowledgeEntries: indexEntries.length,
    chunkEntries: chunkEntries.length,
    semanticEntries: semanticIndex.count,
    specGraphNodes: specGraph.nodeCount,
    specGraphEdges: specGraph.edgeCount,
    specGraphLintIssues: specGraph.lintIssues,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(compileMemory(), null, 2));
}
