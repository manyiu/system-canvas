import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { getChannelEdgeStyle } from "../visuals/flow-styles.js";

export interface ChannelEdgeData {
  highlighted?: boolean;
  delivery?: "sync" | "async";
  payloadType?: string;
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

  return (
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
  );
}

export const edgeTypes = {
  channel: ChannelEdge,
};
