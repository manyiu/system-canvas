import type { Primitive } from "./primitives.js";
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
/** Expression subset for pattern conditions (Step 4 MVP). */
export type PatternExpr = {
    kind: "literal";
    value: number | string | boolean;
} | {
    kind: "ref";
    path: string[];
} | {
    kind: "compare";
    op: "<" | "<=" | ">" | ">=" | "==" | "!=";
    left: PatternExpr;
    right: PatternExpr;
};
/** Behavioral statements inside onEvent handlers. */
export type PatternStmt = {
    kind: "invoke";
    /** Binding or node id (e.g. "target") */
    target: string;
    method: string;
    payloadBinding: string;
    onSuccess?: PatternStmt[];
    onFailure?: PatternStmt[];
} | {
    kind: "if";
    condition: PatternExpr;
    then: PatternStmt[];
    else?: PatternStmt[];
} | {
    kind: "retry";
} | {
    kind: "emit";
    payloadType: string;
    payloadBinding: string;
    /** Binding or node id for emit target */
    target: string;
} | {
    kind: "hold";
    payloadBinding: string;
    durationMs: number;
    label?: string;
} | {
    kind: "mutate";
    nodeId: string;
    patch: Record<string, unknown>;
};
export interface PatternEventHandler {
    event: string;
    payloadBinding: string;
    body: PatternStmt[];
}
/** Custom pattern definition authored in DSL (`pattern Name { … }`). */
export interface CustomPatternDefinition {
    id: string;
    name: string;
    params: PatternParam[];
    handlers: PatternEventHandler[];
}
/** Scripted invoke branch for deterministic expansion. */
export type InvokeOutcome = "ok" | "fail";
/** Bindings for expanding a pattern into linear scenario steps. */
export interface PatternExpandContext {
    /** Node that originates the request emit */
    sourceNodeId: string;
    /** Resolves binding names (target, DLQ, …) to node ids */
    bindings: Record<string, string>;
    /** Channel for the primary invoke/request emit */
    channelId: string;
    /** Optional channel for dead-letter / secondary emits (required when pattern emits) */
    dlqChannelId?: string;
    /** Which onEvent handler to expand */
    event: string;
    /** Scripted outcomes per attempt (no RNG) */
    outcomes: InvokeOutcome[];
    /** Override pattern params */
    params?: Record<string, unknown>;
    /** Tag written onto generated steps */
    patternTag?: string;
}
/** @internal helper for tests / callers that need empty primitives */
export type PatternPrimitive = Primitive;
//# sourceMappingURL=patterns.d.ts.map