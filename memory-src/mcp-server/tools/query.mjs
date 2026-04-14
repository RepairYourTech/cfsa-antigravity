import { buildContext, queryMemory } from "../../pipeline/query.mjs";
import { buildSemanticIndex, enableSemanticConfig, semanticCapabilities, semanticQuery } from "../../pipeline/semantic.mjs";
import { getMemoryRoot } from "../../pipeline/utils.mjs";

export async function memoryQuery(args = {}) {
  return queryMemory(args.query ?? "", {
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
    limit: args.limit,
    types: args.types,
  });
}

export async function memoryContext(args = {}) {
  return buildContext(args.task ?? args.query ?? "", {
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
    limit: args.limit,
    types: args.types,
  });
}

export async function memorySemanticStatus(args = {}) {
  return semanticCapabilities({
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
  });
}

export async function memorySemanticEnable(args = {}) {
  return enableSemanticConfig({
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
    backend: args.backend,
    embeddingModel: args.embeddingModel,
  });
}

export async function memorySemanticReindex(args = {}) {
  return buildSemanticIndex({
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
  });
}

export async function memorySemanticQuery(args = {}) {
  return semanticQuery(args.query ?? "", {
    memoryRoot: args.memoryRoot ?? getMemoryRoot(),
    limit: args.limit,
  });
}
