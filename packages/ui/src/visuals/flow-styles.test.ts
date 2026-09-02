import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatChannelLabel,
} from "./flow-styles.ts";
import { stripChannelLabelPrefix } from "@system-canvas/core";

describe("stripChannelLabelPrefix", () => {
  it("returns label unchanged when no delivery or relationship", () => {
    assert.equal(stripChannelLabelPrefix("persist"), "persist");
  });

  it("strips a single delivery and relationship prefix", () => {
    assert.equal(
      stripChannelLabelPrefix("async · poll · poll", "async", "poll"),
      "poll",
    );
  });

  it("strips repeated prefixes from corrupted labels", () => {
    const corrupted =
      "async · poll · async · poll · async · poll · poll";
    assert.equal(
      stripChannelLabelPrefix(corrupted, "async", "poll"),
      "poll",
    );
  });
});

describe("formatChannelLabel", () => {
  it("builds display label from canonical parts once", () => {
    assert.equal(
      formatChannelLabel("async", "poll", "poll"),
      "async · poll · poll",
    );
  });

  it("does not double-prefix when label already includes delivery metadata", () => {
    assert.equal(
      formatChannelLabel("async", "async · poll · poll", "poll"),
      "async · poll · poll",
    );
  });
});
