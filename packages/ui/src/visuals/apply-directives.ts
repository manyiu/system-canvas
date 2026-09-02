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

export function applyVisualDirectives(
  directives: VisualDirective[] | undefined,
): {
  nodeStyles: Map<string, NodeVisualStyle>;
  edgeStyles: Map<string, EdgeVisualStyle>;
} {
  const nodeStyles = new Map<string, NodeVisualStyle>();
  const edgeStyles = new Map<string, EdgeVisualStyle>();

  for (const directive of directives ?? []) {
    const color = COLOR_MAP[directive.color ?? "neutral"];

    if (directive.kind === "highlight" || directive.kind === "signal") {
      nodeStyles.set(directive.targetId, {
        borderColor: color,
        backgroundColor: "#1e293b",
        badge: directive.label,
        state: directive.state,
      });
    }

    if (directive.kind === "barrier") {
      nodeStyles.set(directive.targetId, {
        borderColor: color,
        backgroundColor: "#450a0a",
        badge: directive.label ?? "BARRIER",
        state: "barrier",
      });
    }

    if (directive.kind === "hold" || directive.kind === "lag") {
      nodeStyles.set(directive.targetId, {
        borderColor: color,
        backgroundColor: "#422006",
        badge: directive.label ?? directive.kind,
        state: directive.state ?? "active",
      });
    }

    if (directive.kind === "consume" || directive.kind === "bounce") {
      nodeStyles.set(directive.targetId, {
        borderColor: color,
        backgroundColor: directive.kind === "bounce" ? "#450a0a" : "#1e293b",
        badge: directive.label ?? directive.kind,
        state: directive.state,
      });
    }
  }

  return { nodeStyles, edgeStyles };
}

export function getNodeVisualStyle(
  nodeId: string,
  directives: VisualDirective[] | undefined,
): NodeVisualStyle {
  const { nodeStyles } = applyVisualDirectives(directives);
  return nodeStyles.get(nodeId) ?? DEFAULT_NODE_STYLE;
}
