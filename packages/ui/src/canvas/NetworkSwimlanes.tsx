import { ViewportPortal, useNodesInitialized } from "@xyflow/react";
import { useMemo } from "react";
import type { Network, SystemGraph, SystemNode } from "@system-canvas/core";

const NODE_W = 180;
const NODE_H = 80;
const PAD = 24;

function nodesInNetwork(graph: SystemGraph, networkId: string): SystemNode[] {
  return graph.nodes.filter((n) => n.networkId === networkId && n.position);
}

export interface SwimlaneRect {
  network: Network;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeSwimlanes(graph: SystemGraph): SwimlaneRect[] {
  const networks = graph.networks ?? [];
  if (networks.length === 0) return [];

  return networks.flatMap((network) => {
    const members = nodesInNetwork(graph, network.id);
    if (members.length === 0) return [];

    const xs = members.map((n) => n.position!.x);
    const ys = members.map((n) => n.position!.y);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    const maxX = Math.max(...xs.map((x) => x + NODE_W)) + PAD;
    const maxY = Math.max(...ys.map((y) => y + NODE_H)) + PAD;

    return [{ network, x: minX, y: minY, width: maxX - minX, height: maxY - minY }];
  });
}

export function NetworkSwimlanesOverlay({ graph }: { graph: SystemGraph }) {
  const nodesInitialized = useNodesInitialized();
  const lanes = useMemo(() => computeSwimlanes(graph), [graph]);

  if (!nodesInitialized || lanes.length === 0) return null;

  return (
    <ViewportPortal>
      <svg className="sc-swimlanes-svg" aria-hidden="true">
        {lanes.map(({ network, x, y, width, height }) => (
          <g key={network.id}>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              className="sc-swimlane-rect"
              rx={8}
            />
            <text x={x + 8} y={y + 16} className="sc-swimlane-label">
              {network.label}
            </text>
          </g>
        ))}
      </svg>
    </ViewportPortal>
  );
}
