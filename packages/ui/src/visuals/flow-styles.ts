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
  return highlighted && delivery === "async";
}

export function formatChannelLabel(
  delivery: FlowDelivery | undefined,
  label?: string,
  relationship?: RelationshipKind,
): string | undefined {
  const canonical = label
    ? stripChannelLabelPrefix(label, delivery, relationship)
    : undefined;

  const parts: string[] = [];
  if (delivery) parts.push(delivery);
  if (relationship) parts.push(relationship);
  const prefix = parts.length > 0 ? parts.join(" · ") : undefined;
  if (prefix && canonical) return `${prefix} · ${canonical}`;
  if (prefix) return prefix;
  return canonical || undefined;
}
