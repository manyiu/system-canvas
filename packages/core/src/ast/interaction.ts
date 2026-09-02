import type { Payload } from "./payload.js";
import type { Primitive } from "./primitives.js";
import type { VisualDirective } from "./visuals.js";

export type NodeRef = string | { nodeId: string; portId?: string };

export interface StepInteraction {
  source: NodeRef;
  target: NodeRef;
  label: string;
  payload?: Payload;
  annotations?: string[];
}

export interface StepAnimation {
  payload: Payload;
}
