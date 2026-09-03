import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { HandlePosition, NodeKind } from "@system-canvas/core";
import { resolveNodeIcon } from "../icons/registry.js";
import type { NodeVisualStyle } from "../visuals/apply-directives.js";

/** Same id per side for source and target — React Flow looks up by (type, id). */
const HANDLE_SIDES: {
  id: HandlePosition;
  position: Position;
  className: string;
}[] = [
  { id: "left", position: Position.Left, className: "sc-handle" },
  { id: "right", position: Position.Right, className: "sc-handle" },
  { id: "top", position: Position.Top, className: "sc-handle sc-handle-top" },
  { id: "bottom", position: Position.Bottom, className: "sc-handle sc-handle-bottom" },
];

export interface SystemNodeData {
  label: string;
  kind: string;
  icon?: string;
  ports?: { id: string; label: string; visual?: NodeVisualStyle }[];
  config?: Record<string, unknown>;
  visual?: NodeVisualStyle;
}

export function BaseSystemNode({ data, selected, type }: NodeProps) {
  const nodeData = data as SystemNodeData;
  const visual = nodeData.visual;
  const icon = resolveNodeIcon(
    nodeData.icon,
    (nodeData.kind ?? type ?? "service") as NodeKind,
    nodeData.label,
  );

  const style: CSSProperties = {
    borderColor: visual?.borderColor ?? (selected ? "#38bdf8" : "#64748b"),
    backgroundColor: visual?.backgroundColor ?? "#1e293b",
    boxShadow: selected
      ? "0 0 0 2px #38bdf8"
      : visual
        ? `0 0 12px ${visual.borderColor}55`
        : undefined,
  };

  return (
    <div className="sc-node" style={style}>
      {HANDLE_SIDES.flatMap(({ id, position, className }) => [
        <Handle key={`${id}-target`} type="target" id={id} position={position} className={className} />,
        <Handle key={`${id}-source`} type="source" id={id} position={position} className={className} />,
      ])}
      <div className="sc-node-header">
        <span className="sc-node-icon">{icon}</span>
        <div>
          <div className="sc-node-label">{nodeData.label}</div>
          <div className="sc-node-kind">{nodeData.kind}</div>
        </div>
      </div>
      {(nodeData.ports ?? []).length > 0 && (
        <div className="sc-node-ports">
          {nodeData.ports!.map((port) => (
            <span
              key={port.id}
              className={`sc-port-chip${port.visual ? " sc-port-chip-active" : ""}`}
              style={
                port.visual
                  ? {
                      border: `1px solid ${port.visual.borderColor}`,
                      boxShadow: `0 0 8px ${port.visual.borderColor}55`,
                      color: port.visual.borderColor,
                    }
                  : undefined
              }
            >
              {port.visual?.badge && port.visual.badge !== port.label
                ? port.visual.badge
                : port.label}
            </span>
          ))}
        </div>
      )}
      {visual?.badge && (
        <div className="sc-node-badge">{visual.badge}</div>
      )}
    </div>
  );
}
