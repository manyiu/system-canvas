import type { ExampleDifficulty, ExampleMeta } from "@system-canvas/core";
import { listExamples } from "@system-canvas/patterns";

const DIFFICULTY_ORDER: ExampleDifficulty[] = [
  "easy",
  "medium",
  "hard",
  "community",
];

const DIFFICULTY_LABELS: Record<ExampleDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  community: "More Practice",
};

export function groupExamplesByDifficulty(
  examples: ExampleMeta[] = listExamples(),
): {
  difficulty: ExampleDifficulty;
  label: string;
  examples: ExampleMeta[];
}[] {
  return DIFFICULTY_ORDER.map((difficulty) => ({
    difficulty,
    label: DIFFICULTY_LABELS[difficulty],
    examples: examples.filter((e) => e.difficulty === difficulty),
  })).filter((group) => group.examples.length > 0);
}

export function exampleDisplayName(id: string | null): string {
  if (id === null) return "Custom";
  return listExamples().find((e) => e.id === id)?.name ?? id;
}

/** @deprecated */
export const groupPatternsByCategory = groupExamplesByDifficulty;

/** @deprecated */
export const patternDisplayName = exampleDisplayName;
