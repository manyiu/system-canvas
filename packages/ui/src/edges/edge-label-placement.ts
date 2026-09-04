/** Chord length below this triggers a short-edge label offset (flow units / px). */
export const SHORT_EDGE_LABEL_THRESHOLD = 160;
/** Perpendicular nudge away from the path on short edges. */
export const SHORT_EDGE_LABEL_OFFSET = 12;
/** Fraction along the source→target chord used on short edges. */
export const SHORT_EDGE_LABEL_T = 0.4;

export interface EdgeLabelPoint {
  x: number;
  y: number;
}

/**
 * Place an edge label. Long edges keep the Bézier midpoint; short edges move
 * toward the source and nudge perpendicular (visually "above" for LR edges)
 * so the chip clears node bodies.
 */
export function placeChannelEdgeLabel(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  midX: number,
  midY: number,
  options?: {
    shortThreshold?: number;
    offset?: number;
    t?: number;
  },
): EdgeLabelPoint {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.hypot(dx, dy);
  const threshold = options?.shortThreshold ?? SHORT_EDGE_LABEL_THRESHOLD;

  if (!(length > 0) || length >= threshold) {
    return { x: midX, y: midY };
  }

  const t = options?.t ?? SHORT_EDGE_LABEL_T;
  const offset = options?.offset ?? SHORT_EDGE_LABEL_OFFSET;
  // Unit perpendicular that points "up" on left-to-right edges (smaller y).
  const nx = dy / length;
  const ny = -dx / length;

  return {
    x: sourceX + dx * t + nx * offset,
    y: sourceY + dy * t + ny * offset,
  };
}
