import type { PayloadKind, RelationshipKind } from "./flow.js";

export type { PayloadKind, RelationshipKind } from "./flow.js";
export {
  inferDeliveryFromRelationship,
  isAsyncRelationship,
  isSyncRelationship,
  parsePayloadKind,
  parseRelationshipKind,
} from "./flow.js";

export type NodeKind = "service" | "database" | "queue" | "gateway" | "external" | "custom";

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

/** Spatial boundary: bounded context, VPC, trust zone, etc. */
export interface Network {
  id: string;
  label: string;
  kind?: "bounded-context" | "vpc" | "zone" | "cluster" | "custom";
  description?: string;
}

export interface SystemNode {
  id: string;
  kind: NodeKind;
  label: string;
  description?: string;
  position?: Position;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Parent network / bounded context */
  networkId?: string;
  ports?: NodePort[];
  icon?: string;
  config?: Record<string, unknown>;
  behaviors: BehaviorRef[];
}

/** How data moves across a channel — drives edge styling and animation. */
export type FlowDelivery = "sync" | "async";

/** React Flow connection point on a node border. */
export type HandlePosition = "left" | "right" | "top" | "bottom";

export interface Channel {
  id: string;
  source: string;
  target: string;
  label?: string;
  payloadType?: string;
  /** sync = call/wait (solid line); async = message/event (dashed line) */
  delivery?: FlowDelivery;
  /** Semantic relationship for architecture review */
  relationship?: RelationshipKind;
  payloadKind?: PayloadKind;
  /** Connection point on source node; auto-derived from layout when omitted */
  sourceHandle?: HandlePosition;
  /** Connection point on target node; auto-derived from layout when omitted */
  targetHandle?: HandlePosition;
  metadata?: Record<string, unknown>;
}

export interface SystemGraph {
  id: string;
  name: string;
  version: string;
  nodes: SystemNode[];
  channels: Channel[];
  networks?: Network[];
}
