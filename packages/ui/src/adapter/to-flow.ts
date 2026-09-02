import type {
  ExecutionResult,
  SystemDocument,
  SystemGraph,
} from "@system-canvas/core";
import type { Edge, Node } from "@xyflow/react";
import { applyVisualDirectives } from "../visuals/apply-directives.js";
import {
  formatChannelLabel,
  shouldAnimateChannel,
} from "../visuals/flow-styles.js";
import { graphNeedsLayout, layoutGraph } from "./layout.js";

export interface FlowGraphOptions {
  executionResult?: ExecutionResult | null;
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

  const step = options.executionResult?.step;
  const { nodeStyles, portStyles } = applyVisualDirectives(step?.visuals, graph);
  const activeChannels = new Set(options.executionResult?.activeChannelIds ?? []);
  const interactionLabels = new Map(
    (options.executionResult?.resolvedInteractions ?? []).flatMap((interaction) => {
      const src =
        typeof interaction.source === "string"
          ? interaction.source
          : interaction.source.nodeId;
      const tgt =
        typeof interaction.target === "string"
          ? interaction.target
          : interaction.target.nodeId;
      const channel = graph.channels.find(
        (c) => c.source === src && c.target === tgt,
      );
      if (!channel || !interaction.payload) return [];
      return [[channel.id, interaction.payload.type] as const];
    }),
  );

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
        ports: (node.ports ?? []).map((port) => ({
          ...port,
          visual: portStyles.get(port.id),
        })),
        config: node.config ?? {},
        visual,
      },
    };
  });

  const edges: Edge[] = graph.channels.map((channel) => {
    const highlighted = activeChannels.has(channel.id);
    const payloadLabel = interactionLabels.get(channel.id);
    return {
      id: channel.id,
      source: channel.source,
      target: channel.target,
      type: "channel",
      className:
        channel.delivery === "sync"
          ? "sc-edge-sync"
          : channel.delivery === "async"
            ? "sc-edge-async"
            : undefined,
      label: formatChannelLabel(
        channel.delivery,
        payloadLabel ?? channel.label,
        channel.relationship,
      ),
      animated: shouldAnimateChannel(channel.delivery, highlighted),
      data: {
        channelLabel: channel.label,
        payloadType: channel.payloadType,
        delivery: channel.delivery,
        relationship: channel.relationship,
        payloadKind: channel.payloadKind,
        highlighted,
      },
    };
  });

  return { nodes, edges, graph };
}
