import type { ExampleDifficulty, ExampleMeta, SystemDocument } from "@system-canvas/core";
import { allExamples } from "./examples/index.js";
import type { PatternFactory } from "./types.js";

const exampleRegistry: Record<string, () => SystemDocument> = Object.fromEntries(
  allExamples.map((p) => [p.id, () => p.create()]),
);

export function getExample(id: string): SystemDocument {
  const factory = exampleRegistry[id];
  if (!factory) {
    throw new Error(`Example not found: ${id}`);
  }
  return factory();
}

export function listExamples(): ExampleMeta[] {
  return allExamples.map((p) => p.meta);
}

export function listExamplesByDifficulty(
  difficulty: ExampleDifficulty,
): ExampleMeta[] {
  return listExamples().filter((p) => p.difficulty === difficulty);
}

/** @deprecated Use getExample */
export const getPattern = getExample;

/** @deprecated Use listExamples */
export const listPatterns = listExamples;

/** @deprecated Use listExamplesByDifficulty */
export function listPatternsByCategory(
  difficulty: ExampleDifficulty,
): ExampleMeta[] {
  return listExamplesByDifficulty(difficulty);
}

export { exampleRegistry as patternRegistry };
