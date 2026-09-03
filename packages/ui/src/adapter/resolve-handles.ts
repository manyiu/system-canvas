import type { HandlePosition } from "@system-canvas/core";

/** Must match layout.ts / BaseSystemNode approximate size. */
const NODE_W = 180;
const NODE_H = 80;

export interface HandleNode {
  position?: { x: number; y: number };
}

export interface HandleOverride {
  sourceHandle?: HandlePosition;
  targetHandle?: HandlePosition;
}

/**
 * Pick connection handles from relative node positions (LR default).
 * Explicit channel.sourceHandle / targetHandle override auto-detection.
 *
 * Nodes must expose source+target handles on every side. A leftward edge
 * uses sourceHandle "left"; if that handle is target-only, React Flow
 * drops the edge even though the channel exists in the graph.
 */
export function resolveChannelHandles(
  source: HandleNode,
  target: HandleNode,
  override: HandleOverride = {},
): { sourceHandle: HandlePosition; targetHandle: HandlePosition } {
  if (override.sourceHandle && override.targetHandle) {
    return {
      sourceHandle: override.sourceHandle,
      targetHandle: override.targetHandle,
    };
  }

  const sx = source.position?.x ?? 0;
  const sy = source.position?.y ?? 0;
  const tx = target.position?.x ?? 0;
  const ty = target.position?.y ?? 0;

  const srcCx = sx + NODE_W / 2;
  const srcCy = sy + NODE_H / 2;
  const tgtCx = tx + NODE_W / 2;
  const tgtCy = ty + NODE_H / 2;

  const dx = tgtCx - srcCx;
  const dy = tgtCy - srcCy;
  const threshold = 40;

  let auto: { sourceHandle: HandlePosition; targetHandle: HandlePosition };

  if (Math.abs(dy) > Math.abs(dx)) {
    auto =
      dy > 0
        ? { sourceHandle: "bottom", targetHandle: "top" }
        : { sourceHandle: "top", targetHandle: "bottom" };
  } else if (dx >= threshold) {
    auto = { sourceHandle: "right", targetHandle: "left" };
  } else if (dx <= -threshold) {
    auto = { sourceHandle: "left", targetHandle: "right" };
  } else if (dy > 0) {
    auto = { sourceHandle: "bottom", targetHandle: "top" };
  } else if (dy < 0) {
    auto = { sourceHandle: "top", targetHandle: "bottom" };
  } else {
    auto = { sourceHandle: "right", targetHandle: "left" };
  }

  return {
    sourceHandle: override.sourceHandle ?? auto.sourceHandle,
    targetHandle: override.targetHandle ?? auto.targetHandle,
  };
}
