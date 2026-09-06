import type {
  ExecutionResult,
  PlaybackState,
  SystemDocument,
  SystemGraph,
} from "@system-canvas/core";
import type { Edge, Node } from "@xyflow/react";
import { buildPacketFlights } from "../edges/packet-flight.js";
import { applyVisualDirectives } from "../visuals/apply-directives.js";
import { formatChannelLabel, shouldAnimateChannel } from "../visuals/flow-styles.js";
import { graphNeedsLayout, layoutGraph } from "./layout.js";
import { resolveChannelHandles } from "./resolve-handles.js";

export interface FlowGraphOptions {
  executionResult?: ExecutionResult | null;
  autoLayout?: boolean;
  playbackSpeed?: number;
  playbackState?: PlaybackState;
}

export interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
  graph: SystemGraph;
}

export function toFlowGraph(document: SystemDocument, options: FlowGraphOptions = {}): FlowGraph {
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
        typeof interaction.source === "string" ? interaction.source : interaction.source.nodeId;
      const tgt =
        typeof interaction.target === "string" ? interaction.target : interaction.target.nodeId;
      const channel = graph.channels.find((c) => c.source === src && c.target === tgt);
      if (!channel || !interaction.payload) return [];
      return [[channel.id, interaction.payload.type] as const];
    }),
  );

  const traces = options.executionResult?.traces ?? [];
  const playbackSpeed = options.playbackSpeed ?? 1;
  const playbackState = options.playbackState ?? "idle";

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

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  const edges: Edge[] = graph.channels.map((channel) => {
    const highlighted = activeChannels.has(channel.id);
    const payloadLabel = interactionLabels.get(channel.id);
    const packets = buildPacketFlights(
      traces,
      channel.id,
      channel.delivery,
      playbackSpeed,
      playbackState,
    );
    const sourceNode = nodeById.get(channel.source);
    const targetNode = nodeById.get(channel.target);
    const { sourceHandle, targetHandle } = resolveChannelHandles(
      sourceNode ?? {},
      targetNode ?? {},
      {
        sourceHandle: channel.sourceHandle,
        targetHandle: channel.targetHandle,
      },
    );
    return {
      id: channel.id,
      source: channel.source,
      target: channel.target,
      sourceHandle,
      targetHandle,
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
        // Schema payload type — do not overwrite with live interaction labels.
        payloadType: channel.payloadType,
        // Live step payload type when this channel is active in playback.
        ...(payloadLabel ? { interactionLabel: payloadLabel } : {}),
        delivery: channel.delivery,
        relationship: channel.relationship,
        payloadKind: channel.payloadKind,
        highlighted,
        packets,
      },
    };
  });

  return { nodes, edges, graph };
}
