const endpoint = process.env.CFSA_MEMORY_URL || `http://${process.env.CFSA_MEMORY_HOST || "127.0.0.1"}:${process.env.CFSA_MEMORY_PORT || "4317"}/mcp`;
const healthUrl = process.env.CFSA_MEMORY_HEALTH_URL || endpoint.replace(/\/mcp$/, "/health");

async function ensureReady() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return true;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const ready = await ensureReady();
    if (!ready) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "cfsa-memory-daemon is not ready" } })}\n`);
      continue;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: trimmed,
    });
    const text = await response.text();
    process.stdout.write(`${text}\n`);
  }
});
