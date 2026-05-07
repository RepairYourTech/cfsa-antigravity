#!/usr/bin/env node
// Cross-runtime progress consistency verifier.
//
// Reads `.memory/pipeline/progress/` and `.memory/pipeline/progress/spec-pipeline.md`
// and reports drift between slice files, phase files, the master index, and the
// spec-pipeline tracker. Exits non-zero on drift so it can be wired into hooks,
// CI, or session-start drift scans across all runtimes.
//
// Usage:
//   node scripts/check-progress-consistency.mjs            # current cwd
//   node scripts/check-progress-consistency.mjs --root DIR # explicit project root
//   node scripts/check-progress-consistency.mjs --json     # machine-readable
//   node scripts/check-progress-consistency.mjs --quiet    # only print on drift
//
// Exit codes:
//   0 = consistent (or no progress files yet — fresh project)
//   1 = drift detected
//   2 = malformed/unreadable progress files

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const rootArgIdx = args.indexOf("--root");
const ROOT = resolve(rootArgIdx >= 0 ? args[rootArgIdx + 1] : process.cwd());
const JSON_OUT = args.includes("--json");
const QUIET = args.includes("--quiet");

const PROGRESS_DIR = join(ROOT, ".memory", "pipeline", "progress");
const INDEX_PATH = join(PROGRESS_DIR, "index.md");
const SPEC_PIPELINE_PATH = join(PROGRESS_DIR, "spec-pipeline.md");
const PHASES_DIR = join(PROGRESS_DIR, "phases");
const SLICES_DIR = join(PROGRESS_DIR, "slices");

const drift = [];
const malformed = [];

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    malformed.push({ file: path, reason: `cannot read: ${err.message}` });
    return null;
  }
}

