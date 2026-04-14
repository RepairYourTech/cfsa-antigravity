import { join } from "node:path";
import { getFileText, getMemoryRoot, listFilesRecursively, setFileText, toRelativePath, writeJson } from "./utils.mjs";

const SPEC_ROOT_PREFIX = ".memory/wiki/specs/";
const RELATION_MARKER = "<!-- spec-graph: auto-generated -->";

function detectNodeType(relativePath) {
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}ia/`)) return "ia-spec";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}be/`)) return "be-spec";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}fe/`)) return "fe-spec";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}phases/`)) return "phase-plan";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}ideation/`)) return "ideation";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}audits/`)) return "audit";
  if (relativePath.startsWith(`${SPEC_ROOT_PREFIX}architecture/`)) return "architecture";
  return "plan";
}

function stripMarkdown(value) {
  return value.replace(/`+/g, "").replace(/\[(.*?)\]\([^)]*\)/g, "$1").trim();
}

function parseInlineList(value) {
  return stripMarkdown(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePathReference(value) {
  const match = value.match(/\(([^)]+\.md)\)/);
  if (match) return match[1];
  const codePath = value.match(/`([^`]+\.md)`/);
  if (codePath) return codePath[1];
  return null;
}

function parseReferenceList(value) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const path = parsePathReference(part);
      const label = stripMarkdown(part).replace(/\.md$/, "").trim();
      return { path, label };
    });
}

function parseShardReferences(value) {
  return parseInlineList(value)
    .map((item) => {
      const match = item.match(/([0-9]{2}[a-z0-9]*)/i);
      return match ? match[1].toLowerCase() : null;
    })
    .filter(Boolean);
}

function normalizeTitle(relativePath, text) {
  const heading = text.split("\n").find((line) => line.startsWith("# "));
  if (heading) return heading.replace(/^#\s+/, "").trim();
  return relativePath.split("/").at(-1).replace(/\.md$/, "");
}

function parseMetadata(text) {
  const lines = text.split("\n");
  const metadata = {
    dependsOn: [],
    blocks: [],
    splitFrom: [],
    iaSources: [],
    phaseRefs: [],
    decisionRefs: [],
    wikiLinks: [],
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("> **Depends on**:")) {
      metadata.dependsOn.push(...parseShardReferences(trimmed.split(":").slice(1).join(":").trim()));
    }
    if (trimmed.startsWith("> **Blocks**:")) {
      metadata.blocks.push(...parseShardReferences(trimmed.split(":").slice(1).join(":").trim()));
    }
    if (trimmed.startsWith("> **Split from**:")) {
      metadata.splitFrom.push(...parseShardReferences(trimmed.split(":").slice(1).join(":").trim()));
    }
    if (trimmed.startsWith("> **IA Source**:")) {
      metadata.iaSources.push(...parseReferenceList(trimmed.split(":").slice(1).join(":").trim()));
    }

    for (const match of trimmed.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      metadata.wikiLinks.push(match[1]);
    }
    for (const match of trimmed.matchAll(/\bD(?:-INT)?-[A-Za-z0-9-]+\b/g)) {
      metadata.decisionRefs.push(match[0]);
    }
    for (const match of trimmed.matchAll(/\b[Pp]hase\s+([0-9]+)\b/g)) {
      metadata.phaseRefs.push(`phase-${match[1]}`);
    }
    for (const match of trimmed.matchAll(/\bphase-([a-z0-9-]+)\b/gi)) {
      metadata.phaseRefs.push(`phase-${match[1]}`.toLowerCase());
    }
  }

  metadata.dependsOn = [...new Set(metadata.dependsOn)];
  metadata.blocks = [...new Set(metadata.blocks)];
  metadata.splitFrom = [...new Set(metadata.splitFrom)];
  metadata.phaseRefs = [...new Set(metadata.phaseRefs)];
  metadata.decisionRefs = [...new Set(metadata.decisionRefs)];
  metadata.wikiLinks = [...new Set(metadata.wikiLinks)];
  return metadata;
}

function toNodeId(type, relativePath) {
  return `${type}:${relativePath.replace(SPEC_ROOT_PREFIX, "").replace(/\.md$/, "")}`;
}

