import type { SystemGraph } from "@system-canvas/core";
import type {
  NodeVisualState,
  SignalColor,
  VisualDirective,
} from "@system-canvas/core";

export interface NodeVisualStyle {
  borderColor: string;
  backgroundColor: string;
  badge?: string;
  state?: NodeVisualState;
}

export interface EdgeVisualStyle {
  stroke: string;
  strokeWidth: number;
  animated: boolean;
  label?: string;
}

const COLOR_MAP: Record<SignalColor, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  neutral: "#94a3b8",
};

const DEFAULT_NODE_STYLE: NodeVisualStyle = {
  borderColor: "#64748b",
  backgroundColor: "#1e293b",
};

function buildPortIndex(graph?: SystemGraph): Map<string, string> {
  const portIndex = new Map<string, string>();
  if (!graph) return portIndex;
  for (const node of graph.nodes) {
    for (const port of node.ports ?? []) {
      portIndex.set(port.id, node.id);
    }
  }
  return portIndex;
}

function styleFromDirective(directive: VisualDirective): NodeVisualStyle {
  const color = COLOR_MAP[directive.color ?? "neutral"];

  if (directive.kind === "highlight" || directive.kind === "signal") {
    return {
      borderColor: color,
      backgroundColor: "#1e293b",
      badge: directive.label,
      state: directive.state,
    };
  }

  if (directive.kind === "barrier") {
    return {
      borderColor: color,
      backgroundColor: "#450a0a",
      badge: directive.label ?? "BARRIER",
      state: "barrier",
    };
  }

  if (directive.kind === "hold" || directive.kind === "lag") {
    return {
      borderColor: color,
      backgroundColor: "#422006",
      badge: directive.label ?? directive.kind,
      state: directive.state ?? "active",
    };
  }

  return {
    borderColor: color,
    backgroundColor: directive.kind === "bounce" ? "#450a0a" : "#1e293b",
    badge: directive.label ?? directive.kind,
    state: directive.state,
  };
}

export function applyVisualDirectives(
  directives: VisualDirective[] | undefined,
  graph?: SystemGraph,
): {
  nodeStyles: Map<string, NodeVisualStyle>;
  portStyles: Map<string, NodeVisualStyle>;
  edgeStyles: Map<string, EdgeVisualStyle>;
} {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const portStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();
  const portIndex = buildPortIndex(graph);

  for (const directive of directives ?? []) {
    const style = styleFromDirective(directive);

    // Port ids take precedence when they collide with node ids.
    if (portIndex.has(directive.targetId)) {
      portStyles.set(directive.targetId, style);
      continue;
    }

    nodeStyles.set(directive.targetId, style);
  }

  return { nodeStyles, portStyles, edgeStyles };
}

export function getNodeVisualStyle(
  nodeId: string,
  directives: VisualDirective[] | undefined,
  graph?: SystemGraph,
): NodeVisualStyle {
  const { nodeStyles } = applyVisualDirectives(directives, graph);
  return nodeStyles.get(nodeId) ?? DEFAULT_NODE_STYLE;
}
