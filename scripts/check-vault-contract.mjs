#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const runtimeRoots = [
  join(root, ".agent"),
  join(root, ".claude"),
  join(root, ".factory"),
];

const legacyNeedles = ["docs/plans/", "docs/audits/"];
const requiredNeedle = ".memory/wiki/specs/";
const workflowDirs = [
  join(root, ".agent", "workflows"),
  join(root, ".claude", "skills"),
  join(root, ".factory", "skills"),
];

function listFilesRecursively(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursively(p));
    else out.push(p);
  }
  return out;
}

function fail(message) {
  console.error(`[vault-contract] FAIL: ${message}`);
  process.exit(1);
}

const runtimeFiles = runtimeRoots.flatMap((dir) => listFilesRecursively(dir)).filter((p) => p.endsWith('.md'));
for (const file of runtimeFiles) {
  const text = readFileSync(file, 'utf8');
  for (const needle of legacyNeedles) {
    if (text.includes(needle)) {
      fail(`${file} still references legacy path ${needle}`);
    }
  }
}

const workflowFiles = workflowDirs.flatMap((dir) => listFilesRecursively(dir)).filter((p) => p.endsWith('.md'));
const matched = workflowFiles.filter((file) => readFileSync(file, 'utf8').includes(requiredNeedle));
if (matched.length < 20) {
  fail(`Too few workflow/skill files reference ${requiredNeedle}: ${matched.length}`);
}

console.log(`[vault-contract] PASS: no legacy docs paths in runtime trees; ${matched.length} workflow/skill files reference ${requiredNeedle}`);
