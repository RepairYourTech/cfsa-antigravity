---
name: svelte-flow
description: "Svelte Flow (@xyflow/svelte) for building node-based editors and interactive diagrams with Svelte 5. Use when building graph visualizations, workflow editors, custom node/edge types, or interactive diagrams in Svelte. Triggers on SvelteFlow, @xyflow/svelte, Handle, NodeProps, useSvelteFlow, fitView."
version: 1.0.0
source: self
date_added: "2026-03-17"
---

# Svelte Flow

Svelte Flow (@xyflow/svelte) is a library for building node-based graphs, workflow editors, and interactive diagrams in Svelte 5. It is the Svelte counterpart to React Flow — both from the xyflow project.

## When to Use

- Building workflow builders or no-code editors in Svelte
- Creating data pipeline visualizations
- Designing state machine diagrams
- Building chatbot conversation flows
- Creating interactive decision trees or org charts

## When NOT to Use

- React projects → use `@xyflow/react` (React Flow) instead
- Simple static diagrams → use Mermaid or SVG
- Charts/graphs (bar, line, pie) → use Chart.js or D3

## Installation

```bash
pnpm add @xyflow/svelte
```

## Basic Setup

```svelte
<script lang="ts">
  import {
    SvelteFlow,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    type Node,
    type Edge,
  } from '@xyflow/svelte';

  import '@xyflow/svelte/dist/style.css';

  let nodes = $state.raw<Node[]>([
    {
      id: '1',
      type: 'input',
      data: { label: 'Start' },
      position: { x: 250, y: 0 },
    },
    {
      id: '2',
      data: { label: 'Process' },
      position: { x: 250, y: 100 },
    },
    {
      id: '3',
      type: 'output',
      data: { label: 'End' },
      position: { x: 250, y: 200 },
    },
  ]);

  let edges = $state.raw<Edge[]>([
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3' },
  ]);
</script>

<div style="height: 100vh;">
  <SvelteFlow bind:nodes bind:edges fitView>
    <Background variant={BackgroundVariant.Dots} />
    <Controls />
    <MiniMap />
  </SvelteFlow>
</div>
```

## Key Difference from React Flow

| Concept | React Flow | Svelte Flow |
|---------|-----------|-------------|
| Package | `@xyflow/react` | `@xyflow/svelte` |
| State | `useNodesState()` hook | `$state.raw<Node[]>()` rune |
| Binding | `nodes={nodes}` prop | `bind:nodes` two-way binding |
| Hook | `useReactFlow()` | `useSvelteFlow()` |
| Wrapper | `<ReactFlow>` | `<SvelteFlow>` |
| Provider | `ReactFlowProvider` required | Not needed — context is automatic |
| Custom nodes | React component + `memo()` | Svelte component (no memo needed) |

## State Management

Use `$state.raw` (not `$state`) for nodes and edges — Svelte Flow manages internal mutations:

```svelte
<script lang="ts">
  import type { Node, Edge } from '@xyflow/svelte';

  // ✅ Correct — $state.raw for external arrays managed by SvelteFlow
  let nodes = $state.raw<Node[]>(initialNodes);
  let edges = $state.raw<Edge[]>(initialEdges);

  // ❌ Wrong — $state creates deep proxies that conflict with SvelteFlow internals
  // let nodes = $state<Node[]>(initialNodes);
</script>

<SvelteFlow bind:nodes bind:edges fitView />
```

## Custom Nodes

Create a Svelte component — Svelte Flow injects `NodeProps` automatically:

```svelte
<!-- TextUpdaterNode.svelte -->
<script lang="ts">
  import { Handle, Position, useSvelteFlow, type NodeProps } from '@xyflow/svelte';

  let { id, data }: NodeProps = $props();
  let { updateNodeData } = useSvelteFlow();
</script>

<div class="text-updater-node">
  <Handle type="target" position={Position.Top} />
  <div>
    <label for="text">Text:</label>
    <input
      id="text"
      name="text"
      value={data.text}
      oninput={(evt) => updateNodeData(id, { text: evt.target.value })}
      class="nodrag"
    />
  </div>
  <Handle type="source" position={Position.Bottom} />
</div>
```

Register custom nodes:

```svelte
<script lang="ts">
  import TextUpdaterNode from './TextUpdaterNode.svelte';
  import type { NodeTypes } from '@xyflow/svelte';

  const nodeTypes: NodeTypes = {
    textUpdater: TextUpdaterNode,
  };

  let nodes = $state.raw<Node[]>([
    {
      id: '1',
      type: 'textUpdater',
      data: { text: 'Hello' },
      position: { x: 0, y: 0 },
    },
  ]);
</script>

<SvelteFlow bind:nodes bind:edges {nodeTypes} fitView />
```

## Custom Edges

