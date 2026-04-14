import { compileMemory } from "../pipeline/compile.mjs";
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
flushEntry({
  type: "event",
  agent: "claude",
  source: "session-end",
  title: "Session end",
  text: payload.reason ?? "Session ended.",
  metadata: payload,
  sessionId: payload.session_id,
});
const result = compileMemory();
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "Stop", additionalContext: `Unified memory compiled with ${result.knowledgeEntries} entries.` } }));
