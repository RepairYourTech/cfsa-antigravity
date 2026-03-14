#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, exit, cwd } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATE_DIR = resolve(__dirname, "..", "template");
const PKG = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf-8"));

// --- Colors (when TTY) ---
const isTTY = process.stdout.isTTY;
const c = {
    reset: isTTY ? "\x1b[0m" : "",
    bold: isTTY ? "\x1b[1m" : "",
    dim: isTTY ? "\x1b[2m" : "",
    green: isTTY ? "\x1b[32m" : "",
    yellow: isTTY ? "\x1b[33m" : "",
    red: isTTY ? "\x1b[31m" : "",
    cyan: isTTY ? "\x1b[36m" : "",
    magenta: isTTY ? "\x1b[35m" : "",
};

// --- Logging ---
let QUIET = false;
const log = (msg) => { if (!QUIET) console.log(msg); };
const info = (msg) => log(`${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => log(`${c.yellow}⚠${c.reset} ${msg}`);
const error = (msg) => { console.error(`${c.red}✗${c.reset} ${msg}`); };

// --- Usage ---
function usage() {
    log(`
${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}
${c.dim}Constraint-First Specification Architecture for AI agents${c.reset}

${c.bold}Usage:${c.reset}
  cfsa-antigravity ${c.cyan}<command>${c.reset} [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}init${c.reset}      Install the CFSA pipeline into your project
  ${c.cyan}status${c.reset}    Check installation status
  ${c.cyan}version${c.reset}   Show version

${c.bold}Init Options:${c.reset}
  --force       Overwrite existing .agent/ folder
  --path <dir>  Install into specific directory (default: current directory)
  --dry-run     Preview what would be copied without making changes
  --quiet       Suppress output (for CI/CD)

${c.bold}Examples:${c.reset}
  ${c.dim}# Install into current project${c.reset}
  npx cfsa-antigravity init

  ${c.dim}# Install into a specific directory${c.reset}
  npx cfsa-antigravity init --path ./my-project

  ${c.dim}# Preview what will be installed${c.reset}
  npx cfsa-antigravity init --dry-run

  ${c.dim}# Overwrite existing installation${c.reset}
  npx cfsa-antigravity init --force
`);
}

// --- Parse Arguments ---
function parseArgs(args) {
    const parsed = { command: null, force: false, dryRun: false, path: null, quiet: false };

    let i = 0;
    while (i < args.length) {
        const arg = args[i];
        switch (arg) {
            case "init":
            case "status":
            case "version":
            case "help":
            case "--help":
            case "-h":
                parsed.command = arg === "--help" || arg === "-h" || arg === "help" ? "help" : arg;
                break;
            case "--force":
            case "-f":
                parsed.force = true;
                break;
            case "--dry-run":
            case "-n":
                parsed.dryRun = true;
                break;
            case "--quiet":
            case "-q":
                parsed.quiet = true;
                break;
            case "--path":
            case "-p":
                i++;
                parsed.path = args[i];
                if (!parsed.path) {
                    error("--path requires a directory argument");
                    exit(1);
                }
                break;
            case "--version":
            case "-v":
                parsed.command = "version";
                break;
            default:
                if (arg.startsWith("-")) {
                    error(`Unknown option: ${arg}`);
                    usage();
                    exit(1);
                }
                // Treat first positional as command if not set
                if (!parsed.command) {
                    parsed.command = arg;
                }
                break;
        }
        i++;
    }

    return parsed;
}

// --- Count files recursively ---
function countFiles(dir) {
    let count = 0;
    if (!existsSync(dir)) return 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            count += countFiles(join(dir, entry.name));
        } else {
            count++;
        }
    }
    return count;
}

// --- List top-level items to copy ---
function getTemplateItems() {
    if (!existsSync(TEMPLATE_DIR)) {
        error("Template directory not found. Package may be corrupted.");
        error(`Expected: ${TEMPLATE_DIR}`);
        exit(1);
    }
    return readdirSync(TEMPLATE_DIR, { withFileTypes: true });
}

// --- Init Command ---
function cmdInit(opts) {
    const targetDir = resolve(opts.path || cwd());

    log("");
    log(`${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}`);
    log(`${c.dim}Installing into: ${targetDir}${c.reset}`);
    log("");

    // Check if target directory exists
    if (!existsSync(targetDir)) {
        if (opts.dryRun) {
            warn(`Directory does not exist: ${targetDir} (would create)`);
        } else {
            mkdirSync(targetDir, { recursive: true });
            info(`Created directory: ${targetDir}`);
        }
    }

    const items = getTemplateItems();
    let copied = 0;
    let skipped = 0;
    const copiedPaths = [];
    const skippedPaths = [];

    for (const item of items) {
        const src = join(TEMPLATE_DIR, item.name);
        const dest = join(targetDir, item.name);

        if (existsSync(dest) && !opts.force) {
            const fileCount = item.isDirectory() ? countFiles(src) : 1;
            skipped += fileCount;
            skippedPaths.push(item.name);
            warn(`Skipped ${c.bold}${item.name}${c.reset} (already exists — use --force to overwrite)`);
            continue;
        }

        if (opts.dryRun) {
            const fileCount = item.isDirectory() ? countFiles(src) : 1;
            copied += fileCount;
            copiedPaths.push(item.name);
            info(`Would copy ${c.bold}${item.name}${c.reset} (${fileCount} files)`);
            continue;
        }

        // Copy
        if (item.isDirectory()) {
            cpSync(src, dest, { recursive: true, force: opts.force });
        } else {
            const destDir = dirname(dest);
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            cpSync(src, dest, { force: opts.force });
        }

        const fileCount = item.isDirectory() ? countFiles(dest) : 1;
        copied += fileCount;
        copiedPaths.push(item.name);
        info(`Copied ${c.bold}${item.name}${c.reset} (${fileCount} files)`);
    }

    // Summary
    log("");
    if (opts.dryRun) {
        log(`${c.bold}Dry run complete:${c.reset} ${copied} files would be copied, ${skipped} skipped`);
    } else if (copied > 0) {
        log(`${c.bold}${c.green}Installation complete!${c.reset} ${copied} files copied, ${skipped} skipped`);
        log("");
        log(`${c.bold}Next steps:${c.reset}`);
        log(`  1. Open your project in an AI editor (Antigravity, Cursor, etc.)`);
        log(`  2. Run ${c.cyan}/ideate${c.reset} to start the pipeline`);
        log("");
        log(`${c.dim}Documentation: https://github.com/RepairYourTech/cfsa-antigravity${c.reset}`);
    } else {
        warn("Nothing was copied. All files already exist.");
        log(`  Use ${c.cyan}--force${c.reset} to overwrite existing files.`);
    }
    log("");
}

