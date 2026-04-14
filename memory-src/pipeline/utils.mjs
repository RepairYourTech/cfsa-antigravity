import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export function getProjectRoot(start = process.cwd()) {
  return resolve(start);
}

export function getMemoryRoot(start = process.cwd()) {
  return resolve(getProjectRoot(start), ".memory");
}

export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function writeJson(filePath, value) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function appendJsonl(filePath, value) {
  ensureDir(dirname(filePath));
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function readJsonl(filePath) {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function ensureMemoryScaffold(memoryRoot = getMemoryRoot()) {
  const directories = [
    "raw",
    "raw/sessions",
    "raw/events",
    "raw/daily",
    "wiki",
    "wiki/knowledge",
    "schema",
    "pipeline",
    "mcp-server",
    "hooks",
    "migrate",
  ];

  for (const directory of directories) {
    ensureDir(join(memoryRoot, directory));
  }

  const markdownFiles = {
    [join(memoryRoot, "wiki", "index.md")]: "# Memory Index\n\n## Knowledge\n\n",
    [join(memoryRoot, "wiki", "patterns.md")]: "# Patterns\n\n",
    [join(memoryRoot, "wiki", "decisions.md")]: "# Decisions\n\n",
    [join(memoryRoot, "wiki", "blockers.md")]: "# Blockers\n\n",
  };

  for (const [filePath, content] of Object.entries(markdownFiles)) {
    if (!existsSync(filePath)) {
      writeFileSync(filePath, content, "utf8");
    }
  }

  const configPath = join(memoryRoot, "config.json");
  if (!existsSync(configPath)) {
    writeJson(configPath, {
      version: 1,
      backend: "jsonl",
      retrieval: "index-guided",
      agents: ["claude", "gemini", "factory", "codex"],
    });
  }
}

export function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "entry";
}

export function listFilesRecursively(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(entryPath));
      continue;
    }
    files.push(entryPath);
  }
  return files;
}

export function fileExists(filePath) {
  return existsSync(filePath);
}

export function getFileText(filePath, fallback = "") {
  if (!existsSync(filePath)) {
    return fallback;
  }
  return readFileSync(filePath, "utf8");
}

export function setFileText(filePath, content) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf8");
}

export function copyFile(sourcePath, destinationPath) {
  ensureDir(dirname(destinationPath));
  copyFileSync(sourcePath, destinationPath);
}

export function toRelativePath(projectRoot, absolutePath) {
  return relative(projectRoot, absolutePath).replaceAll("\\", "/");
}

export function isDirectory(filePath) {
  return existsSync(filePath) && statSync(filePath).isDirectory();
}

export function chunkText(text, maxLength = 500) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks = [];
  let current = "";
  for (const sentence of normalized.split(/(?<=[.!?])\s+/)) {
    if (!sentence) {
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = sentence;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function scoreText(text, query) {
  const haystack = text.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) {
    return {};
  }

  const endIndex = text.indexOf("\n---", 4);
  if (endIndex === -1) {
    return {};
  }

  return text.slice(4, endIndex)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return acc;
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
      acc[key] = value;
      return acc;
    }, {});
}
