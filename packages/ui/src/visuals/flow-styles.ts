import type { FlowDelivery, RelationshipKind } from "@system-canvas/core";
import { stripChannelLabelPrefix } from "@system-canvas/core";

export interface ChannelEdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  markerColor: string;
  deliveryLabel: string;
}

const SYNC_COLOR = "#60a5fa";
const ASYNC_COLOR = "#fbbf24";
const IDLE_COLOR = "#64748b";

export function getChannelEdgeStyle(
  delivery: FlowDelivery | undefined,
  highlighted: boolean,
): ChannelEdgeStyle {
  if (delivery === "sync") {
    return {
      stroke: highlighted ? SYNC_COLOR : IDLE_COLOR,
      strokeWidth: highlighted ? 2.5 : 2,
      markerColor: highlighted ? SYNC_COLOR : IDLE_COLOR,
      deliveryLabel: "sync",
    };
  }

  if (delivery === "async") {
    return {
      stroke: highlighted ? ASYNC_COLOR : IDLE_COLOR,
      strokeWidth: highlighted ? 2.5 : 1.5,
      strokeDasharray: highlighted ? "10 6" : "8 5",
      markerColor: highlighted ? ASYNC_COLOR : IDLE_COLOR,
      deliveryLabel: "async",
    };
  }

  return {
    stroke: highlighted ? "#22c55e" : IDLE_COLOR,
    strokeWidth: highlighted ? 2.5 : 1.5,
    markerColor: highlighted ? "#22c55e" : IDLE_COLOR,
    deliveryLabel: "",
  };
}

export function shouldAnimateChannel(
  delivery: FlowDelivery | undefined,
  highlighted: boolean,
): boolean {
  void delivery;
  return highlighted;
}

export function formatChannelLabel(
  delivery: FlowDelivery | undefined,
  label?: string,
  relationship?: RelationshipKind,
): string | undefined {
  const canonical = label ? stripChannelLabelPrefix(label, delivery, relationship) : undefined;

  const parts: string[] = [];
  if (delivery) parts.push(delivery);
  if (relationship) parts.push(relationship);
  const prefix = parts.length > 0 ? parts.join(" · ") : undefined;
  if (prefix && canonical) return `${prefix} · ${canonical}`;
  if (prefix) return prefix;
  return canonical || undefined;
}

/** Idle density: relationship, else canonical name, else delivery. */
export function compactChannelLabel(
  delivery: FlowDelivery | undefined,
  label?: string,
  relationship?: RelationshipKind,
): string | undefined {
  const canonical = label ? stripChannelLabelPrefix(label, delivery, relationship) : undefined;
  if (relationship) return relationship;
  if (canonical) return canonical;
  if (delivery) return delivery;
  return undefined;
}

export function resolveChannelEdgeLabel(options: {
  highlighted?: boolean;
  selected?: boolean;
  delivery?: FlowDelivery;
  label?: string;
  relationship?: RelationshipKind;
}): string | undefined {
  const expanded = formatChannelLabel(options.delivery, options.label, options.relationship);
  if (options.highlighted || options.selected) return expanded;
  return compactChannelLabel(options.delivery, options.label, options.relationship) ?? expanded;
}