function listDir(path) {
  try {
    return readdirSync(path).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
}

// Fresh project: nothing to verify.
if (!existsSync(PROGRESS_DIR) || !existsSync(INDEX_PATH)) {
  if (!QUIET) {
    if (JSON_OUT) {
      process.stdout.write(JSON.stringify({ status: "no-progress", drift: [], malformed: [] }) + "\n");
    } else {
      process.stdout.write("No progress files yet — nothing to verify.\n");
    }
  }
  process.exit(0);
}

// ----- Parse phase files -----
// Each phase file has:
//   **Progress**: X/Y slices
//   - [x] **Slice N**: ...
//   - [/] **Slice N**: ...
//   - [ ] **Slice N**: ...
const SLICE_LINE_RE = /^\s*-\s*\[([ x/!])\]\s+\*\*Slice\s+(\d+)\*\*/i;
const PROGRESS_RE = /\*\*Progress\*\*:\s*(\d+)\s*\/\s*(\d+)/i;
const STATUS_RE = /\*\*Status\*\*:\s*(not-started|in-progress|complete|blocked)/i;

const phaseSummary = new Map(); // phase number → { declared, computed, statuses }

for (const fileName of listDir(PHASES_DIR)) {
  const m = fileName.match(/^phase-(\d+)\.md$/);
  if (!m) continue;
  const phaseNum = parseInt(m[1], 10);
  const text = read(join(PHASES_DIR, fileName));
  if (text == null) continue;

  const declared = (() => {
    const pm = text.match(PROGRESS_RE);
    return pm ? { done: parseInt(pm[1], 10), total: parseInt(pm[2], 10) } : null;
  })();

  const slices = new Map(); // slice num → checkbox char
  for (const line of text.split("\n")) {
    const sm = line.match(SLICE_LINE_RE);
    if (!sm) continue;
    slices.set(parseInt(sm[2], 10), sm[1]);
  }

  const computedDone = [...slices.values()].filter((c) => c === "x").length;
  const computedTotal = slices.size;

  if (!declared) {
    malformed.push({ file: fileName, reason: "missing **Progress**: X/Y header" });
  } else {
    if (declared.done !== computedDone) {
      drift.push({
        kind: "phase-fraction-mismatch",
        file: `phases/${fileName}`,
        message: `Header says ${declared.done}/${declared.total} done, but ${computedDone} slices are marked [x]`,
      });
    }
    if (declared.total !== computedTotal && computedTotal > 0) {
      drift.push({
        kind: "phase-total-mismatch",
        file: `phases/${fileName}`,
        message: `Header says total=${declared.total}, but ${computedTotal} **Slice N** entries found`,
      });
    }
  }

  phaseSummary.set(phaseNum, {
    declared,
    computedDone,
    computedTotal,
    slices,
    fileName,
  });
}

// ----- Cross-check slice files -----
// slices/phase-NN-slice-MM.md must agree with phase file's checkbox.
//   Status: complete  ⇔  [x] in phase file
//   Status: in-progress ⇔ [/] in phase file
const sliceFiles = listDir(SLICES_DIR);

for (const fileName of sliceFiles) {
  const m = fileName.match(/^phase-(\d+)-slice-(\d+)\.md$/);
  if (!m) {
    malformed.push({ file: `slices/${fileName}`, reason: "filename does not match phase-NN-slice-MM.md" });
    continue;
  }
  const phaseNum = parseInt(m[1], 10);
  const sliceNum = parseInt(m[2], 10);
  const text = read(join(SLICES_DIR, fileName));
  if (text == null) continue;

  const sm = text.match(STATUS_RE);
  if (!sm) {
    malformed.push({ file: `slices/${fileName}`, reason: "missing **Status**: line" });
    continue;
  }
  const sliceStatus = sm[1];

  const phase = phaseSummary.get(phaseNum);
  if (!phase) {
    drift.push({
      kind: "orphan-slice",
      file: `slices/${fileName}`,
      message: `Slice file references phase ${phaseNum} but phases/phase-${String(phaseNum).padStart(2, "0")}.md does not exist`,
    });
    continue;
  }

  const checkbox = phase.slices.get(sliceNum);
  if (checkbox === undefined) {
    drift.push({
      kind: "missing-slice-row",
      file: `slices/${fileName}`,
      message: `Slice file exists but phase file has no **Slice ${sliceNum}** row`,
    });
    continue;
  }

  const expected = sliceStatus === "complete" ? "x" : sliceStatus === "in-progress" ? "/" : sliceStatus === "blocked" ? "!" : " ";
  if (checkbox !== expected) {
    drift.push({
      kind: "slice-status-checkbox-mismatch",
      file: `slices/${fileName}`,
      message: `Slice file Status=${sliceStatus} but phase row checkbox=[${checkbox}] (expected [${expected}])`,
    });
  }

  // Depth ratio sanity (only enforce when slice is complete).
  if (sliceStatus === "complete") {
    const depthBlock = text.match(/##\s+Depth Ratio[\s\S]*?(?=\n##\s|$)/i);
    if (!depthBlock) {
      drift.push({
        kind: "missing-depth-ratio",
        file: `slices/${fileName}`,
        message: "Slice marked complete but no `## Depth Ratio` section recorded",
      });
    } else {
      const ratioMatch = depthBlock[0].match(/ratio[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
      if (ratioMatch && parseFloat(ratioMatch[1]) < 1.0) {
        drift.push({
          kind: "depth-ratio-below-floor",
          file: `slices/${fileName}`,
          message: `Slice marked complete but Depth Ratio = ${ratioMatch[1]} (must be >= 1.0)`,
        });
      }
    }
  }
}

// ----- Cross-check index.md -----
const indexText = read(INDEX_PATH);
if (indexText != null) {
  const overallMatch = indexText.match(/\*\*Overall\*\*:\s*(\d+)\s*\/\s*(\d+)/i);
  let totalDone = 0;
  let totalTotal = 0;
  for (const phase of phaseSummary.values()) {
    totalDone += phase.computedDone;
    totalTotal += phase.computedTotal;
  }
  if (!overallMatch) {
    malformed.push({ file: "index.md", reason: "missing **Overall**: X/Y line" });
  } else {
    const declaredDone = parseInt(overallMatch[1], 10);
    const declaredTotal = parseInt(overallMatch[2], 10);
    if (declaredDone !== totalDone) {
      drift.push({
        kind: "index-overall-done-mismatch",
        file: "index.md",
        message: `Overall says ${declaredDone} slices done, but phase files sum to ${totalDone}`,
      });
    }
    if (declaredTotal !== totalTotal && totalTotal > 0) {
      drift.push({
        kind: "index-overall-total-mismatch",
        file: "index.md",
        message: `Overall says total=${declaredTotal}, but phase files sum to ${totalTotal}`,
      });
    }
  }

  // Per-phase row in index table: "| Phase N: ... | status | X/Y | ..."
  const rowRe = /\|\s*Phase\s+(\d+)[^|]*\|\s*([a-z-]+)\s*\|\s*(\d+)\s*\/\s*(\d+)\s*\|/gi;
  let r;
  while ((r = rowRe.exec(indexText)) !== null) {
    const phaseNum = parseInt(r[1], 10);
    const indexStatus = r[2];
    const indexDone = parseInt(r[3], 10);
    const indexTotal = parseInt(r[4], 10);
    const phase = phaseSummary.get(phaseNum);
    if (!phase) {
      drift.push({
        kind: "index-row-orphan",
        file: "index.md",
        message: `index.md lists Phase ${phaseNum} but phases/phase-${String(phaseNum).padStart(2, "0")}.md does not exist`,
      });
      continue;
    }
    if (indexDone !== phase.computedDone || (phase.computedTotal > 0 && indexTotal !== phase.computedTotal)) {
      drift.push({
        kind: "index-row-fraction-mismatch",
        file: "index.md",
        message: `Phase ${phaseNum} row says ${indexDone}/${indexTotal} but phase file has ${phase.computedDone}/${phase.computedTotal}`,
      });
    }
    const phaseFileText = read(join(PHASES_DIR, phase.fileName));
    const phaseStatusMatch = phaseFileText && phaseFileText.match(STATUS_RE);
    if (phaseStatusMatch && phaseStatusMatch[1] !== indexStatus) {
      drift.push({
        kind: "index-row-status-mismatch",
        file: "index.md",
        message: `Phase ${phaseNum} row status=${indexStatus} but phase file status=${phaseStatusMatch[1]}`,
      });
    }
  }
}

// ----- Cross-check spec-pipeline.md (only that the file isn't truncated) -----
if (existsSync(SPEC_PIPELINE_PATH)) {
  const specText = read(SPEC_PIPELINE_PATH);
  if (specText && !/\|\s*[0-9]{2}\s*\|/.test(specText)) {
    malformed.push({
      file: "spec-pipeline.md",
      reason: "no shard rows found (expected | NN | shard-name | path | status | status | status |)",
    });
  }
}

// ----- Report -----
const status = malformed.length > 0 ? "malformed" : drift.length > 0 ? "drift" : "consistent";
const report = { status, drift, malformed, phases: [...phaseSummary.entries()].map(([n, p]) => ({ phase: n, done: p.computedDone, total: p.computedTotal })) };

if (JSON_OUT) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else if (status === "consistent") {
  if (!QUIET) process.stdout.write("Progress files consistent.\n");
} else {
  process.stdout.write(`Progress drift detected (status=${status}):\n`);
  for (const item of malformed) {
    process.stdout.write(`  [malformed] ${item.file}: ${item.reason}\n`);
  }
  for (const item of drift) {
    process.stdout.write(`  [${item.kind}] ${item.file}: ${item.message}\n`);
  }
  process.stdout.write(
    "\nResolution: re-run /implement-slice progress update (Protocol 3) for the affected slice, " +
      "or hand-edit the file noted above so the four targets (slice file, phase file, index.md, spec-pipeline.md) agree.\n",
  );
}

process.exit(status === "consistent" ? 0 : status === "drift" ? 1 : 2);
