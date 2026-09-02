import type { ExecutionStep, SystemDocument, SystemGraph } from "@system-canvas/core";
import type { Edge, Node } from "@xyflow/react";
import { applyVisualDirectives } from "../visuals/apply-directives.js";
import { graphNeedsLayout, layoutGraph } from "./layout.js";

export interface FlowGraphOptions {
  selectedStep?: ExecutionStep | null;
  autoLayout?: boolean;
}

export interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
  graph: SystemGraph;
}

export function toFlowGraph(
  document: SystemDocument,
  options: FlowGraphOptions = {},
): FlowGraph {
  let graph = document.graph;
  if (options.autoLayout !== false && graphNeedsLayout(graph)) {
    graph = layoutGraph(graph);
  }

  const { nodeStyles } = applyVisualDirectives(options.selectedStep?.visuals);

  const nodes: Node[] = graph.nodes.map((node, index) => {
    const visual = nodeStyles.get(node.id);
    return {
      id: node.id,
      type: node.kind === "custom" ? "service" : node.kind,
      position: node.position ?? { x: index * 220, y: index * 40 },
      data: {
        label: node.label,
        kind: node.kind,
        icon: node.icon,
        ports: node.ports ?? [],
        config: node.config ?? {},
        visual,
      },
    };
  });

  const activeChannels = new Set<string>();
  if (options.selectedStep) {
    for (const interaction of options.selectedStep.interactions) {
      const src =
        typeof interaction.source === "string"
          ? interaction.source
          : interaction.source.nodeId;
      const tgt =
        typeof interaction.target === "string"
          ? interaction.target
          : interaction.target.nodeId;
      const match = graph.channels.find(
        (c) => c.source === src && c.target === tgt,
      );
      if (match) activeChannels.add(match.id);
    }
  }

  const edges: Edge[] = graph.channels.map((channel) => ({
    id: channel.id,
    source: channel.source,
    target: channel.target,
    type: "channel",
    label: channel.label,
    animated: activeChannels.has(channel.id),
    data: {
      payloadType: channel.payloadType,
      highlighted: activeChannels.has(channel.id),
    },
  }));

  return { nodes, edges, graph };
}
