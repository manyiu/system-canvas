import type { PatternCategory, PatternMeta, SystemDocument } from "@system-canvas/core";
import { createExponentialBackoff } from "./custom/exponential-backoff.js";
import { cdcPattern } from "./templates/data-consistency/cdc.js";
import { outboxPattern } from "./templates/data-consistency/outbox.js";
import { sagaChoreographyPattern } from "./templates/data-consistency/saga-choreography.js";
import { sagaOrchestrationPattern } from "./templates/data-consistency/saga-orchestration.js";
import { twoPhaseCommitPattern } from "./templates/data-consistency/two-phase-commit.js";
import { circuitBreakerPattern } from "./templates/resilience/circuit-breaker.js";
import { cqrsPattern } from "./templates/traffic-distribution/cqrs.js";
import { rateLimitingPattern } from "./templates/traffic-distribution/rate-limiting.js";
import { readThroughCachePattern } from "./templates/traffic-distribution/read-through-cache.js";
import { writeThroughCachePattern } from "./templates/traffic-distribution/write-through-cache.js";
import type { PatternFactory } from "./types.js";

const builtinPatterns: PatternFactory[] = [
  outboxPattern,
  cdcPattern,
  sagaOrchestrationPattern,
  sagaChoreographyPattern,
  twoPhaseCommitPattern,
  circuitBreakerPattern,
  rateLimitingPattern,
  readThroughCachePattern,
  writeThroughCachePattern,
  cqrsPattern,
];

const patternRegistry: Record<string, () => SystemDocument> = Object.fromEntries(
  builtinPatterns.map((p) => [p.id, () => p.create()]),
);

patternRegistry["exponential-backoff"] = () => createExponentialBackoff();

export function getPattern(id: string): SystemDocument {
  const factory = patternRegistry[id];
  if (!factory) {
    throw new Error(`Pattern not found: ${id}`);
  }
  return factory();
}

export function listPatterns(): PatternMeta[] {
  const builtin = builtinPatterns.map((p) => p.meta);
  const custom: PatternMeta = {
    id: "exponential-backoff",
    name: "Exponential Backoff (Custom POC)",
    category: "resilience",
    description: "Retry with exponential backoff; dead letter on max retries.",
    tags: ["retry", "backoff", "custom"],
    defaultScenarioId: "exponential-backoff-default",
  };
  return [...builtin, custom];
}

export function listPatternsByCategory(
  category: PatternCategory,
): PatternMeta[] {
  return listPatterns().filter((p) => p.category === category);
}

export { patternRegistry };
