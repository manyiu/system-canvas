import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PacketTrace } from "@system-canvas/core";
import { buildPacketFlights, formatPacketLabel, stepDwellMs } from "./packet-flight.ts";

const trace: PacketTrace = {
  id: "0:ch1:p0:0",
  payload: { id: "p0", type: "PlaceOrder", data: { orderId: 101 } },
  channelId: "ch1",
  sourceNodeId: "OrderService",
  targetNodeId: "DB",
  stepIndex: 0,
  timestamp: 0,
  status: "in-flight",
};

describe("packet-flight", () => {
  it("formats payload labels with a key field", () => {
    assert.equal(formatPacketLabel("PlaceOrder", { orderId: 101 }), "PlaceOrder · orderId=101");
    assert.equal(formatPacketLabel("OrderCreated"), "OrderCreated");
  });

  it("builds flights timed to playback speed and pause state", () => {
    const playing = buildPacketFlights([trace], "ch1", "sync", 1, "playing");
    assert.equal(playing.length, 1);
    assert.equal(playing[0]?.playState, "running");
    assert.equal(playing[0]?.payloadType, "PlaceOrder");
    assert.ok((playing[0]?.durationMs ?? 0) < stepDwellMs(1));
    assert.ok((playing[0]?.durationMs ?? 0) > 0);

    const paused = buildPacketFlights([trace], "ch1", "sync", 1, "paused");
    assert.equal(paused[0]?.playState, "paused");

    const fast = buildPacketFlights([trace], "ch1", "async", 2, "idle");
    assert.ok((fast[0]?.durationMs ?? 0) < (playing[0]?.durationMs ?? 0));
  });

  it("ignores other channels and non-in-flight traces", () => {
    const other = { ...trace, channelId: "ch3", id: "0:ch3:p0:0" };
    const delivered = { ...trace, status: "delivered" as const };
    assert.equal(buildPacketFlights([other, delivered], "ch1", "sync", 1, "idle").length, 0);
  });
});
