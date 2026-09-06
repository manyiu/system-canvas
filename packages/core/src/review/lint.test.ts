import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SystemDocument } from "../../dist/index.mjs";
import {
  lintMissingRelationship,
  lintOutboxPatternShape,
  runReviewLint,
} from "../../dist/index.mjs";

function doc(graphId: string, channels: SystemDocument["graph"]["channels"]): SystemDocument {
  return {
    graph: {
      id: graphId,
      name: graphId,
      version: "v1",
      nodes: [],
      channels,
    },
    scenarios: [],
  };
}

describe("lintOutboxPatternShape", () => {
  it("runs only for the outbox graph id", () => {
    const circuitBreaker = doc("circuit-breaker", [
      { id: "ch1", source: "Client", target: "Gateway", delivery: "sync" },
    ]);
    assert.equal(lintOutboxPatternShape(circuitBreaker).length, 0);
  });

  it("flags missing outbox shape on the outbox graph", () => {
    const incomplete = doc("outbox", [
      { id: "ch1", source: "OrderService", target: "DB", delivery: "sync" },
    ]);
    const issues = lintOutboxPatternShape(incomplete);
    assert.ok(issues.some((issue) => issue.ruleId === "outbox-missing-async-publish"));
  });
});

describe("lintMissingRelationship", () => {
  it("skips patterns without relationship annotations", () => {
    const circuitBreaker = doc("circuit-breaker", [
      { id: "ch1", source: "Client", target: "Gateway", delivery: "sync" },
      { id: "ch2", source: "Gateway", target: "Service", delivery: "sync" },
    ]);
    assert.equal(lintMissingRelationship(circuitBreaker).length, 0);
  });

  it("reports missing relationships when the graph uses them", () => {
    const partial = doc("custom", [
      {
        id: "ch1",
        source: "A",
        target: "B",
        delivery: "sync",
        relationship: "command",
      },
      { id: "ch2", source: "B", target: "C", delivery: "async" },
    ]);
    const issues = lintMissingRelationship(partial);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.ruleId, "missing-relationship");
    assert.equal(issues[0]?.targetId, "ch2");
  });
});

describe("runReviewLint", () => {
  it("does not emit outbox rules for non-outbox patterns with ch1", () => {
    const circuitBreaker = doc("circuit-breaker", [
      { id: "ch1", source: "Client", target: "Gateway", delivery: "sync" },
      { id: "ch2", source: "Gateway", target: "Service", delivery: "sync" },
    ]);
    const ruleIds = runReviewLint(circuitBreaker).map((issue) => issue.ruleId);
    assert.ok(!ruleIds.includes("outbox-missing-sync-persist"));
    assert.ok(!ruleIds.includes("outbox-missing-async-publish"));
    assert.ok(!ruleIds.includes("missing-relationship"));
  });
});
