import { flushEntry } from "../../pipeline/flush.mjs";

export async function memoryFlush(args = {}) {
  return flushEntry(args.entry ?? args, args.options ?? {});
}
