import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SystemGraph } from "@system-canvas/core";
import type { Edge, Node } from "@xyflow/react";
import { applyFlowChanges } from "./from-flow.ts";

const baseGraph: SystemGraph = {
  id: "outbox",
  name: "Transactional Outbox",
  version: "v1",
  nodes: [
    {
      id: "OrderService",
      kind: "service",
      label: "Order Service",
      position: { x: 0, y: 0 },
      state: {},
      networkId: "order-processing",
      config: {},
      behaviors: [],
    },
    {
      id: "DB",
      kind: "database",
      label: "Orders DB",
      position: { x: 200, y: 200 },
      state: {},
      networkId: "order-processing",
      config: {},
      behaviors: [],
    },
  ],
  channels: [
    {
      id: "ch2",
      source: "DB",
      target: "Poller",
      label: "poll",
      delivery: "async",
      relationship: "poll",
    },
  ],
};

describe("applyFlowChanges", () => {
  it("preserves canonical channel labels when syncing canvas position changes", () => {
    const flowNodes: Node[] = [
      {
        id: "OrderService",
        type: "service",
        position: { x: 40, y: 30 },
        data: { label: "Order Service", kind: "service", config: {} },
      },
      {
        id: "DB",
        type: "database",
        position: { x: 200, y: 200 },
        data: { label: "Orders DB", kind: "database", config: {} },
      },
    ];

    const flowEdges: Edge[] = [
      {
        id: "ch2",
        source: "DB",
        target: "Poller",
        type: "channel",
        // React Flow display label — must not be written back to the graph.
        label: "async · poll · poll",
        data: {
          channelLabel: "poll",
          delivery: "async",
          relationship: "poll",
        },
      },
    ];

    const updated = applyFlowChanges(baseGraph, flowNodes, flowEdges);
    const ch2 = updated.channels.find((channel) => channel.id === "ch2");

    assert.equal(ch2?.label, "poll");
    assert.equal(updated.nodes[0]?.position, flowNodes[0]?.position);
  });

  it("heals corrupted channel labels when syncing from canvas", () => {
    const corruptedGraph: SystemGraph = {
      ...baseGraph,
      channels: [
        {
          id: "ch2",
          source: "DB",
          target: "Poller",
          label: "async · poll · async · poll · poll",
          delivery: "async",
          relationship: "poll",
        },
      ],
    };

    const flowEdges: Edge[] = [
      {
        id: "ch2",
        source: "DB",
        target: "Poller",
        type: "channel",
        label: "async · poll · async · poll · poll",
        data: {
          channelLabel: "async · poll · async · poll · poll",
          delivery: "async",
          relationship: "poll",
        },
      },
    ];

    const updated = applyFlowChanges(corruptedGraph, [], flowEdges);
    assert.equal(
      updated.channels.find((channel) => channel.id === "ch2")?.label,
      "poll",
    );
  });
});
