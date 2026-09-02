import { BaseSystemNode } from "./BaseSystemNode.js";

export const ServiceNode = BaseSystemNode;
export const DatabaseNode = BaseSystemNode;
export const QueueNode = BaseSystemNode;
export const GatewayNode = BaseSystemNode;
export const ExternalNode = BaseSystemNode;

export const nodeTypes = {
  service: ServiceNode,
  database: DatabaseNode,
  queue: QueueNode,
  gateway: GatewayNode,
  external: ExternalNode,
};
