export type SignalColor = "green" | "yellow" | "red" | "neutral";

export type NodeVisualState = "active" | "inactive" | "failed" | "compensating" | "barrier";

export interface VisualDirective {
  kind: "highlight" | "signal" | "barrier" | "lag" | "consume" | "bounce" | "hold";
  targetId: string;
  payloadId?: string;
  color?: SignalColor;
  state?: NodeVisualState;
  durationMs?: number;
  label?: string;
}
