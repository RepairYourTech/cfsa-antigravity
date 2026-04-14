#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const rootDir = resolve(new URL("..", import.meta.url).pathname);
const serverPath = join(rootDir, "memory-src", "mcp-server", "index.mjs");
const daemonPath = join(rootDir, "memory-src", "mcp-server", "daemon.mjs");
const clientPath = join(rootDir, "memory-src", "mcp-server", "client.mjs");
const fixtureRoot = mkdtempSync(join(tmpdir(), "cfsa-memory-mcp-"));
mkdirSync(join(fixtureRoot, ".memory", "mcp-server"), { recursive: true });
mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "ia"), { recursive: true });
mkdirSync(join(fixtureRoot, ".memory", "wiki", "specs", "be"), { recursive: true });
writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "ia", "00-auth.md"), "# IA Shard 00 Auth\n", "utf8");
writeFileSync(join(fixtureRoot, ".memory", "wiki", "specs", "be", "00-auth-be.md"), "# BE 00 Auth\n> **IA Source**: [00-auth.md](../../ia/00-auth.md)\n", "utf8");

function fail(message) {
  console.error(`[memory-mcp] FAIL: ${message}`);
  rmSync(fixtureRoot, { recursive: true, force: true });
  process.exit(1);
}

function parseTextResult(response) {
  const text = response?.result?.content?.[0]?.text;
  if (!text) {
    fail(`Missing text result in response: ${JSON.stringify(response)}`);
  }
  return JSON.parse(text);
}

async function run() {
  const fs = await import("node:fs");
  fs.copyFileSync(daemonPath, join(fixtureRoot, ".memory", "mcp-server", "daemon.mjs"));
  fs.copyFileSync(clientPath, join(fixtureRoot, ".memory", "mcp-server", "client.mjs"));
  const port = String(5300 + Math.floor(Math.random() * 1000));
  const daemon = spawn("node", [daemonPath], {
    cwd: fixtureRoot,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, CFSA_MEMORY_PORT: port, CFSA_MEMORY_HOST: "127.0.0.1" },
  });

  const child = spawn("node", [clientPath], {
    cwd: fixtureRoot,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, CFSA_MEMORY_PORT: port, CFSA_MEMORY_HOST: "127.0.0.1", CFSA_MEMORY_URL: `http://127.0.0.1:${port}/mcp`, CFSA_MEMORY_HEALTH_URL: `http://127.0.0.1:${port}/health` },
  });

  let buffer = "";
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const resolver = pending.get(message.id);
      if (resolver) {
        pending.delete(message.id);
        resolver(message);
      }
    }
  });

  function request(id, method, params = {}) {
    return new Promise((resolveRequest) => {
      pending.set(id, resolveRequest);
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  const initialize = await request(1, "initialize", {});
  if (initialize.result?.serverInfo?.name !== "cfsa-memory") {
    fail(`Unexpected initialize result: ${JSON.stringify(initialize)}`);
  }

  const listed = await request(2, "tools/list", {});
  const toolNames = new Set((listed.result?.tools ?? []).map((tool) => tool.name));
  for (const expected of ["memory_flush", "memory_compile", "memory_query", "memory_graph_query", "memory_lint"]) {
    if (!toolNames.has(expected)) {
      fail(`Missing expected tool: ${expected}`);
    }
  }

  const flushed = parseTextResult(await request(3, "tools/call", {
    name: "memory_flush",
    arguments: {
      entry: {
        type: "decision",
        agent: "fixture",
        source: "mcp-test",
        title: "Fixture entry",
        text: "MCP fixture test entry.",
        sessionId: "fixture-session",
      },
      options: {
        projectRoot: fixtureRoot,
      },
    },
  }));
  if (!flushed.ok) {
    fail(`Flush failed: ${JSON.stringify(flushed)}`);
  }

  const compiled = parseTextResult(await request(4, "tools/call", {
    name: "memory_compile",
    arguments: {
      options: {
        projectRoot: fixtureRoot,
      },
    },
  }));
  if (!compiled.ok) {
    fail(`Compile failed: ${JSON.stringify(compiled)}`);
  }

  const queried = parseTextResult(await request(5, "tools/call", {
    name: "memory_query",
    arguments: {
      query: "fixture test",
      memoryRoot: join(fixtureRoot, ".memory"),
      limit: 3,
    },
  }));
  if ((queried.count ?? 0) < 1) {
    fail(`Query returned no results: ${JSON.stringify(queried)}`);
  }

  const graphed = parseTextResult(await request(6, "tools/call", {
    name: "memory_graph_query",
    arguments: {
      memoryRoot: join(fixtureRoot, ".memory"),
    },
  }));
  if ((graphed.nodeCount ?? 0) < 1) {
    fail(`Graph query returned no nodes: ${JSON.stringify(graphed)}`);
  }

  const linted = parseTextResult(await request(7, "tools/call", {
    name: "memory_lint",
    arguments: {
      options: {
        projectRoot: fixtureRoot,
      },
    },
  }));
  if (!linted.ok) {
    fail(`Lint failed: ${JSON.stringify(linted)}`);
  }

  console.log("[memory-mcp] PASS: initialize, tools/list, flush, compile, query, graph-query, lint");
  child.kill();
  daemon.kill();
  rmSync(fixtureRoot, { recursive: true, force: true });
}

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
