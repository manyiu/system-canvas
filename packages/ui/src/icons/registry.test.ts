import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferIconSlug, resolveNodeIcon } from "./registry.ts";

describe("icon registry", () => {
  it("resolves known slugs", () => {
    assert.equal(resolveNodeIcon("redis", "database"), "🔴");
    assert.equal(resolveNodeIcon("postgres", "database"), "🐘");
    assert.equal(resolveNodeIcon("kafka", "queue"), "📨");
    assert.equal(resolveNodeIcon("microservice", "service"), "⚙️");
    assert.equal(resolveNodeIcon("cdn", "gateway"), "🌐");
    assert.equal(resolveNodeIcon("s3", "database"), "🪣");
    assert.equal(resolveNodeIcon("mongodb", "database"), "🍃");
  });

  it("infers from label when slug missing", () => {
    assert.equal(resolveNodeIcon(undefined, "gateway", "API Gateway"), "🚪");
    assert.equal(resolveNodeIcon(undefined, "gateway", "Load Balancer"), "⚖️");
    assert.equal(resolveNodeIcon(undefined, "external", "Rider App"), "👤");
    assert.equal(resolveNodeIcon(undefined, "database", "Redis Cache"), "🔴");
    assert.equal(resolveNodeIcon(undefined, "service", "Crawler Worker"), "👷");
  });

  it("falls back to kind icons", () => {
    assert.equal(resolveNodeIcon(undefined, "queue"), "📨");
    assert.equal(resolveNodeIcon(undefined, "external"), "🌐");
  });

  it("inferIconSlug covers common patterns", () => {
    assert.equal(inferIconSlug("Payment Gateway", "gateway"), "payment");
    assert.equal(inferIconSlug("Geo Index", "database"), "geo");
    assert.equal(inferIconSlug("Inference Cluster", "service"), "inference");
  });
});
