#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, statSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { argv, exit, cwd } from "node:process";
import { createInterface } from "node:readline";

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
    white: isTTY ? "\x1b[37m" : "",
};

// --- Logging ---
let QUIET = false;
const log = (msg) => { if (!QUIET) console.log(msg); };
const info = (msg) => log(`${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => log(`${c.yellow}⚠${c.reset} ${msg}`);
const error = (msg) => { console.error(`${c.red}✗${c.reset} ${msg}`); };

// --- Runtime display names (fallback to directory name for unknown runtimes) ---
const RUNTIME_DISPLAY = {
    ".agent":   { name: "Antigravity",   desc: "Antigravity, Cursor, Codex, Gemini CLI" },
    ".claude":  { name: "Claude Code",   desc: "Standalone Claude Code runtime" },
    ".factory": { name: "Factory Droid", desc: "Standalone Factory Droid runtime" },
};

// --- Discover available runtimes from template/ ---
function discoverRuntimes() {
    if (!existsSync(TEMPLATE_DIR)) return [];
    return readdirSync(TEMPLATE_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith(".") && existsSync(join(TEMPLATE_DIR, e.name, "kit-sync.md")))
        .map(e => {
            const meta = RUNTIME_DISPLAY[e.name];
            return {
                dir: e.name,
                name: meta?.name || e.name.replace(/^\./, ""),
                desc: meta?.desc || "",
                files: countFiles(join(TEMPLATE_DIR, e.name)),
            };
        })
        .sort((a, b) => a.dir.localeCompare(b.dir));
}

// --- Interactive multi-select TUI ---
function multiSelect(runtimes) {
    return new Promise((resolve, reject) => {
        if (!isTTY || !process.stdin.setRawMode) {
            reject(new Error("Interactive mode requires a TTY. Use --agent to specify runtimes."));
            return;
        }

        const selected = new Set();
        let cursor = 0;
        const stdin = process.stdin;

        function render() {
            // Move cursor to start and clear
            process.stdout.write(`\x1b[${runtimes.length + 2}A\x1b[J`);
            draw();
        }

        function draw() {
            log(`${c.bold}Select agent runtimes to install:${c.reset}  ${c.dim}(multiple allowed)${c.reset}`);
            log("");
            for (let i = 0; i < runtimes.length; i++) {
                const rt = runtimes[i];
                const isCur = i === cursor;
                const isSel = selected.has(i);
                const pointer = isCur ? `${c.cyan}>${c.reset}` : " ";
                const check = isSel ? `${c.green}●${c.reset}` : `${c.dim}○${c.reset}`;
                const name = isCur ? `${c.bold}${c.white}${rt.name}${c.reset}` : rt.name;
                const dir = `${c.dim}${rt.dir}/${c.reset}`;
                const desc = rt.desc ? `  ${c.dim}${rt.desc}${c.reset}` : "";
                const files = `${c.dim}(${rt.files} files)${c.reset}`;
                log(`  ${pointer} ${check} ${name.padEnd(isCur ? 33 : 20)} ${dir.padEnd(isCur ? 26 : 22)} ${files}${desc}`);
            }
            log("");
            log(`  ${c.dim}↑↓${c.reset} move  ${c.dim}space${c.reset} toggle  ${c.dim}a${c.reset} all  ${c.dim}enter${c.reset} confirm  ${c.dim}q${c.reset} quit`);
        }

        // Initial draw
        draw();

        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf-8");

        function cleanup() {
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener("data", onKey);
        }

        function onKey(key) {
            // Ctrl+C
            if (key === "\x03") {
                cleanup();
                log("\nAborted.");
                exit(0);
            }
            // q
            if (key === "q") {
                cleanup();
                log("\nAborted.");
                exit(0);
            }
            // Enter
            if (key === "\r" || key === "\n") {
                cleanup();
                if (selected.size === 0) {
                    render();
                    log(`\n${c.yellow}⚠${c.reset} Select at least one runtime.`);
                    stdin.setRawMode(true);
                    stdin.resume();
                    stdin.on("data", onKey);
                    return;
                }
                const result = [...selected].sort().map(i => runtimes[i]);
                resolve(result);
                return;
            }
            // Space — toggle
            if (key === " ") {
                if (selected.has(cursor)) {
                    selected.delete(cursor);
                } else {
                    selected.add(cursor);
                }
                render();
                return;
            }
            // a — toggle all
            if (key === "a") {
                if (selected.size === runtimes.length) {
                    selected.clear();
                } else {
                    for (let i = 0; i < runtimes.length; i++) selected.add(i);
                }
                render();
                return;
            }
            // Arrow keys (escape sequences)
            if (key === "\x1b[A" || key === "k") { // Up
                cursor = (cursor - 1 + runtimes.length) % runtimes.length;
                render();
                return;
            }
            if (key === "\x1b[B" || key === "j") { // Down
                cursor = (cursor + 1) % runtimes.length;
                render();
                return;
            }
        }

        stdin.on("data", onKey);
    });
}

// --- Usage ---
function usage() {
    const runtimes = discoverRuntimes();
    const rtList = runtimes.map(r => r.dir.replace(/^\./, "")).join(", ");

    log(`
${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}
${c.dim}Constraint-First Specification Architecture for AI agents${c.reset}

${c.bold}Usage:${c.reset}
  cfsa-antigravity ${c.cyan}<command>${c.reset} [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}init${c.reset}      Install the CFSA pipeline into your project
  ${c.cyan}status${c.reset}    Check installation status
  ${c.cyan}version${c.reset}   Show version

${c.bold}Status Options:${c.reset}
  --json          Output machine-readable status JSON

${c.bold}Init Options:${c.reset}
  --agent <list>      Comma-separated runtimes for non-interactive install (${rtList})
  --force             Overwrite existing agent folders
  --path <dir>        Install into specific directory (default: current directory)
  --dry-run           Preview what would be copied without making changes
  --quiet             Suppress output (for CI/CD — installs all runtimes)
  --memory            Scaffold unified .memory/ and MCP integration
  --migrate-memory    Scaffold .memory/ and migrate legacy runtime memory

${c.bold}Examples:${c.reset}
  ${c.dim}# Interactive — pick which runtimes to install${c.reset}
  npx cfsa-antigravity init

  ${c.dim}# Non-interactive — install specific runtimes${c.reset}
  npx cfsa-antigravity init --agent claude,factory

  ${c.dim}# Install a single runtime${c.reset}
  npx cfsa-antigravity init --agent factory

  ${c.dim}# Install into a specific directory${c.reset}
  npx cfsa-antigravity init --agent claude --path ./my-project

  ${c.dim}# Preview what will be installed${c.reset}
  npx cfsa-antigravity init --dry-run

  ${c.dim}# Overwrite existing installation${c.reset}
  npx cfsa-antigravity init --force
`);
}

// --- Parse Arguments ---
function parseArgs(args) {
    const parsed = { command: null, agents: null, force: false, dryRun: false, path: null, quiet: false, memory: false, migrateMemory: false, json: false };

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
            case "--agent":
            case "-a":
                i++;
                if (!args[i]) {
                    error("--agent requires a comma-separated list of runtimes");
                    exit(1);
                }
                parsed.agents = args[i].split(",").map(s => s.trim()).filter(Boolean);
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
            case "--memory":
                parsed.memory = true;
                break;
            case "--migrate-memory":
                parsed.memory = true;
                parsed.migrateMemory = true;
                break;
            case "--json":
                parsed.json = true;
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

// --- Ensure template exists ---
function ensureTemplateDir() {
    if (!existsSync(TEMPLATE_DIR)) {
        error("Template directory not found. Package may be corrupted.");
        error(`Expected: ${TEMPLATE_DIR}`);
        exit(1);
    }
}

// --- Resolve agent names to runtime directories ---
function resolveAgentNames(agentNames, available) {
    const resolved = [];
    for (const name of agentNames) {
        // Try exact dir match first (.agent, .claude, .factory)
        const dotName = name.startsWith(".") ? name : `.${name}`;
        const match = available.find(r => r.dir === dotName);
        if (match) {
            resolved.push(match);
            continue;
        }
        // Try display name match (case-insensitive)
        const byName = available.find(r => r.name.toLowerCase() === name.toLowerCase());
        if (byName) {
            resolved.push(byName);
            continue;
        }
        // Legacy single-agent names: "antigravity" / "codex" → .agent
        if (name === "antigravity" || name === "codex") {
            const agentRt = available.find(r => r.dir === ".agent");
            if (agentRt && !resolved.find(r => r.dir === ".agent")) {
                resolved.push(agentRt);
            }
            continue;
        }
        error(`Unknown runtime: ${name}`);
        const names = available.map(r => r.dir.replace(/^\./, "")).join(", ");
        error(`Available: ${names}`);
        exit(1);
    }
    // Deduplicate
    const seen = new Set();
    return resolved.filter(r => {
        if (seen.has(r.dir)) return false;
        seen.add(r.dir);
        return true;
    });
}

function readJsonFile(filePath, fallback = {}) {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJsonFile(filePath, value) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mergeUniqueObjects(existing = [], additions = [], matcher = (left, right) => JSON.stringify(left) === JSON.stringify(right)) {
    const merged = [...existing];
    for (const addition of additions) {
        if (!merged.some(entry => matcher(entry, addition))) {
            merged.push(addition);
        }
    }
    return merged;
}

function mergeHookConfig(existing = {}, additions = {}) {
    const merged = { ...existing };
    for (const [eventName, hookGroups] of Object.entries(additions)) {
        const currentGroups = Array.isArray(merged[eventName]) ? merged[eventName] : [];
        merged[eventName] = mergeUniqueObjects(currentGroups, hookGroups, (left, right) => {
            return left.matcher === right.matcher && JSON.stringify(left.hooks || []) === JSON.stringify(right.hooks || []);
        });
    }
    return merged;
}

function installMemoryScaffold(targetDir, opts) {
    const srcMemoryDir = join(TEMPLATE_DIR, ".memory");
    const destMemoryDir = join(targetDir, ".memory");

    if (!existsSync(srcMemoryDir)) {
        error("template/.memory/ not found. Run npm run build to regenerate the template.");
        exit(1);
    }

    if (opts.dryRun) {
        info(`Would copy ${c.bold}.memory/${c.reset} (${countFiles(srcMemoryDir)} files)`);
        info(`Would merge ${c.bold}.mcp.json${c.reset} and ${c.bold}.claude/settings.json${c.reset}`);
        return;
    }

    if (existsSync(destMemoryDir) && opts.force) {
        rmSync(destMemoryDir, { recursive: true, force: true });
    }

    if (!existsSync(destMemoryDir)) {
        cpSync(srcMemoryDir, destMemoryDir, { recursive: true });
        info(`Copied ${c.bold}.memory/${c.reset} (${countFiles(destMemoryDir)} files)`);
    } else {
        cpSync(srcMemoryDir, destMemoryDir, { recursive: true, force: false, errorOnExist: false });
        info(`Merged ${c.bold}.memory/${c.reset}`);
    }

    const mcpPath = join(targetDir, ".mcp.json");
    const currentMcp = readJsonFile(mcpPath, {});
    const nextMcp = {
        ...currentMcp,
        mcpServers: {
            ...(currentMcp.mcpServers || {}),
            "cfsa-memory": {
                command: "node",
                args: [".memory/mcp-server/client.mjs"],
                env: {
                    MEMORY_ROOT: ".memory",
                    CFSA_MEMORY_HOST: "127.0.0.1",
                    CFSA_MEMORY_PORT: "4317",
                    CFSA_MEMORY_URL: "http://127.0.0.1:4317/mcp",
                    CFSA_MEMORY_HEALTH_URL: "http://127.0.0.1:4317/health"
                }
            }
        }
    };
    writeJsonFile(mcpPath, nextMcp);
    info(`Updated ${c.bold}.mcp.json${c.reset}`);

    const claudeSettingsPath = join(targetDir, ".claude", "settings.json");
    const currentClaudeSettings = readJsonFile(claudeSettingsPath, {});
    const memoryHooks = {
        SessionStart: [
            {
                hooks: [
                    {
                        type: "command",
                        command: "node .memory/hooks/session-start.mjs"
                    }
                ]
            }
        ],
        PreCompact: [
            {
                matcher: "manual|auto",
                hooks: [
                    {
                        type: "command",
                        command: "node .memory/hooks/pre-compact.mjs"
                    }
                ]
            }
        ],
        Stop: [
            {
                hooks: [
                    {
                        type: "command",
                        command: "node .memory/hooks/session-end.mjs"
                    }
                ]
            }
        ]
    };
    const daemonHooks = {
        SessionStart: [
            {
                hooks: [
                    {
                        type: "command",
                        command: "node .memory/mcp-server/start.mjs"
                    }
                ]
            }
        ]
    };

    const nextClaudeSettings = {
        ...currentClaudeSettings,
        hooks: mergeHookConfig(mergeHookConfig(currentClaudeSettings.hooks || {}, daemonHooks), memoryHooks)
    };
    writeJsonFile(claudeSettingsPath, nextClaudeSettings);
    info(`Updated ${c.bold}.claude/settings.json${c.reset}`);
}

async function migrateMemory(targetDir) {
    const migratePath = join(targetDir, ".memory", "migrate", "migrate-legacy.mjs");
    if (!existsSync(migratePath)) {
        error("Unified memory migration script not found after scaffold.");
        exit(1);
    }

    const migrationModule = await import(pathToFileURL(migratePath).href);
    const result = migrationModule.migrateLegacyMemory({ projectRoot: targetDir });
    info(`Migrated legacy memory (${result.migratedCount} item(s))`);
}

// --- Install runtimes ---
function installRuntimes(runtimes, targetDir, opts) {
    let totalCopied = 0;
    let totalSkipped = 0;

    // Install each runtime directory
    for (const rt of runtimes) {
        const srcDir = join(TEMPLATE_DIR, rt.dir);
        const destDir = join(targetDir, rt.dir);

        if (!existsSync(srcDir)) {
            error(`${rt.dir}/ not found in template. Package may be corrupted.`);
            exit(1);
        }

        if (existsSync(destDir) && !opts.force) {
            const fileCount = countFiles(srcDir);
            totalSkipped += fileCount;
            warn(`Skipped ${c.bold}${rt.dir}/${c.reset} (already exists — use --force to overwrite)`);
        } else {
            if (opts.dryRun) {
                const fileCount = countFiles(srcDir);
                totalCopied += fileCount;
                info(`Would copy ${c.bold}${rt.dir}/${c.reset} (${fileCount} files)`);
            } else {
                if (existsSync(destDir)) {
                    rmSync(destDir, { recursive: true, force: true });
                }
                cpSync(srcDir, destDir, { recursive: true });
                const fileCount = countFiles(destDir);
                totalCopied += fileCount;
                info(`Copied ${c.bold}${rt.dir}/${c.reset} (${fileCount} files)`);
            }
        }
    }

    // Copy shared docs/ directory
    const srcDocsDir = join(TEMPLATE_DIR, "docs");
    const destDocsDir = join(targetDir, "docs");

    if (opts.dryRun) {
        if (existsSync(srcDocsDir) && !existsSync(destDocsDir)) {
            const fileCount = countFiles(srcDocsDir);
            totalCopied += fileCount;
            info(`Would copy ${c.bold}docs/${c.reset} (${fileCount} files)`);
        }
    } else if (existsSync(srcDocsDir) && !existsSync(destDocsDir)) {
        cpSync(srcDocsDir, destDocsDir, { recursive: true });
        const fileCount = countFiles(destDocsDir);
        totalCopied += fileCount;
        info(`Copied ${c.bold}docs/${c.reset} (${fileCount} files)`);
    } else if (existsSync(destDocsDir)) {
        warn(`Skipped ${c.bold}docs/${c.reset} (already exists)`);
    }

    // Copy root config files that exist in template
    const configCandidates = readdirSync(TEMPLATE_DIR)
        .filter(f => f.endsWith(".md") && f === f.toUpperCase() && statSync(join(TEMPLATE_DIR, f)).isFile());

    for (const file of configCandidates) {
        const srcFile = join(TEMPLATE_DIR, file);
        const destFile = join(targetDir, file);

        if (!existsSync(destFile)) {
            if (opts.dryRun) {
                info(`Would copy ${c.bold}${file}${c.reset}`);
            } else {
                cpSync(srcFile, destFile);
                totalCopied++;
                info(`Copied ${c.bold}${file}${c.reset}`);
            }
        }
    }

    return { totalCopied, totalSkipped };
}

// --- Init Command ---
async function cmdInit(opts) {
    ensureTemplateDir();

    const available = discoverRuntimes();
    if (available.length === 0) {
        error("No runtimes found in template directory. Package may be corrupted.");
        exit(1);
    }

    const targetDir = resolve(opts.path || cwd());

    log("");
    log(`${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}`);
    log(`${c.dim}Installing into: ${targetDir}${c.reset}`);
    log("");

    let selected;

    if (opts.agents) {
        // Non-interactive: --agent flag provided
        selected = resolveAgentNames(opts.agents, available);
    } else if (!isTTY || QUIET) {
        // Non-TTY or quiet: install all runtimes
        selected = available;
        if (!QUIET) {
            log(`${c.dim}Non-interactive mode — installing all ${available.length} runtimes${c.reset}`);
            log("");
        }
    } else {
        // Interactive: show multi-select picker
        try {
            selected = await multiSelect(available);
            log("");
        } catch (e) {
            error(e.message);
            exit(1);
        }
    }

    log(`${c.dim}Runtimes: ${selected.map(r => r.name).join(", ")}${c.reset}`);
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

    const { totalCopied, totalSkipped } = installRuntimes(selected, targetDir, opts);

    installMemoryScaffold(targetDir, opts);
    if (opts.migrateMemory && !opts.dryRun) {
        await migrateMemory(targetDir);
    }

    if (!opts.dryRun) {
        const compilePath = join(targetDir, ".memory", "pipeline", "compile.mjs");
        if (existsSync(compilePath)) {
            const compileModule = await import(pathToFileURL(compilePath).href);
            compileModule.compileMemory({ projectRoot: targetDir });
            info(`Initialized ${c.bold}.memory/schema/${c.reset}`);
        }
    }

    // Summary
    log("");
    if (opts.dryRun) {
        log(`${c.bold}Dry run complete:${c.reset} ${totalCopied} files would be copied, ${totalSkipped} skipped`);
    } else if (totalCopied > 0) {
        log(`${c.bold}${c.green}Installation complete!${c.reset} ${totalCopied} files copied, ${totalSkipped} skipped`);
        log("");
        log(`${c.bold}Next steps:${c.reset}`);
        log(`  1. Open your project in your agent of choice`);
        log(`  2. Verify ${c.cyan}.memory/${c.reset}, ${c.cyan}.mcp.json${c.reset}, and ${c.cyan}.claude/settings.json${c.reset}`);
        log(`  3. Run ${c.cyan}/ideate${c.reset} to start the pipeline`);
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
    const available = discoverRuntimes();

    if (!args.json) {
        log("");
        log(`${c.bold}${c.magenta}CFSA Antigravity${c.reset} ${c.dim}v${PKG.version}${c.reset}`);
        log(`${c.dim}Checking: ${targetDir}${c.reset}`);
        log("");
    }

    // Detect all installed runtimes
    const installed = available.filter(r => existsSync(join(targetDir, r.dir)));

    if (installed.length === 0) {
        const dirNames = available.map(r => `${r.dir}/`).join(", ");
        if (args.json) {
            console.log(JSON.stringify({ ok: false, targetDir, installedRuntimes: [], message: `No runtime directory found (${dirNames})` }, null, 2));
        } else {
            warn(`Not installed — no runtime directory found (${dirNames})`);
            log(`  Run ${c.cyan}cfsa-antigravity init${c.reset} to install`);
            log("");
        }
        exit(1);
    }

    if (!args.json) {
        log(`${c.bold}Installed runtimes:${c.reset} ${installed.map(r => `${r.name} (${r.dir}/)`).join(", ")}`);
        log("");
    }

    let totalInstalled = 0;
    let totalMissing = 0;
    const statusJson = {
        ok: true,
        targetDir,
        installedRuntimes: installed.map(r => ({ name: r.name, dir: r.dir })),
        runtimeChecks: [],
        sharedChecks: [],
        memoryHealth: [],
        placeholders: []
    };

    for (const rt of installed) {
        const agentDir = rt.dir;
        const runtimeRecord = { name: rt.name, dir: agentDir, checks: [] };
        if (!args.json) {
            info(`${c.bold}${rt.name}${c.reset} — ${agentDir}/`);
        }

        // Build checks based on what the runtime contains
        const checks = [
            { path: `${agentDir}/skills`, label: "  Skills" },
            { path: `${agentDir}/skill-library`, label: "  Skill Library" },
            { path: `${agentDir}/instructions`, label: "  Instructions" },
        ];

        // Runtime-specific checks
        if (existsSync(join(targetDir, agentDir, "commands"))) {
            checks.unshift({ path: `${agentDir}/commands`, label: "  Commands" });
        }
        if (existsSync(join(targetDir, agentDir, "workflows"))) {
            checks.unshift({ path: `${agentDir}/workflows`, label: "  Workflows" });
        }
        if (existsSync(join(targetDir, agentDir, "rules"))) {
            checks.push({ path: `${agentDir}/rules`, label: "  Rules" });
        }

        for (const check of checks) {
            const fullPath = join(targetDir, check.path);
            if (existsSync(fullPath)) {
                const isDir = statSync(fullPath).isDirectory();
                const detail = isDir ? `${countFiles(fullPath)} files` : "present";
                if (!args.json) {
                    info(`${check.label} ${c.dim}(${detail})${c.reset}`);
                }
                runtimeRecord.checks.push({ label: check.label.trim(), status: "present", detail });
                totalInstalled++;
            } else {
                if (!args.json) {
                    warn(`${check.label} — missing`);
                }
                runtimeRecord.checks.push({ label: check.label.trim(), status: "missing" });
                totalMissing++;
            }
        }
        statusJson.runtimeChecks.push(runtimeRecord);
        if (!args.json) {
            log("");
        }
    }

    // Shared resources
    const sharedChecks = [
        { path: ".memory/wiki/specs", label: "Vault specs directory" },
    ];

    // Auto-detect config files (uppercase .md files)
    const configFiles = readdirSync(targetDir)
        .filter(f => f.endsWith(".md") && f === f.toUpperCase() && statSync(join(targetDir, f)).isFile());

    for (const check of sharedChecks) {
        const fullPath = join(targetDir, check.path);
        if (existsSync(fullPath)) {
            const detail = `${countFiles(fullPath)} files`;
            if (!args.json) {
                info(`${check.label} ${c.dim}(${detail})${c.reset}`);
            }
            statusJson.sharedChecks.push({ label: check.label, status: "present", detail });
            totalInstalled++;
        } else {
            if (!args.json) {
                warn(`${check.label} — missing`);
            }
            statusJson.sharedChecks.push({ label: check.label, status: "missing" });
            totalMissing++;
        }
    }

    for (const file of configFiles) {
        if (!args.json) {
            info(`${file} ${c.dim}(present)${c.reset}`);
        }
        statusJson.sharedChecks.push({ label: file, status: "present", detail: "present" });
        totalInstalled++;
    }

    const memoryChecks = [
        { path: ".memory", label: "Unified memory root" },
        { path: ".memory/mcp-server/daemon.mjs", label: "Memory MCP daemon" },
        { path: ".memory/mcp-server/client.mjs", label: "Memory MCP client" },
        { path: ".memory/runtime", label: "Memory daemon runtime dir" },
        { path: ".memory/schema/index.jsonl", label: "Compiled memory index" },
        { path: ".memory/schema/chunks.jsonl", label: "Compiled memory chunks" },
        { path: ".memory/wiki/hubs/shards.md", label: "Shard graph hub" },
        { path: ".memory/wiki/hubs/phases.md", label: "Phase graph hub" },
        { path: ".memory/wiki/hubs/operations.md", label: "Operations graph hub" },
        { path: ".memory/wiki/hubs/surfaces.md", label: "Surface graph hub" },
        { path: ".mcp.json", label: "MCP config" },
    ];

    if (!args.json) {
        log("");
        log(`${c.bold}Memory health:${c.reset}`);
    }
    for (const check of memoryChecks) {
        const fullPath = join(targetDir, check.path);
        if (existsSync(fullPath)) {
            if (!args.json) {
                info(`  ${check.label} ${c.dim}(present)${c.reset}`);
            }
            statusJson.memoryHealth.push({ label: check.label, status: "present" });
            totalInstalled++;
        } else {
            if (!args.json) {
                warn(`  ${check.label} — missing`);
            }
            statusJson.memoryHealth.push({ label: check.label, status: "missing" });
            totalMissing++;
        }
    }

    const runtimeStatePath = join(targetDir, ".memory", "runtime", "cfsa-memory-daemon.json");
    if (existsSync(runtimeStatePath)) {
        try {
            const runtimeState = JSON.parse(readFileSync(runtimeStatePath, "utf-8"));
            const detail = `pid=${runtimeState.pid}, port=${runtimeState.port}`;
            if (!args.json) {
                info(`  Daemon runtime state ${c.dim}(${detail})${c.reset}`);
            }
            statusJson.memoryHealth.push({ label: "Daemon runtime state", status: "present", detail });
            totalInstalled++;
        } catch {
            if (!args.json) {
                warn("  Daemon runtime state — invalid JSON");
            }
            statusJson.memoryHealth.push({ label: "Daemon runtime state", status: "invalid" });
            totalMissing++;
        }
    } else {
        if (!args.json) {
            warn("  Daemon runtime state — missing");
        }
        statusJson.memoryHealth.push({ label: "Daemon runtime state", status: "missing" });
        totalMissing++;
    }

    const mcpPath = join(targetDir, ".mcp.json");
    if (existsSync(mcpPath)) {
        try {
            const mcpConfig = JSON.parse(readFileSync(mcpPath, "utf-8"));
            if (mcpConfig.mcpServers?.["cfsa-memory"]?.args?.includes(".memory/mcp-server/client.mjs")) {
                if (!args.json) {
                    info(`  MCP registration ${c.dim}(cfsa-memory configured)${c.reset}`);
                }
                statusJson.memoryHealth.push({ label: "MCP registration", status: "present", detail: "cfsa-memory configured" });
                totalInstalled++;
            } else {
                if (!args.json) {
                    warn("  MCP registration — cfsa-memory missing or misconfigured");
                }
                statusJson.memoryHealth.push({ label: "MCP registration", status: "missing", detail: "cfsa-memory missing or misconfigured" });
                totalMissing++;
            }
        } catch {
            if (!args.json) {
                warn("  MCP config — invalid JSON");
            }
            statusJson.memoryHealth.push({ label: "MCP config", status: "invalid" });
            totalMissing++;
        }
    }

    const claudeSettingsPath = join(targetDir, ".claude", "settings.json");
    if (existsSync(claudeSettingsPath)) {
        try {
            const claudeSettings = JSON.parse(readFileSync(claudeSettingsPath, "utf-8"));
            const hasHooks = Boolean(claudeSettings.hooks?.SessionStart?.length);
            if (hasHooks) {
                if (!args.json) {
                    info(`  Claude memory hooks ${c.dim}(configured)${c.reset}`);
                }
                statusJson.memoryHealth.push({ label: "Claude memory hooks", status: "present", detail: "configured" });
                totalInstalled++;
            } else {
                if (!args.json) {
                    warn("  Claude memory hooks — not configured");
                }
                statusJson.memoryHealth.push({ label: "Claude memory hooks", status: "missing" });
                totalMissing++;
            }
        } catch {
            if (!args.json) {
                warn("  Claude settings — invalid JSON");
            }
            statusJson.memoryHealth.push({ label: "Claude settings", status: "invalid" });
            totalMissing++;
        }
    }

    if (!args.json) {
        log("");
        log(`${c.bold}Status:${c.reset} ${totalInstalled} components found, ${totalMissing} missing`);
    }

    // Check placeholders in config files
    for (const file of configFiles) {
        const configPath = join(targetDir, file);
        const content = readFileSync(configPath, "utf-8");
        const placeholders = content.match(/\{\{[A-Z_]+\}\}/g);
        if (placeholders) {
            const unique = [...new Set(placeholders)];
            statusJson.placeholders.push({ file, count: unique.length, values: unique });
            if (!args.json) {
                log("");
                warn(`${unique.length} unfilled placeholder(s) in ${file} — run /create-prd to fill them`);
                for (const p of unique.slice(0, 5)) {
                    log(`  ${c.dim}${p}${c.reset}`);
                }
                if (unique.length > 5) {
                    log(`  ${c.dim}... and ${unique.length - 5} more${c.reset}`);
                }
            }
        } else if (!args.json) {
            info(`${file} — all placeholders filled`);
        }
    }

    statusJson.summary = { totalInstalled, totalMissing };
    if (args.json) {
        console.log(JSON.stringify(statusJson, null, 2));
        return;
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
