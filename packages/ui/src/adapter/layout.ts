import dagre from "@dagrejs/dagre";
import type { SystemGraph, SystemNode } from "@system-canvas/core";

const NODE_WIDTH = 180;
const BASE_NODE_HEIGHT = 80;
const PORT_ROW_HEIGHT = 28;

function estimateNodeHeight(node: SystemNode): number {
  const portCount = node.ports?.length ?? 0;
  return BASE_NODE_HEIGHT + (portCount > 0 ? PORT_ROW_HEIGHT : 0);
}

export function layoutGraph(graph: SystemGraph): SystemGraph {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    nodesep: 80,
    // Extra rank gap so channel label chips clear node bodies on short hops.
    ranksep: 160,
    ranker: "network-simplex",
  });

  for (const node of graph.nodes) {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: estimateNodeHeight(node),
    });
  }

  for (const channel of graph.channels) {
    g.setEdge(channel.source, channel.target);
  }

  dagre.layout(g);

  const nodes: SystemNode[] = graph.nodes.map((node) => {
    if (node.position) return node;
    const layoutNode = g.node(node.id);
    if (!layoutNode) return node;
    const height = estimateNodeHeight(node);
    return {
      ...node,
      position: {
        x: layoutNode.x - NODE_WIDTH / 2,
        y: layoutNode.y - height / 2,
      },
    };
  });

  return { ...graph, nodes };
}

export function graphNeedsLayout(graph: SystemGraph): boolean {
  if (graph.nodes.length === 0) return false;
  return graph.nodes.every((n) => !n.position);
}
