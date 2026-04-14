import { flushEntry } from "../pipeline/flush.mjs";

async function readStdin() {
  return await new Promise((resolve) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      resolve(input.trim());
    });
  });
}

const input = await readStdin();
const payload = input ? JSON.parse(input) : {};
const result = flushEntry({
  type: "event",
  agent: "claude",
  source: "pre-compact",
  title: "PreCompact flush",
  text: payload.summary ?? "Compaction requested.",
  metadata: payload,
  sessionId: payload.session_id,
});
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreCompact", additionalContext: `Flushed memory to ${result.path}` } }));
