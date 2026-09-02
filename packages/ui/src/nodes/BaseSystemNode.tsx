import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { NodeVisualStyle } from "../visuals/apply-directives.js";

export interface SystemNodeData {
  label: string;
  kind: string;
  icon?: string;
  ports?: { id: string; label: string }[];
  config?: Record<string, unknown>;
  visual?: NodeVisualStyle;
}

const KIND_ICONS: Record<string, string> = {
  service: "⚙️",
  database: "🗄️",
  queue: "📨",
  gateway: "🚪",
  external: "🌐",
};

export function BaseSystemNode({ data, selected }: NodeProps) {
  const nodeData = data as SystemNodeData;
  const visual = nodeData.visual;
  const icon = nodeData.icon ?? KIND_ICONS[nodeData.kind] ?? "📦";

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
      <Handle type="target" position={Position.Left} className="sc-handle" />
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
            <span key={port.id} className="sc-port-chip">
              {port.label}
            </span>
          ))}
        </div>
      )}
      {visual?.badge && (
        <div className="sc-node-badge">{visual.badge}</div>
      )}
      <Handle type="source" position={Position.Right} className="sc-handle" />
    </div>
  );
}