// --- Status Command ---
function cmdStatus() {
    const targetDir = cwd();
    const agentDir = join(targetDir, ".agent");

    log("");
    log(`${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}`);
    log(`${c.dim}Checking: ${targetDir}${c.reset}`);
    log("");

    if (!existsSync(agentDir)) {
        warn("Not installed — .agent/ directory not found");
        log(`  Run ${c.cyan}cfsa-antigravity init${c.reset} to install`);
        log("");
        exit(1);
    }

    info(".agent/ directory found");

    const checks = [
        { path: ".agent/workflows", label: "Workflows" },
        { path: ".agent/skills", label: "Skills" },
        { path: ".agent/skill-library", label: "Skill Library" },
        { path: ".agent/instructions", label: "Instructions" },
        { path: ".agent/rules", label: "Rules" },
        { path: "docs/plans", label: "Plans directory" },
        { path: "GEMINI.md", label: "GEMINI.md" },
        { path: "AGENTS.md", label: "AGENTS.md" },
    ];

    let installed = 0;
    let missing = 0;

    for (const check of checks) {
        const fullPath = join(targetDir, check.path);
        if (existsSync(fullPath)) {
            const isDir = statSync(fullPath).isDirectory();
            const detail = isDir ? `${countFiles(fullPath)} files` : "present";
            info(`${check.label} ${c.dim}(${detail})${c.reset}`);
            installed++;
        } else {
            warn(`${check.label} — missing`);
            missing++;
        }
    }

    log("");
    log(`${c.bold}Status:${c.reset} ${installed} components found, ${missing} missing`);

    // Check for unfilled placeholders in GEMINI.md
    const geminiPath = join(targetDir, "GEMINI.md");
    if (existsSync(geminiPath)) {
        const content = readFileSync(geminiPath, "utf-8");
        const placeholders = content.match(/\{\{[A-Z_]+\}\}/g);
        if (placeholders) {
            const unique = [...new Set(placeholders)];
            log("");
            warn(`${unique.length} unfilled placeholder(s) in GEMINI.md — run /create-prd to fill them`);
            for (const p of unique.slice(0, 5)) {
                log(`  ${c.dim}${p}${c.reset}`);
            }
            if (unique.length > 5) {
                log(`  ${c.dim}... and ${unique.length - 5} more${c.reset}`);
            }
        } else {
            info("GEMINI.md — all placeholders filled");
        }
    }

    log("");
}

// --- Main ---
const args = parseArgs(argv.slice(2));
QUIET = args.quiet;

switch (args.command) {
    case "init":
        cmdInit(args);
        break;
    case "status":
        cmdStatus();
        break;
    case "version":
        log(PKG.version);
        break;
    case "help":
    case null:
        usage();
        break;
    default:
        error(`Unknown command: ${args.command}`);
        usage();
        exit(1);
}
