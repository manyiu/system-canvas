import type { ExecutionResult, Scenario } from "../ast/execution.js";
import type { SystemGraph } from "../ast/system.js";
export interface Executor {
    executeStep(graph: SystemGraph, scenario: Scenario, stepIndex: number): ExecutionResult;
}
export declare function createExecutor(): Executor;
//# sourceMappingURL=executor.d.ts.map