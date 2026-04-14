import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { ingestFile } from "../../pipeline/ingest.mjs";
import { getMemoryRoot, ensureDir, getFileText } from "../../pipeline/utils.mjs";

export async function memoryIngest(args = {}) {
  return ingestFile(args.path, args);
}

export async function memoryLogDaily(args = {}) {
  const memoryRoot = args.memoryRoot ?? getMemoryRoot();
  const day = (args.date ?? new Date().toISOString()).slice(0, 10);
  const filePath = join(memoryRoot, "raw", "daily", `${day}.md`);
  ensureDir(join(memoryRoot, "raw", "daily"));
  appendFileSync(filePath, `- ${args.text ?? ""}\n`, "utf8");
  return { ok: true, path: filePath };
}

export async function memoryGetActiveBlockers(args = {}) {
  const memoryRoot = args.memoryRoot ?? getMemoryRoot();
  const text = getFileText(join(memoryRoot, "wiki", "blockers.md"), "");
  const blockers = text
    .split("\n## ")
    .map((section) => section.trim())
    .filter(Boolean)
    .filter((section) => !section.toLowerCase().includes("resolved"));

  return {
    ok: true,
    count: blockers.length,
    blockers,
  };
}
