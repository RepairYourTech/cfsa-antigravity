#!/usr/bin/env node

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { migrateLegacyMemory } from "../memory-src/migrate/migrate-legacy.mjs";

const fixtureRoot = mkdtempSync(join(tmpdir(), "cfsa-memory-migrate-"));

function fail(message) {
  console.error(`[memory-migration] FAIL: ${message}`);
  rmSync(fixtureRoot, { recursive: true, force: true });
  process.exit(1);
}

try {
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "knowledge"), { recursive: true });
  mkdirSync(join(fixtureRoot, ".agent", "progress", "memory"), { recursive: true });

  const destination = join(fixtureRoot, ".memory", "wiki", "knowledge", "agent-progress-patterns.md");
  writeFileSync(destination, "existing canonical content\n", "utf8");
  writeFileSync(join(fixtureRoot, ".agent", "progress", "memory", "patterns.md"), "# Patterns\n\nlegacy pattern fixture\n", "utf8");

  const result = migrateLegacyMemory({ projectRoot: fixtureRoot });
  if (result.conflictCount !== 1) {
    fail(`Expected exactly one conflict, got ${result.conflictCount}`);
  }

  const conflictPath = join(fixtureRoot, ".memory", "wiki", "knowledge", `agent-progress-patterns.conflict-${new Date().toISOString().slice(0, 10)}.md`);
  if (!existsSync(conflictPath)) {
    fail(`Expected conflict file at ${conflictPath}`);
  }

  console.log("[memory-migration] PASS: conflict file emitted for legacy knowledge collision");
  rmSync(fixtureRoot, { recursive: true, force: true });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
