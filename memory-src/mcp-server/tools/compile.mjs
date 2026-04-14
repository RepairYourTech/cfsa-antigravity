import { compileMemory } from "../../pipeline/compile.mjs";

export async function memoryCompile(args = {}) {
  return compileMemory(args.options ?? {});
}
