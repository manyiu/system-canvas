import type { PatternCategory } from "@system-canvas/core";

export type { PatternCategory };

export interface PatternFactory {
  id: string;
  meta: {
    id: string;
    name: string;
    category: PatternCategory;
    description: string;
    tags: string[];
    defaultScenarioId: string;
  };
  create: () => import("@system-canvas/core").SystemDocument;
}
