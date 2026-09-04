import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { FlowDelivery, RelationshipKind } from "@system-canvas/core";
import {
  getChannelEdgeStyle,
  resolveChannelEdgeLabel,
} from "../visuals/flow-styles.js";
import { placeChannelEdgeLabel } from "./edge-label-placement.js";
import type { PacketFlight } from "./packet-flight.js";
import { PacketMarker } from "./PacketMarker.js";

export interface ChannelEdgeData {
  highlighted?: boolean;
  delivery?: FlowDelivery;
  relationship?: RelationshipKind;
  channelLabel?: string;
  /** Schema payload type on the channel (not used for chip text). */
  payloadType?: string;
  /** Live interaction payload type from playback, preferred over channelLabel. */
  interactionLabel?: string;
  packets?: PacketFlight[];
}

export function ChannelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  selected,
}: EdgeProps) {
  const edgeData = (data ?? {}) as ChannelEdgeData;
  const highlighted = edgeData.highlighted ?? false;
  const active = highlighted || (selected ?? false);
  const style = getChannelEdgeStyle(edgeData.delivery, highlighted);
  const [edgePath, midX, midY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const packets = edgeData.packets ?? [];

  // Match to-flow: live interaction label, else channel label (never static payloadType).
  const canonicalLabel =
    edgeData.interactionLabel ?? edgeData.channelLabel ?? undefined;
  const displayLabel = resolveChannelEdgeLabel({
    highlighted,
    selected,
    delivery: edgeData.delivery,
    label: canonicalLabel,
    relationship: edgeData.relationship,
  });
  // Fall back to React Flow edge.label when data parts are missing.
  const text =
    displayLabel ??
    (typeof label === "string" ? label : undefined);

  const { x: labelX, y: labelY } = placeChannelEdgeLabel(
    sourceX,
    sourceY,
    targetX,
    targetY,
    midX,
    midY,
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
        }}
        interactionWidth={20}
      />
      {text && (
        <EdgeLabelRenderer>
          <div
            className={`sc-edge-label${active ? " sc-edge-label-active" : ""}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {text}
          </div>
        </EdgeLabelRenderer>
      )}
      {packets.map((flight) => (
        <PacketMarker key={flight.id} path={edgePath} flight={flight} />
      ))}
    </>
  );
}

export const edgeTypes = {
  channel: ChannelEdge,
};
