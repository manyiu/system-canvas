import type { ExecutionResult, Scenario } from "../ast/execution.js";
import type { PacketTrace } from "../ast/payload.js";
import type { Primitive } from "../ast/primitives.js";
import type { SystemGraph } from "../ast/system.js";
import {
  activeChannelIdsFromStep,
  deriveInteractions,
} from "./step-resolution.js";

function makeTraceId(): string {
  return `trace_${Math.random().toString(36).slice(2, 9)}`;
}

function applyMutate(
  nodeStates: Record<string, Record<string, unknown>>,
  primitive: Extract<Primitive, { kind: "mutate" }>,
): void {
  nodeStates[primitive.nodeId] = {
    ...nodeStates[primitive.nodeId],
    ...primitive.patch,
  };
}

function seedNodeStates(
  graph: SystemGraph,
  scenario: Scenario,
): Record<string, Record<string, unknown>> {
  const nodeStates: Record<string, Record<string, unknown>> = {};
  for (const node of graph.nodes) {
    nodeStates[node.id] = {
      ...(scenario.initialState[node.id] ?? {}),
      ...node.state,
    };
  }
  return nodeStates;
}

/** Fold mutate patches from steps [0, beforeIndex). */
function foldPriorMutates(
  nodeStates: Record<string, Record<string, unknown>>,
  scenario: Scenario,
  beforeIndex: number,
): void {
  for (let i = 0; i < beforeIndex; i++) {
    const prior = scenario.steps[i];
    if (!prior) continue;
    for (const primitive of prior.primitives) {
      if (primitive.kind === "mutate") {
        applyMutate(nodeStates, primitive);
      }
    }
  }
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

      const nodeStates = seedNodeStates(graph, scenario);
      foldPriorMutates(nodeStates, scenario, stepIndex);

      const traces: PacketTrace[] = [];

      for (const primitive of step.primitives) {
        if (primitive.kind === "mutate") {
          applyMutate(nodeStates, primitive);
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
