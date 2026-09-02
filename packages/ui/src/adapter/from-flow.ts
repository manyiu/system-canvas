import type { Channel, SystemGraph, SystemNode } from "@system-canvas/core";
import { stripChannelLabelPrefix } from "@system-canvas/core";
import type { Edge, Node } from "@xyflow/react";

function normalizeChannelLabel(
  label: string | undefined,
  delivery?: Channel["delivery"],
  relationship?: Channel["relationship"],
): string | undefined {
  if (!label) return undefined;
  const normalized = stripChannelLabelPrefix(label, delivery, relationship);
  return normalized || undefined;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function applyFlowChanges(
  graph: SystemGraph,
  flowNodes: Node[],
  flowEdges: Edge[],
): SystemGraph {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const nodes: SystemNode[] = flowNodes.map((flowNode) => {
    const existing = nodeMap.get(flowNode.id);
    const data = flowNode.data as {
      label?: string;
      kind?: SystemNode["kind"];
      icon?: string;
      ports?: SystemNode["ports"];
      config?: Record<string, unknown>;
    };

    return {
      id: flowNode.id,
      kind: data.kind ?? existing?.kind ?? "service",
      label: data.label ?? existing?.label ?? flowNode.id,
      position: flowNode.position,
      state: existing?.state ?? {},
      networkId: existing?.networkId,
      icon: data.icon ?? existing?.icon,
      config: data.config ?? existing?.config ?? {},
      ports: data.ports ?? existing?.ports,
      behaviors: existing?.behaviors ?? [],
      metadata: existing?.metadata,
      description: existing?.description,
    };
  });

  const channels: Channel[] = flowEdges.map((edge) => {
    const existing = graph.channels.find((c) => c.id === edge.id);
    const edgeData = (edge.data ?? {}) as {
      channelLabel?: string;
      delivery?: Channel["delivery"];
      relationship?: Channel["relationship"];
      payloadKind?: Channel["payloadKind"];
    };
    const delivery = edgeData.delivery ?? existing?.delivery;
    const relationship = edgeData.relationship ?? existing?.relationship;
    const rawLabel = edgeData.channelLabel ?? existing?.label;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // React Flow edge.label is display-only (delivery · relationship · label).
      label: normalizeChannelLabel(rawLabel, delivery, relationship),
      payloadType: existing?.payloadType,
      delivery,
      relationship,
      payloadKind: edgeData.payloadKind ?? existing?.payloadKind,
      metadata: existing?.metadata,
    };
  });

  return {
    ...graph,
    nodes,
    channels,
  };
}

export function createFlowNode(
  kind: SystemNode["kind"],
  position: { x: number; y: number },
): Node {
  const id = makeId(kind);
  return {
    id,
    type: kind === "custom" ? "service" : kind,
    position,
    data: {
      label: id,
      kind,
      ports: [],
      config: {},
    },
  };
}

export function createFlowEdge(source: string, target: string): Edge {
  return {
    id: makeId("ch"),
    source,
    target,
    type: "channel",
  };
}
