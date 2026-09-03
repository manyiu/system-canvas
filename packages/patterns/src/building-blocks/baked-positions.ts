import type { Position, SystemNode } from "@system-canvas/core";

const RANK_GAP = 240;
const ROW_GAP = 140;
const START: Position = { x: 48, y: 80 };

export function pipelinePositions(
  nodeIds: string[],
  start: Position = START,
): Record<string, Position> {
  const out: Record<string, Position> = {};
  nodeIds.forEach((id, i) => {
    out[id] = { x: start.x + i * RANK_GAP, y: start.y };
  });
  return out;
}

/**
 * Left-to-right architecture layers. Each inner array is a vertical stack
 * in one rank (clients, edge, services, data, workers). Stacks are centered
 * so a single gateway lines up with a column of stores.
 */
export function columnPositions(
  columns: string[][],
  start: Position = START,
): Record<string, Position> {
  const out: Record<string, Position> = {};
  const maxRows = Math.max(1, ...columns.map((col) => col.length));
  const canvasHeight = (maxRows - 1) * ROW_GAP;

  columns.forEach((col, ci) => {
    const colHeight = Math.max(0, col.length - 1) * ROW_GAP;
    const offsetY = (canvasHeight - colHeight) / 2;
    col.forEach((id, ri) => {
      out[id] = {
        x: start.x + ci * RANK_GAP,
        y: start.y + offsetY + ri * ROW_GAP,
      };
    });
  });
  return out;
}

/** @deprecated Prefer columnPositions — this stacks rows top-to-bottom. */
export function tieredPositions(
  tiers: string[][],
  start: Position = START,
): Record<string, Position> {
  return columnPositions(tiers, start);
}

/** Hub in the second rank; actors, spokes, and stores stack vertically. */
export function hubPositions(options: {
  left: string[];
  hub: string;
  spokes: string[];
  right?: string[];
  start?: Position;
}): Record<string, Position> {
  const columns: string[][] = [options.left, [options.hub], options.spokes];
  if (options.right && options.right.length > 0) columns.push(options.right);
  return columnPositions(columns, options.start ?? START);
}

export function applyPositions(
  nodes: SystemNode[],
  positions: Record<string, Position>,
): SystemNode[] {
  return nodes.map((n) => ({
    ...n,
    position: positions[n.id] ?? n.position,
  }));
}

/** Place branches in the next rank, stacked and vertically centered on the anchor. */
export function sideBranchPositions(
  anchor: Position,
  branchIds: string[],
  _direction: "below" | "above" = "below",
): Record<string, Position> {
  const out: Record<string, Position> = {};
  const startY = anchor.y - ((branchIds.length - 1) * ROW_GAP) / 2;
  branchIds.forEach((id, i) => {
    out[id] = {
      x: anchor.x + RANK_GAP,
      y: startY + i * ROW_GAP,
    };
  });
  return out;
}
