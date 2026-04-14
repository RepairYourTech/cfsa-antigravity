import { lintMemory } from "../../pipeline/lint.mjs";

export async function memoryLint(args = {}) {
  return lintMemory(args.options ?? {});
}
