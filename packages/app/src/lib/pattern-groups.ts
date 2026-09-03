import type { PatternCategory, PatternMeta } from "@system-canvas/core";
import { listPatterns } from "@system-canvas/patterns";

const CATEGORY_ORDER: PatternCategory[] = [
  "data-consistency",
  "resilience",
  "traffic-distribution",
];

const CATEGORY_LABELS: Record<PatternCategory, string> = {
  "data-consistency": "Data Consistency",
  resilience: "Resilience",
  "traffic-distribution": "Traffic Distribution",
};

export function groupPatternsByCategory(patterns: PatternMeta[] = listPatterns()): {
  category: PatternCategory;
  label: string;
  patterns: PatternMeta[];
}[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    patterns: patterns.filter((p) => p.category === category),
  })).filter((group) => group.patterns.length > 0);
}

export function patternDisplayName(id: string | null): string {
  if (id === null) return "Custom";
  return listPatterns().find((p) => p.id === id)?.name ?? id;
}
