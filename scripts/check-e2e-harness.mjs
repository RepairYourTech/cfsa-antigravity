#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixtureRoot = mkdtempSync(join(tmpdir(), "cfsa-e2e-"));
const { compileMemory } = await import(join(root, "memory-src", "pipeline", "compile.mjs"));

function fail(message) {
  console.error(`[e2e-harness] FAIL: ${message}`);
  rmSync(fixtureRoot, { recursive: true, force: true });
  process.exit(1);
}

try {
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "ideation", "meta"), { recursive: true });
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "ia"), { recursive: true });
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "be"), { recursive: true });
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "fe"), { recursive: true });
  mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "phases"), { recursive: true });

  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "ideation", "ideation-index.md"), "# Ideation Index\n\n## Structural Classification\n\nTest\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "ideation", "meta", "constraints.md"), "# Constraints\n\n## Project Surfaces\n\n- web\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "ia", "index.md"), "# IA Index\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "ia", "00-auth.md"), "# IA Shard 00 Auth\n> **Blocks**: 01a\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "be", "index.md"), "# BE Index\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "be", "00-auth-be.md"), "# BE 00 Auth\n> **IA Source**: [00-auth.md](../../ia/00-auth.md)\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "fe", "index.md"), "# FE Index\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "fe", "00-auth-fe.md"), "# FE 00 Auth\n> **IA Source**: [00-auth.md](../../ia/00-auth.md)\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "phases", "phase-1.md"), "# Phase 1\n", "utf8");

  for (const required of [
    ".memory/wiki/specs/ideation/ideation-index.md",
    ".memory/wiki/specs/ideation/meta/constraints.md",
    ".memory/wiki/specs/ia/index.md",
    ".memory/wiki/specs/ia/00-auth.md",
    ".memory/wiki/specs/be/index.md",
    ".memory/wiki/specs/be/00-auth-be.md",
    ".memory/wiki/specs/fe/index.md",
    ".memory/wiki/specs/fe/00-auth-fe.md",
    ".memory/wiki/specs/phases/phase-1.md",
  ]) {
    if (!existsSync(join(fixtureRoot, required))) {
      fail(`Missing required vault-first path ${required}`);
    }
  }

  const compiled = compileMemory({ projectRoot: fixtureRoot });
  if (!compiled.ok || (compiled.specGraphNodes ?? 0) < 1 || (compiled.specGraphEdges ?? 0) < 1) {
    fail(`Compile did not emit graph outputs: ${JSON.stringify(compiled)}`);
  }

  const specGraphPath = join(fixtureRoot, ".memory", "schema", "spec-graph.json");
  const specGraphHubPath = join(fixtureRoot, ".memory", "wiki", "hubs", "spec-graph.md");
  if (!existsSync(specGraphPath) || !existsSync(specGraphHubPath)) {
    fail("Expected spec graph artifacts were not written");
  }

  const graph = JSON.parse(readFileSync(specGraphPath, "utf8"));
  if ((graph.edgeCount ?? 0) < 1) {
    fail(`Expected graph edges in ${specGraphPath}`);
  }

  console.log("[e2e-harness] PASS: vault-first pipeline roots can be scaffolded and compiled into spec graph artifacts");
  rmSync(fixtureRoot, { recursive: true, force: true });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
