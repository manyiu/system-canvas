export type NodeKind =
  | "service"
  | "database"
  | "queue"
  | "gateway"
  | "external"
  | "custom";

export interface Position {
  x: number;
  y: number;
}

export interface NodePort {
  id: string;
  label: string;
  nodeId: string;
}

export interface BehaviorRef {
  id: string;
  trigger: "onReceive" | "onEmit" | "onTimer" | "manual";
  primitives: import("./primitives.js").Primitive[];
}

export interface SystemNode {
  id: string;
  kind: NodeKind;
  label: string;
  description?: string;
  position?: Position;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ports?: NodePort[];
  icon?: string;
  config?: Record<string, unknown>;
  behaviors: BehaviorRef[];
}

export interface Channel {
  id: string;
  source: string;
  target: string;
  label?: string;
  payloadType?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemGraph {
  id: string;
  name: string;
  version: string;
  nodes: SystemNode[];
  channels: Channel[];
}
