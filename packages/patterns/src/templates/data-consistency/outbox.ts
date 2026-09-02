import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const outboxPattern: PatternFactory = {
  id: "outbox",
  meta: {
    id: "outbox",
    name: "Transactional Outbox",
    category: "data-consistency",
    description:
      "Dual-write to DB and outbox table in a transaction; poller publishes to queue.",
    tags: ["transaction", "messaging", "consistency"],
    defaultScenarioId: "outbox-default",
  },
  create() {
    const graph = createGraph("outbox", "Transactional Outbox", "v1", [
      node("OrderService", "service", "Order Service", { icon: "microservice" }),
      node("DB", "database", "Orders DB", {
        icon: "postgres",
        ports: [{ id: "outbox", label: "Outbox Table", nodeId: "DB" }],
      }),
      node("Poller", "service", "Outbox Poller", { icon: "microservice" }),
      node("Kafka", "queue", "Kafka", { icon: "kafka", config: { topic: "order-events" } }),
    ], [
      { id: "ch1", source: "OrderService", target: "DB", label: "persist" },
      { id: "ch2", source: "DB", target: "Poller", label: "poll" },
      { id: "ch3", source: "Poller", target: "Kafka", label: "publish" },
    ]);

    const scenario = createScenario("Transactional Outbox", graph.id, [
      createStep(0, "Dual Write", {
        pattern: "outbox",
        primitives: [{
          kind: "emit",
          nodeId: "OrderService",
          channelId: "ch1",
          payload: createPayload("OrderCreated", { orderId: 101 }),
        }],
        visuals: [
          { kind: "highlight", targetId: "DB", color: "yellow", label: "Transaction" },
          { kind: "highlight", targetId: "outbox", color: "yellow" },
        ],
      }),
      createStep(1, "Poller Dispatch", {
        pattern: "outbox",
        primitives: [{
          kind: "emit",
          nodeId: "Poller",
          channelId: "ch3",
          payload: createPayload("OrderCreated", { orderId: 101, status: "PENDING" }),
        }],
        visuals: [
          { kind: "signal", targetId: "Kafka", color: "green" },
        ],
      }),
    ]);

    return createDocument(graph, [scenario]);
  },
};
