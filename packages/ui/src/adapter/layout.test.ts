import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SystemGraph } from "@system-canvas/core";
import { graphNeedsLayout, layoutGraph } from "./layout.ts";

const graphWithoutPositions: SystemGraph = {
  id: "g1",
  name: "Test",
  nodes: [
    { id: "A", type: "service", label: "A" },
    { id: "B", type: "service", label: "B" },
    { id: "C", type: "database", label: "C" },
  ],
  channels: [
    {
      id: "ch1",
      source: "A",
      target: "B",
      interactionType: "sync",
      label: "call",
    },
    {
      id: "ch2",
      source: "B",
      target: "C",
      interactionType: "async",
      label: "event",
    },
  ],
};

describe("layout", () => {
  it("detects missing node positions", () => {
    assert.equal(graphNeedsLayout(graphWithoutPositions), true);
    const laidOut = layoutGraph(graphWithoutPositions);
    assert.equal(graphNeedsLayout(laidOut), false);
  });

  it("assigns LR positions so nodes spread horizontally", () => {
    const laidOut = layoutGraph(graphWithoutPositions);
    const xs = laidOut.nodes.map((n) => n.position!.x);
    const ys = laidOut.nodes.map((n) => n.position!.y);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    assert.ok(xSpread > 40);
    assert.ok(ySpread < xSpread);
  });

  it("preserves existing positions when graph does not need layout", () => {
    const withPositions: SystemGraph = {
      ...graphWithoutPositions,
      nodes: graphWithoutPositions.nodes.map((n, i) => ({
        ...n,
        position: { x: i * 10, y: 5 },
      })),
    };
    assert.equal(graphNeedsLayout(withPositions), false);
  });

  it("does not relayout when only some nodes lack positions", () => {
    const partial: SystemGraph = {
      ...graphWithoutPositions,
      nodes: [
        { ...graphWithoutPositions.nodes[0]!, position: { x: 10, y: 20 } },
        { ...graphWithoutPositions.nodes[1]! },
        { ...graphWithoutPositions.nodes[2]! },
      ],
    };
    assert.equal(graphNeedsLayout(partial), false);
  });
});
