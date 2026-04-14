import { getMemoryRoot, readJson } from "../../pipeline/utils.mjs";

export async function memoryGraphQuery(args = {}) {
  const memoryRoot = args.memoryRoot ?? getMemoryRoot();
  const graph = readJson(`${memoryRoot}/schema/spec-graph.json`, { nodes: [], edges: [] });
  const lint = readJson(`${memoryRoot}/schema/spec-graph-lint.json`, { issues: [] });
  const nodeId = args.nodeId ?? null;
  const edgeType = args.edgeType ?? null;
  const direction = args.direction ?? "both";

  const edges = graph.edges.filter((edge) => {
    if (edgeType && edge.type !== edgeType) return false;
    if (!nodeId) return true;
    if (direction === "out") return edge.from === nodeId;
    if (direction === "in") return edge.to === nodeId;
    return edge.from === nodeId || edge.to === nodeId;
  });

  const nodeIds = new Set();
  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }
  if (nodeId) nodeIds.add(nodeId);

  return {
    ok: true,
    nodeCount: graph.nodeCount ?? graph.nodes.length,
    edgeCount: graph.edgeCount ?? graph.edges.length,
    nodes: graph.nodes.filter((node) => nodeIds.has(node.id)),
    edges,
    lintIssues: lint.issues ?? [],
  };
}
