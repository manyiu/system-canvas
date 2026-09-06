import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stripChannelLabelPrefix } from "@system-canvas/core";
import { compactChannelLabel, formatChannelLabel, resolveChannelEdgeLabel } from "./flow-styles.ts";

describe("stripChannelLabelPrefix", () => {
  it("returns label unchanged when no delivery or relationship", () => {
    assert.equal(stripChannelLabelPrefix("persist"), "persist");
  });

  it("strips a single delivery and relationship prefix", () => {
    assert.equal(stripChannelLabelPrefix("async · poll · poll", "async", "poll"), "poll");
  });

  it("strips repeated prefixes from corrupted labels", () => {
    const corrupted = "async · poll · async · poll · async · poll · poll";
    assert.equal(stripChannelLabelPrefix(corrupted, "async", "poll"), "poll");
  });
});

describe("formatChannelLabel", () => {
  it("builds display label from canonical parts once", () => {
    assert.equal(formatChannelLabel("async", "poll", "poll"), "async · poll · poll");
  });

  it("does not double-prefix when label already includes delivery metadata", () => {
    assert.equal(formatChannelLabel("async", "async · poll · poll", "poll"), "async · poll · poll");
  });
});

describe("compactChannelLabel", () => {
  it("prefers relationship over canonical name", () => {
    assert.equal(compactChannelLabel("sync", "forward", "command"), "command");
  });

  it("falls back to canonical then delivery", () => {
    assert.equal(compactChannelLabel("sync", "forward"), "forward");
    assert.equal(compactChannelLabel("async"), "async");
  });
});

describe("resolveChannelEdgeLabel", () => {
  it("uses compact text when idle", () => {
    assert.equal(
      resolveChannelEdgeLabel({
        delivery: "sync",
        label: "forward",
        relationship: "command",
      }),
      "command",
    );
  });

  it("expands when highlighted or selected", () => {
    assert.equal(
      resolveChannelEdgeLabel({
        highlighted: true,
        delivery: "sync",
        label: "forward",
        relationship: "command",
      }),
      "sync · command · forward",
    );
    assert.equal(
      resolveChannelEdgeLabel({
        selected: true,
        delivery: "sync",
        label: "forward",
        relationship: "command",
      }),
      "sync · command · forward",
    );
  });
});
