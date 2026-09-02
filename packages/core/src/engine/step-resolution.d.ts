import type { StepInteraction } from "../ast/interaction.js";
import type { ExecutionStep } from "../ast/execution.js";
import type { SystemGraph } from "../ast/system.js";
export declare function deriveInteractions(graph: SystemGraph, step: ExecutionStep): StepInteraction[];
export declare function activeChannelIdsFromStep(graph: SystemGraph, step: ExecutionStep, interactions: StepInteraction[]): string[];
//# sourceMappingURL=step-resolution.d.ts.map