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
    tags: ["transaction", "messaging", "consistency", "architecture-review"],
    defaultScenarioId: "outbox-happy-path",
  },
  create() {
    const graph = createGraph(
      "outbox",
      "Transactional Outbox",
      "v1",
      [
        node("OrderService", "service", "Order Service", {
          icon: "microservice",
          networkId: "order-processing",
        }),
        node("DB", "database", "Orders DB", {
          icon: "postgres",
          networkId: "order-processing",
          ports: [{ id: "outbox", label: "Outbox Table", nodeId: "DB" }],
        }),
        node("Poller", "service", "Outbox Poller", {
          icon: "microservice",
          networkId: "messaging",
        }),
        node("Kafka", "queue", "Kafka", {
          icon: "kafka",
          networkId: "messaging",
          config: { topic: "order-events" },
        }),
      ],
      [
        {
          id: "ch1",
          source: "OrderService",
          target: "DB",
          label: "persist",
          delivery: "sync",
          relationship: "command",
          payloadKind: "command",
        },
        {
          id: "ch2",
          source: "DB",
          target: "Poller",
          label: "poll",
          delivery: "async",
          relationship: "poll",
          payloadKind: "record",
        },
        {
          id: "ch3",
          source: "Poller",
          target: "Kafka",
          label: "publish",
          delivery: "async",
          relationship: "event",
          payloadKind: "event",
        },
      ],
      [
        {
          id: "order-processing",
          label: "Order Processing",
          kind: "bounded-context",
          description: "Transactional write path",
        },
        {
          id: "messaging",
          label: "Messaging",
          kind: "bounded-context",
          description: "Async event delivery",
        },
      ],
    );

    const happyPath = createScenario(
      "Happy Path",
      graph.id,
      [
        createStep(0, "Dual Write", {
          pattern: "outbox",
          description: "Sync command persists order + outbox row in one transaction.",
          primitives: [{
            kind: "emit",
            nodeId: "OrderService",
            channelId: "ch1",
            payload: createPayload("PlaceOrder", { orderId: 101 }),
          }],
          visuals: [
            { kind: "highlight", targetId: "DB", color: "yellow", label: "Transaction" },
            { kind: "highlight", targetId: "outbox", color: "yellow" },
          ],
        }),
        createStep(1, "Poller Dispatch", {
          pattern: "outbox",
          description: "Async event published after outbox poll — decoupled from caller.",
          primitives: [{
            kind: "emit",
            nodeId: "Poller",
            channelId: "ch3",
            payload: createPayload("OrderCreated", { orderId: 101, status: "PENDING" }),
          }],
          visuals: [{ kind: "signal", targetId: "Kafka", color: "green" }],
        }),
      ],
      "outbox-happy-path",
    );

    const kafkaDown = createScenario(
      "Kafka Down",
      graph.id,
      [
        createStep(0, "Dual Write Succeeds", {
          pattern: "outbox",
          description: "Order committed; outbox row written — broker outage does not roll back DB.",
          primitives: [{
            kind: "emit",
            nodeId: "OrderService",
            channelId: "ch1",
            payload: createPayload("PlaceOrder", { orderId: 102 }),
          }],
          visuals: [
            { kind: "highlight", targetId: "DB", color: "yellow", label: "Transaction" },
          ],
        }),
        createStep(1, "Publish Blocked", {
          pattern: "outbox",
          description: "Poller retries; events accumulate in outbox until Kafka recovers.",
          visuals: [
            { kind: "barrier", targetId: "Kafka", color: "red", label: "BROKER DOWN" },
            { kind: "hold", targetId: "outbox", color: "yellow", label: "Backlog" },
          ],
        }),
      ],
      "outbox-kafka-down",
    );

    const duplicatePublish = createScenario(
      "Duplicate Publish",
      graph.id,
      [
        createStep(0, "At-Least-Once Delivery", {
          pattern: "outbox",
          description: "Poller may deliver same outbox row twice after crash.",
          primitives: [{
            kind: "emit",
            nodeId: "Poller",
            channelId: "ch3",
            payload: createPayload("OrderCreated", { orderId: 101 }),
          }],
          visuals: [{ kind: "signal", targetId: "Kafka", color: "green" }],
        }),
        createStep(1, "Consumer Idempotency Required", {
          pattern: "outbox",
          description: "Downstream must dedupe by event id — review checklist item.",
          visuals: [
            { kind: "highlight", targetId: "Kafka", color: "yellow", label: "Duplicate?" },
          ],
        }),
      ],
      "outbox-duplicate-publish",
    );

    return createDocument(graph, [happyPath, kafkaDown, duplicatePublish]);
  },
};
