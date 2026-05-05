import { join } from "node:path";
import { ensureDir, fileExists, getFileText, getMemoryRoot, getProjectRoot, listFilesRecursively, setFileText, slugify, toRelativePath } from "./utils.mjs";

function graphBucket(relativeSpecPath) {
  if (relativeSpecPath.startsWith(".memory/wiki/specs/ia/")) return { bucket: "spec-mirrors/ia", type: "ia-spec" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/be/")) return { bucket: "spec-mirrors/be", type: "be-spec" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/fe/")) return { bucket: "spec-mirrors/fe", type: "fe-spec" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/phases/")) return { bucket: "phases", type: "phase-plan" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/ideation/")) return { bucket: "ideation", type: "ideation" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/audits/")) return { bucket: "audits", type: "audit" };
  if (relativeSpecPath.startsWith(".memory/wiki/specs/architecture/")) return { bucket: "architecture", type: "architecture" };
  return { bucket: "plans", type: "plan" };
}

function titleFromPath(relativeSpecPath) {
  return relativeSpecPath
    .replace(/^\.memory\/wiki\/specs\//, "")
    .replace(/\.md$/, "")
    .split("/")
    .map((segment) => segment.replace(/[-_]/g, " "))
    .join(" / ");
}

function graphNotePath(memoryRoot, relativeSpecPath, bucket) {
  const stripped = relativeSpecPath.replace(/^\.memory\/wiki\/specs\//, "").replace(/\.md$/, "");
  return join(memoryRoot, "wiki", bucket, `${slugify(stripped)}.md`);
}

function buildGraphNote({ relativeSpecPath, sourceText, type, bucket }) {
  const title = titleFromPath(relativeSpecPath);
  const related = [];
  const normalized = relativeSpecPath.toLowerCase();
  if (normalized.includes("phase")) related.push("[[../../index|Memory Index]]");
  if (normalized.includes("ia/")) related.push("[[../../index|Memory Index]]", "[[../be|BE Specs]]", "[[../fe|FE Specs]]");
  if (normalized.includes("be/")) related.push("[[../../index|Memory Index]]", "[[../ia|IA Specs]]", "[[../fe|FE Specs]]");
  if (normalized.includes("fe/")) related.push("[[../../index|Memory Index]]", "[[../ia|IA Specs]]", "[[../be|BE Specs]]");

  return [
    "---",
    `type: ${type}`,
    `source: ${relativeSpecPath}`,
    "vault_primary: true",
    "---",
    "",
    `# ${title}`,
    "",
    `- **Source of truth**: [${relativeSpecPath}](../../${relativeSpecPath})`,
    `- **Vault bucket**: ${bucket}`,
    related.length > 0 ? `- **Related**: ${related.join(", ")}` : null,
    "",
    "## Summary",
    "",
    sourceText.trim().split("\n").slice(0, 20).join("\n"),
    "",
    "## Full Source Mirror",
    "",
    "```markdown",
    sourceText.trim(),
    "```",
    "",
  ].filter(Boolean).join("\n");
}

export function mirrorPlansIntoVault(options = {}) {
  const projectRoot = options.projectRoot ?? getProjectRoot();
  const memoryRoot = options.memoryRoot ?? getMemoryRoot(projectRoot);
  const specsRoot = join(projectRoot, ".memory", "wiki", "specs");
  if (!fileExists(specsRoot)) {
    return { ok: true, mirroredCount: 0, mirrored: [] };
  }

  const sourceFiles = listFilesRecursively(specsRoot)
    .filter((filePath) => filePath.endsWith(".md"))
    .filter((filePath) => !filePath.endsWith("README.md"))
    .filter((filePath) => !filePath.endsWith(".gitkeep"));

  const mirrored = [];
  for (const sourceFile of sourceFiles) {
    const relativeSpecPath = toRelativePath(projectRoot, sourceFile);
    const { bucket, type } = graphBucket(relativeSpecPath);
    const sourceText = getFileText(sourceFile, "");
    if (!sourceText.trim()) {
      continue;
    }

    const destinationPath = graphNotePath(memoryRoot, relativeSpecPath, bucket);
    ensureDir(join(memoryRoot, "wiki", bucket));
    setFileText(destinationPath, buildGraphNote({ relativeSpecPath, sourceText, type, bucket }));

    mirrored.push({
      source: relativeSpecPath,
      destination: toRelativePath(projectRoot, destinationPath),
      type,
    });
  }

  return {
    ok: true,
    mirroredCount: mirrored.length,
    mirrored,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(mirrorPlansIntoVault(), null, 2));
}
