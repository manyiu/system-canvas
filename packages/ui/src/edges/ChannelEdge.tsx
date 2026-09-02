import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

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
  const edgeData = (data ?? {}) as { highlighted?: boolean };
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
        stroke: edgeData.highlighted ? "#22c55e" : "#64748b",
        strokeWidth: edgeData.highlighted ? 2.5 : 1.5,
      }}
    />
  );
}

export const edgeTypes = {
  channel: ChannelEdge,
};
