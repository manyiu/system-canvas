import type { StepInteraction } from "../ast/interaction.js";
import type { ExecutionStep } from "../ast/execution.js";
import type { SystemGraph } from "../ast/system.js";

export function deriveInteractions(
  graph: SystemGraph,
  step: ExecutionStep,
): StepInteraction[] {
  if (step.interactions.length > 0) {
    return step.interactions;
  }

  const interactions: StepInteraction[] = [];
  for (const primitive of step.primitives) {
    if (primitive.kind !== "emit") continue;
    const channel = graph.channels.find((c) => c.id === primitive.channelId);
    if (!channel) continue;
    interactions.push({
      source: channel.source,
      target: channel.target,
      label: channel.label ?? primitive.payload.type,
      payload: primitive.payload,
    });
  }
  return interactions;
}

export function activeChannelIdsFromStep(
  graph: SystemGraph,
  step: ExecutionStep,
  interactions: StepInteraction[],
): string[] {
  const ids = new Set<string>();

  for (const primitive of step.primitives) {
    if (primitive.kind === "emit") {
      ids.add(primitive.channelId);
    }
  }

  if (ids.size > 0) {
    return [...ids];
  }

  for (const interaction of interactions) {
    const src =
      typeof interaction.source === "string"
        ? interaction.source
        : interaction.source.nodeId;
    const tgt =
      typeof interaction.target === "string"
        ? interaction.target
        : interaction.target.nodeId;
    const match = graph.channels.find(
      (c) => c.source === src && c.target === tgt,
    );
    if (match) ids.add(match.id);
  }

  return [...ids];
}
