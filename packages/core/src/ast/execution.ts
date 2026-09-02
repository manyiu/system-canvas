import type { PacketTrace } from "./payload.js";
import type { StepAnimation, StepInteraction } from "./interaction.js";
import type { Primitive } from "./primitives.js";
import type { VisualDirective } from "./visuals.js";

export interface StateSnapshot {
  stepIndex: number;
  timestamp: number;
  nodeStates: Record<string, Record<string, unknown>>;
}

export interface ExecutionStep {
  index: number;
  timestamp: number;
  name: string;
  pattern?: string;
  interactions: StepInteraction[];
  animations?: StepAnimation[];
  visuals?: VisualDirective[];
  primitives: Primitive[];
  description?: string;
  traces: PacketTrace[];
  snapshot?: StateSnapshot;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  graphId: string;
  initialState: Record<string, Record<string, unknown>>;
  steps: ExecutionStep[];
}

export type PlaybackState = "idle" | "playing" | "paused";

export interface Timeline {
  scenarioId: string;
  currentStep: number;
  playbackState: PlaybackState;
  speed: number;
  totalSteps: number;
}

export interface ExecutionResult {
  step: ExecutionStep;
  traces: PacketTrace[];
  snapshot?: StateSnapshot;
  /** Resolved from step.interactions or derived emit primitives; used for payload labels in 3c. */
  resolvedInteractions: StepInteraction[];
  activeChannelIds: string[];
}
