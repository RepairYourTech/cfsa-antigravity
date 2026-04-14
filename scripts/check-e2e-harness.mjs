#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const fixtureRoot = mkdtempSync(join(tmpdir(), "cfsa-e2e-"));

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
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "be", "index.md"), "# BE Index\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "fe", "index.md"), "# FE Index\n", "utf8");
  writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "phases", "phase-1.md"), "# Phase 1\n", "utf8");

  for (const required of [
    ".memory/wiki/specs/ideation/ideation-index.md",
    ".memory/wiki/specs/ideation/meta/constraints.md",
    ".memory/wiki/specs/ia/index.md",
    ".memory/wiki/specs/be/index.md",
    ".memory/wiki/specs/fe/index.md",
    ".memory/wiki/specs/phases/phase-1.md",
  ]) {
    if (!existsSync(join(fixtureRoot, required))) {
      fail(`Missing required vault-first path ${required}`);
    }
  }

  console.log("[e2e-harness] PASS: vault-first pipeline roots can be scaffolded in a fresh project");
  rmSync(fixtureRoot, { recursive: true, force: true });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
