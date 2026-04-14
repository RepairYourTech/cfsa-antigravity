import { buildContext } from "../pipeline/query.mjs";

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
const task = payload.prompt ?? payload.task ?? "session resume";
const result = buildContext(task);
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: result.context } }));
