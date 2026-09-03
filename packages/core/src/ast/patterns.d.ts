export type PatternCategory = "data-consistency" | "resilience" | "traffic-distribution";
/** @deprecated Use ExampleDifficulty for interview examples */
export interface PatternMeta {
    id: string;
    name: string;
    category: PatternCategory;
    description: string;
    tags: string[];
    defaultScenarioId: string;
}
export type ExampleDifficulty = "easy" | "medium" | "hard" | "community";
export type LayoutHint = "pipeline" | "hub" | "tiered" | "manual";
export interface ExampleMeta {
    id: string;
    name: string;
    difficulty: ExampleDifficulty;
    description: string;
    tags: string[];
    patternsUsed: string[];
    layoutHint: LayoutHint;
    defaultScenarioId: string;
}
export interface PatternParam {
    name: string;
    defaultValue: unknown;
}
/** Stub for Step 4 custom pattern DSL */
export interface CustomPatternDefinition {
    id: string;
    name: string;
    params: PatternParam[];
    behaviors: unknown[];
}
//# sourceMappingURL=patterns.d.ts.map