import type { ExecutionResult, Scenario } from "../ast/execution.js";
import type { PacketTrace } from "../ast/payload.js";
import type { SystemGraph } from "../ast/system.js";
import {
  activeChannelIdsFromStep,
  deriveInteractions,
} from "./step-resolution.js";

function makeTraceId(): string {
  return `trace_${Math.random().toString(36).slice(2, 9)}`;
}

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
        throw new Error(
          `Step ${stepIndex} not found in scenario ${scenario.id}`,
        );
      }

      // Per-step execution: each step starts from initialState + node.state.
      // Phase 3b will fold prior step snapshots for cumulative simulation.
      const nodeStates: Record<string, Record<string, unknown>> = {};
      for (const node of graph.nodes) {
        nodeStates[node.id] = {
          ...(scenario.initialState[node.id] ?? {}),
          ...node.state,
        };
      }

      const traces: PacketTrace[] = [];

      for (const primitive of step.primitives) {
        if (primitive.kind === "mutate") {
          nodeStates[primitive.nodeId] = {
            ...nodeStates[primitive.nodeId],
            ...primitive.patch,
          };
        }

        if (primitive.kind === "emit") {
          const channel = graph.channels.find(
            (c) => c.id === primitive.channelId,
          );
          if (!channel) {
            if (process.env.NODE_ENV !== "production") {
              console.warn(
                `[system-canvas] emit primitive references unknown channel "${primitive.channelId}"`,
              );
            }
            continue;
          }
          traces.push({
            id: makeTraceId(),
            payload: primitive.payload,
            channelId: primitive.channelId,
            sourceNodeId: channel.source,
            targetNodeId: channel.target,
            stepIndex,
            timestamp: step.timestamp,
            status: "in-flight",
          });
        }
      }

      const resolvedInteractions = deriveInteractions(graph, step);
      const activeChannelIds = activeChannelIdsFromStep(
        graph,
        step,
        resolvedInteractions,
      );

      return {
        step,
        traces: traces.length > 0 ? traces : [...step.traces],
        snapshot: {
          stepIndex,
          timestamp: step.timestamp,
          nodeStates,
        },
        resolvedInteractions,
        activeChannelIds,
      };
    },
  };
}