```svelte
<!-- ButtonEdge.svelte -->
<script lang="ts">
  import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useSvelteFlow,
    type EdgeProps,
  } from '@xyflow/svelte';

  let { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd }: EdgeProps = $props();
  let { deleteElements } = useSvelteFlow();

  let [edgePath, labelX, labelY] = $derived(getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  }));
</script>

<BaseEdge path={edgePath} {markerEnd} {style} />
<EdgeLabelRenderer>
  <div
    style:position="absolute"
    style:transform="translate(-50%, -50%) translate({labelX}px, {labelY}px)"
    style:pointer-events="all"
    class="nodrag nopan"
  >
    <button onclick={() => deleteElements({ edges: [{ id }] })}>×</button>
  </div>
</EdgeLabelRenderer>
```

Register custom edges:

```svelte
<script lang="ts">
  import ButtonEdge from './ButtonEdge.svelte';

  const edgeTypes = {
    buttonedge: ButtonEdge,
  };
</script>

<SvelteFlow bind:nodes bind:edges {edgeTypes} fitView />
```

## useSvelteFlow() Hook

Access the Svelte Flow instance for programmatic control:

```svelte
<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';

  const {
    // Viewport
    zoomIn, zoomOut, fitView, setCenter, setViewport, getViewport, setZoom, getZoom,
    // Nodes
    getNode, getNodes, updateNode, updateNodeData, deleteElements,
    // Edges
    getEdge, getEdges, updateEdge,
    // Coordinates
    screenToFlowPosition, flowToScreenPosition,
    // Serialization
    toObject,
    // Bounds
    getNodesBounds, fitBounds,
    // Intersections
    getIntersectingNodes, isNodeIntersecting,
    // Connections
    getHandleConnections,
  } = useSvelteFlow();
</script>
```

### Adding Nodes Programmatically

```svelte
<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';

  let { nodes } = $props();  // bind:nodes from parent
  const { screenToFlowPosition } = useSvelteFlow();

  function addNodeAtClick(event: MouseEvent) {
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    nodes = [...nodes, {
      id: `node-${Date.now()}`,
      data: { label: 'New' },
      position,
    }];
  }
</script>
```

### Save and Restore

```svelte
<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';

  const { toObject } = useSvelteFlow();

  function save() {
    const flow = toObject();
    localStorage.setItem('flow', JSON.stringify(flow));
  }
</script>
```

## Connection Validation

```svelte
<script lang="ts">
  import { SvelteFlow, type IsValidConnection } from '@xyflow/svelte';

  const isValidConnection: IsValidConnection = (connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;
    // Only allow connections to specific nodes
    return connection.target === 'B';
  };
</script>

<SvelteFlow bind:nodes bind:edges {isValidConnection} fitView />
```

## Events

```svelte
<SvelteFlow
  bind:nodes
  bind:edges
  onnodeclick={(event) => console.log('Node:', event.detail.node.id)}
  onnodedragstop={(event) => console.log('Dropped:', event.detail.node.position)}
  onedgeclick={(event) => console.log('Edge:', event.detail.edge.id)}
  onconnect={(event) => console.log('Connected:', event.detail)}
  onpaneclick={(event) => console.log('Pane clicked')}
  fitView
/>
```

## Plugin Components

```svelte
<script lang="ts">
  import {
    SvelteFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    Panel,
  } from '@xyflow/svelte';
</script>

<SvelteFlow bind:nodes bind:edges fitView>
  <!-- Background variants: Dots, Lines, Cross -->
  <Background variant={BackgroundVariant.Dots} gap={12} size={1} />

  <!-- Zoom and fit controls -->
  <Controls />

  <!-- Minimap with custom colors -->
  <MiniMap
    nodeColor={(node) => node.type === 'input' ? '#0041d0' : '#1a192b'}
    zoomable
    pannable
  />

  <!-- Custom panels -->
  <Panel position="top-left">
    <button onclick={save}>Save</button>
  </Panel>
</SvelteFlow>
```

## CSS Styling

```css
/* Custom node styles */
:global(.svelte-flow .svelte-flow__node) {
  background: white;
  border: 1px solid #1a192b;
  border-radius: 8px;
  padding: 10px;
}

:global(.svelte-flow .svelte-flow__handle) {
  width: 8px;
  height: 8px;
}

:global(.svelte-flow .svelte-flow__handle.connectingto) {
  background: #ff6060;
}

:global(.svelte-flow .svelte-flow__handle.valid) {
  background: #55dd99;
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| Use `$state()` for nodes/edges | Use `$state.raw()` — SvelteFlow manages mutations internally |
| Forget `@xyflow/svelte/dist/style.css` | Always import the base CSS |
| Define `nodeTypes` inside the component | Define `nodeTypes` at module level or outside reactive scope |
| Use `on:click` syntax (Svelte 4) | Use `onclick` or `onnodeclick` (Svelte 5) |
| Wrap in a `SvelteFlowProvider` | Not needed — context is automatic (unlike React Flow) |
| Mutate nodes array directly | Replace the array: `nodes = [...nodes, newNode]` |
| Forget `class="nodrag"` on inputs | Interactive elements inside nodes need `nodrag` to work |

## Resources

- [Svelte Flow Documentation](https://svelteflow.dev)
- [Svelte Flow Examples](https://svelteflow.dev/examples)
- [Svelte Flow API Reference](https://svelteflow.dev/api-reference)
- [xyflow GitHub](https://github.com/xyflow/xyflow)
