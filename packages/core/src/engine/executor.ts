import type {
  ExecutionResult,
  Scenario,
  Timeline,
} from "../ast/execution.js";
import type { SystemGraph } from "../ast/system.js";

export interface Executor {
  executeStep(
    graph: SystemGraph,
    scenario: Scenario,
    stepIndex: number,
  ): ExecutionResult;
}

export function createExecutor(): Executor {
  return {
    executeStep(graph, scenario, stepIndex) {
      const step = scenario.steps[stepIndex];
      if (!step) {
        throw new Error(`Step ${stepIndex} not found in scenario ${scenario.id}`);
      }

      const nodeStates: Record<string, Record<string, unknown>> = {};
      for (const node of graph.nodes) {
        nodeStates[node.id] = { ...node.state };
      }

      return {
        step,
        traces: [...step.traces],
        snapshot: {
          stepIndex,
          timestamp: step.timestamp,
          nodeStates,
        },
      };
    },
  };
}
