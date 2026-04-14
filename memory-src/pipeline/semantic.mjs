import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ensureMemoryScaffold, getMemoryRoot, readJson, readJsonl, writeJson } from "./utils.mjs";

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function tokenSet(text) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function featureVector(tokens) {
  return {
    tokenCount: tokens.length,
    features: tokens.slice(0, 128),
  };
}

function jaccardScore(left, right) {
  const intersection = [...left].filter((value) => right.has(value)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function cosineApprox(left, right) {
  const a = new Set(left.features || []);
  const b = new Set(right.features || []);
  const intersection = [...a].filter((value) => b.has(value)).length;
  const denom = Math.sqrt(a.size || 1) * Math.sqrt(b.size || 1);
  return denom === 0 ? 0 : intersection / denom;
}

function semanticIndexPath(memoryRoot) {
  return join(memoryRoot, "schema", "semantic-index.json");
}

function semanticManifestPath(memoryRoot) {
  return join(memoryRoot, "schema", "semantic-manifest.json");
}

function semanticConfigPath(memoryRoot) {
  return join(memoryRoot, "config.json");
}

function pythonBackendPath(memoryRoot) {
  return join(memoryRoot, "pipeline", "semantic_backend.py");
}

function pythonBackendAvailable(memoryRoot) {
  return existsSync(pythonBackendPath(memoryRoot));
}

function currentConfig(memoryRoot) {
  return readJson(semanticConfigPath(memoryRoot), {});
}

function currentIndex(memoryRoot) {
  return readJson(semanticIndexPath(memoryRoot), { entries: [] });
}

function enabled(config) {
  return Boolean(config.semantic?.enabled);
}

function preferredBackend(config, memoryRoot) {
  const configured = config.semantic?.backend ?? "local-cosine";
  if (configured === "fastembed-sqlite-vec" && !pythonBackendAvailable(memoryRoot)) {
    return "local-cosine";
  }
  return configured;
}

function backendCapabilities(backend) {
  return {
    semantic: true,
    vectorLike: backend === "local-cosine" || backend === "fastembed-sqlite-vec",
    localOnly: backend.startsWith("local-"),
  };
}

function note(config, memoryRoot) {
  const mode = preferredBackend(config, memoryRoot);
  if (config.semantic?.backend === "fastembed-sqlite-vec" && !pythonBackendAvailable(memoryRoot)) {
    return "Configured vector backend is unavailable; falling back to local-cosine.";
  }
  return mode === "local-cosine"
    ? "Semantic retrieval is enabled using a local token-vector cosine approximation backend."
    : "Semantic retrieval is enabled using the configured vector backend.";
}

export function semanticCapabilities(options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);
  const config = currentConfig(memoryRoot);
  const index = currentIndex(memoryRoot);
  return {
    ok: true,
    enabled: enabled(config),
    backend: enabled(config) ? preferredBackend(config, memoryRoot) : null,
    embeddingModel: config.semantic?.embeddingModel ?? null,
    entries: index.entries?.length ?? 0,
    summary: {
      backend: enabled(config) ? preferredBackend(config, memoryRoot) : null,
      embeddingModel: config.semantic?.embeddingModel ?? null,
      entries: index.entries?.length ?? 0,
      capabilities: enabled(config) ? backendCapabilities(preferredBackend(config, memoryRoot)) : null,
      pythonBackend: {
        available: pythonBackendAvailable(memoryRoot),
        path: pythonBackendPath(memoryRoot),
      },
    },
    note: enabled(config)
      ? note(config, memoryRoot)
      : "Semantic retrieval is not enabled; index-guided retrieval remains active.",
  };
}

export function enableSemanticConfig(options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);
  const current = currentConfig(memoryRoot);
  const next = {
    ...current,
    semantic: {
      enabled: true,
      backend: options.backend ?? "fastembed-sqlite-vec",
      embeddingModel: options.embeddingModel ?? "all-MiniLM-L6-v2",
    },
  };
  writeJson(semanticConfigPath(memoryRoot), next);
  return { ok: true, config: next, note: note(next, memoryRoot) };
}

export function buildSemanticIndex(options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);
  const config = currentConfig(memoryRoot);
  const chunks = readJsonl(join(memoryRoot, "schema", "chunks.jsonl"));
  const entries = chunks.map((entry) => {
    const tokens = [...tokenSet(entry.text)];
    return {
      id: entry.id,
      parentId: entry.parentId,
      path: entry.path,
      hash: hashText(entry.text),
      tokens,
      vector: featureVector(tokens),
      text: entry.text,
    };
  });
  writeJson(semanticIndexPath(memoryRoot), { builtAt: new Date().toISOString(), entries });
  writeJson(semanticManifestPath(memoryRoot), {
    builtAt: new Date().toISOString(),
    backend: preferredBackend(config, memoryRoot),
    embeddingModel: config.semantic?.embeddingModel ?? null,
    entryCount: entries.length,
    pythonBackend: {
      available: pythonBackendAvailable(memoryRoot),
      path: pythonBackendPath(memoryRoot),
    },
  });
  return { ok: true, count: entries.length, backend: preferredBackend(config, memoryRoot) };
}

export function semanticQuery(query, options = {}) {
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(options.projectRoot);
  ensureMemoryScaffold(memoryRoot);
  const config = currentConfig(memoryRoot);
  const backend = preferredBackend(config, memoryRoot);
  const index = currentIndex(memoryRoot);
  const queryTokens = tokenSet(query);
  const queryVector = featureVector([...queryTokens]);
  const results = (index.entries ?? [])
    .map((entry) => {
      const score = backend === "local-cosine"
        ? cosineApprox(queryVector, entry.vector || featureVector(entry.tokens || []))
        : jaccardScore(queryTokens, new Set(entry.tokens || []));
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, options.limit ?? 5);

  return { ok: true, query, backend, count: results.length, results };
}
