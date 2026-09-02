import type { Payload } from "./payload.js";

export interface EmitPrimitive {
  kind: "emit";
  nodeId: string;
  channelId: string;
  payload: Payload;
}

export interface TransformPrimitive {
  kind: "transform";
  nodeId: string;
  inputPayloadId: string;
  outputPayload: Payload;
  fn?: string;
}

export interface GatePrimitive {
  kind: "gate";
  nodeId: string;
  condition: string;
  onTrue: Primitive[];
  onFalse?: Primitive[];
}

export interface MutateStatePrimitive {
  kind: "mutate";
  nodeId: string;
  patch: Record<string, unknown>;
}

export interface DelayPrimitive {
  kind: "delay";
  durationMs: number;
}

export interface DropPrimitive {
  kind: "drop";
  nodeId: string;
  payloadId: string;
  reason?: string;
}

/** Step 4: simulate remote call with success/failure branches */
export interface InvokePrimitive {
  kind: "invoke";
  sourceNodeId: string;
  targetNodeId: string;
  payload: Payload;
  onSuccess: Primitive[];
  onFailure: Primitive[];
}

/** Step 4: jump back to handler entry */
export interface RetryPrimitive {
  kind: "retry";
  targetStepId: string;
  maxAttempts?: number;
}

export type Primitive =
  | EmitPrimitive
  | TransformPrimitive
  | GatePrimitive
  | MutateStatePrimitive
  | DelayPrimitive
  | DropPrimitive
  | InvokePrimitive
  | RetryPrimitive;