function toWikiTarget(relativePath) {
  return relativePath.replace(/^\.memory\/wiki\//, "").replace(/\.md$/, "");
}

function buildRelatedSection(node, outgoingEdges, nodesById) {
  const groups = new Map();
  for (const edge of outgoingEdges) {
    const target = nodesById.get(edge.to);
    if (!target) continue;
    const bucket = groups.get(edge.type) ?? [];
    bucket.push(`- [[${toWikiTarget(target.path)}|${target.label}]]`);
    groups.set(edge.type, bucket);
  }
  if (groups.size === 0) return "";

  const labels = {
    depends_on: "Depends on",
    blocks: "Blocks",
    split_from: "Split from",
    implemented_by: "Implemented by",
    derives_from: "Derives from",
    phases_into: "Phases into",
    constrained_by: "Constrained by",
    references: "References",
  };

  return [
    "",
    RELATION_MARKER,
    "## Related Specs",
    "",
    ...[...groups.entries()].flatMap(([type, links]) => [
      `### ${labels[type] ?? type}`,
      ...links,
      "",
    ]),
  ].join("\n").trimEnd() + "\n";
}

function replaceRelatedSection(text, section) {
  const base = text.includes(RELATION_MARKER) ? text.split(RELATION_MARKER)[0].trimEnd() : text.trimEnd();
  return section ? `${base}\n\n${section}` : `${base}\n`;
}

export function buildSpecGraph(options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(projectRoot);
  const specsRoot = join(memoryRoot, "wiki", "specs");
  const specFiles = listFilesRecursively(specsRoot)
    .filter((filePath) => filePath.endsWith(".md"))
    .filter((filePath) => !filePath.endsWith("README.md"))
    .filter((filePath) => !filePath.endsWith(".gitkeep"));

  const nodes = [];
  const nodesById = new Map();
  const nodesByPath = new Map();
  const iaByShard = new Map();
  const phaseBySlug = new Map();
  const decisionNodes = new Map();

  for (const filePath of specFiles) {
    const relativePath = toRelativePath(projectRoot, filePath);
    const text = getFileText(filePath, "");
    if (!text.trim()) continue;
    const type = detectNodeType(relativePath);
    const shardMatch = relativePath.match(/\/([0-9]{2}[a-z0-9]*)[^/]*\.md$/i);
    const shardId = shardMatch ? shardMatch[1].toLowerCase() : null;
    const node = {
      id: toNodeId(type, relativePath),
      type,
      label: normalizeTitle(relativePath, text),
      path: relativePath,
      shardId,
      metadata: parseMetadata(text),
    };
    nodes.push(node);
    nodesById.set(node.id, node);
    nodesByPath.set(relativePath, node);
    if (type === "ia-spec" && shardId) iaByShard.set(shardId, node.id);
    if (type === "phase-plan") phaseBySlug.set(relativePath.split("/").at(-1).replace(/\.md$/, "").toLowerCase(), node.id);
  }

  const edges = [];
  const edgeKeys = new Set();
  const lintIssues = [];

  function addEdge(from, to, type, source) {
    if (!from || !to || from === to) return;
    const key = `${from}::${type}::${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, type, source });
  }

  function ensureDecisionNode(decisionId) {
    const normalized = decisionId.toLowerCase();
    if (decisionNodes.has(normalized)) return decisionNodes.get(normalized);
    const id = `decision:${normalized}`;
    const node = {
      id,
      type: "decision",
      label: decisionId,
      path: `.memory/wiki/decisions.md#${normalized}`,
      shardId: null,
      metadata: {},
    };
    decisionNodes.set(normalized, id);
    nodes.push(node);
    nodesById.set(id, node);
    return id;
  }

  for (const node of nodes.filter((entry) => entry.path.startsWith(SPEC_ROOT_PREFIX))) {
    const { metadata } = node;
    for (const shard of metadata.dependsOn) {
      const target = iaByShard.get(shard);
      if (target) addEdge(node.id, target, "depends_on", "metadata");
      else lintIssues.push({ severity: "warning", code: "MISSING_DEPENDENCY_TARGET", message: `${node.path} references missing shard ${shard}`, path: node.path });
    }
    for (const shard of metadata.blocks) {
      const target = iaByShard.get(shard);
      if (target) addEdge(node.id, target, "blocks", "metadata");
    }
    for (const shard of metadata.splitFrom) {
      const target = iaByShard.get(shard);
      if (target) addEdge(node.id, target, "split_from", "metadata");
    }

    if (node.type === "be-spec" || node.type === "fe-spec") {
      for (const ref of metadata.iaSources) {
        let target = null;
        if (ref.path) {
          const normalizedPath = ref.path.startsWith("docs/")
            ? `.memory/wiki/specs/${ref.path.replace(/^docs\/plans\//, "")}`
            : join(node.path.replace(/\/[^/]+$/, ""), ref.path).replaceAll("\\", "/").replace(/^.*?(\.memory\/wiki\/specs\/)/, ".memory/wiki/specs/");
          target = nodesByPath.get(normalizedPath)?.id ?? null;
        }
        if (!target && ref.label) {
          const shard = (ref.label.match(/([0-9]{2}[a-z0-9]*)/i) || [])[1]?.toLowerCase();
          if (shard) target = iaByShard.get(shard) ?? null;
        }
        if (target) addEdge(node.id, target, "derives_from", "ia-source");
      }
    }

    if (node.type === "fe-spec") {
      const beTarget = node.shardId ? nodes.find((entry) => entry.type === "be-spec" && entry.shardId === node.shardId)?.id : null;
      if (beTarget) addEdge(node.id, beTarget, "implemented_by", "shard-match");
    }

    for (const phaseRef of metadata.phaseRefs) {
      const target = phaseBySlug.get(phaseRef.toLowerCase());
      if (target) addEdge(node.id, target, "phases_into", "phase-ref");
    }

    for (const decisionId of metadata.decisionRefs) {
      addEdge(node.id, ensureDecisionNode(decisionId), "constrained_by", "decision-ref");
    }

    for (const wikiTarget of metadata.wikiLinks) {
      const normalized = wikiTarget.endsWith(".md") ? wikiTarget : `${wikiTarget}.md`;
      const candidate = `.memory/wiki/${normalized.replace(/^\.memory\/wiki\//, "")}`;
      const target = nodesByPath.get(candidate)?.id;
      if (target) addEdge(node.id, target, "references", "wikilink");
    }
  }

  for (const node of nodes.filter((entry) => entry.type !== "decision")) {
    const degree = edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
    if (degree === 0) {
      lintIssues.push({ severity: "warning", code: "ORPHAN_SPEC", message: `${node.path} has no graph relationships`, path: node.path });
    }
  }

  const graph = {
    builtAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes: nodes.map(({ metadata, ...node }) => node),
    edges,
    stats: {
      byNodeType: nodes.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] ?? 0) + 1;
        return acc;
      }, {}),
      byEdgeType: edges.reduce((acc, edge) => {
        acc[edge.type] = (acc[edge.type] ?? 0) + 1;
        return acc;
      }, {}),
    },
  };

  writeJson(join(memoryRoot, "schema", "spec-graph.json"), graph);
  writeJson(join(memoryRoot, "schema", "spec-graph-lint.json"), { builtAt: graph.builtAt, issues: lintIssues });

  const nodesByIdFinal = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes.filter((entry) => entry.type !== "decision")) {
    const absolutePath = join(projectRoot, node.path);
    const text = getFileText(absolutePath, "");
    if (!text) continue;
    const section = buildRelatedSection(node, edges.filter((edge) => edge.from === node.id), nodesByIdFinal);
    setFileText(absolutePath, replaceRelatedSection(text, section));
  }

  const hubLines = [
    "# Spec Graph",
    "",
    `- **Nodes**: ${graph.nodeCount}`,
    `- **Edges**: ${graph.edgeCount}`,
    "",
    "## Relationship Chains",
    "",
  ];

  for (const iaNode of nodes.filter((node) => node.type === "ia-spec")) {
    const incoming = edges.filter((edge) => edge.to === iaNode.id && (edge.type === "derives_from" || edge.type === "depends_on"));
    if (incoming.length === 0) continue;
    hubLines.push(`### [[${toWikiTarget(iaNode.path)}|${iaNode.label}]]`);
    for (const edge of incoming) {
      const source = nodesByIdFinal.get(edge.from);
      if (!source) continue;
      hubLines.push(`- ${edge.type}: [[${toWikiTarget(source.path)}|${source.label}]]`);
    }
    hubLines.push("");
  }

  hubLines.push("## Orphans", "");
  for (const issue of lintIssues.filter((issue) => issue.code === "ORPHAN_SPEC")) {
    const orphan = nodes.find((node) => node.path === issue.path);
    if (orphan) hubLines.push(`- [[${toWikiTarget(orphan.path)}|${orphan.label}]]`);
  }
  hubLines.push("");
  setFileText(join(memoryRoot, "wiki", "hubs", "spec-graph.md"), `${hubLines.join("\n")}\n`);

  return {
    ok: true,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    lintIssues: lintIssues.length,
  };
}
