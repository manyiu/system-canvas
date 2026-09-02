export type PatternCategory = "data-consistency" | "resilience" | "traffic-distribution";
export interface PatternMeta {
    id: string;
    name: string;
    category: PatternCategory;
    description: string;
    tags: string[];
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