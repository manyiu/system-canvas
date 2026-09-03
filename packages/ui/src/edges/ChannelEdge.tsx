import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { getChannelEdgeStyle } from "../visuals/flow-styles.js";
import type { PacketFlight } from "./packet-flight.js";
import { PacketMarker } from "./PacketMarker.js";

export interface ChannelEdgeData {
  highlighted?: boolean;
  delivery?: "sync" | "async";
  payloadType?: string;
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
}: EdgeProps) {
  const edgeData = (data ?? {}) as ChannelEdgeData;
  const style = getChannelEdgeStyle(edgeData.delivery, edgeData.highlighted ?? false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const packets = edgeData.packets ?? [];

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        label={typeof label === "string" ? label : undefined}
        labelX={labelX}
        labelY={labelY}
        style={{
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
        }}
        interactionWidth={20}
      />
      {packets.map((flight) => (
        <PacketMarker key={flight.id} path={edgePath} flight={flight} />
      ))}
    </>
  );
}

export const edgeTypes = {
  channel: ChannelEdge,
};
