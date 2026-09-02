import dagre from "@dagrejs/dagre";
import type { SystemGraph, SystemNode } from "@system-canvas/core";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

export function layoutGraph(graph: SystemGraph): SystemGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100 });

  for (const node of graph.nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const channel of graph.channels) {
    g.setEdge(channel.source, channel.target);
  }

  dagre.layout(g);

  const nodes: SystemNode[] = graph.nodes.map((node) => {
    const layoutNode = g.node(node.id);
    if (!layoutNode) return node;
    return {
      ...node,
      position: {
        x: layoutNode.x - NODE_WIDTH / 2,
        y: layoutNode.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { ...graph, nodes };
}

export function graphNeedsLayout(graph: SystemGraph): boolean {
  return graph.nodes.some((n) => !n.position);
}
