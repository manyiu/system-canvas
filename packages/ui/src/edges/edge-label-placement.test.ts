import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  placeChannelEdgeLabel,
  SHORT_EDGE_LABEL_OFFSET,
  SHORT_EDGE_LABEL_THRESHOLD,
} from "./edge-label-placement.ts";

describe("placeChannelEdgeLabel", () => {
  it("keeps the midpoint on long edges", () => {
    const placed = placeChannelEdgeLabel(0, 0, 300, 0, 150, 0);
    assert.deepEqual(placed, { x: 150, y: 0 });
  });

  it("offsets short LR edges toward the source and above the path", () => {
    const chord = SHORT_EDGE_LABEL_THRESHOLD - 20;
    const midX = chord / 2;
    const placed = placeChannelEdgeLabel(0, 50, chord, 50, midX, 50);
    assert.ok(placed.x < midX);
    assert.equal(placed.y, 50 - SHORT_EDGE_LABEL_OFFSET);
  });

  it("returns midpoint when endpoints coincide", () => {
    const placed = placeChannelEdgeLabel(10, 10, 10, 10, 10, 10);
    assert.deepEqual(placed, { x: 10, y: 10 });
  });
});
