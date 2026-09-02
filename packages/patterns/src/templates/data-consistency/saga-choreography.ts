import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const sagaChoreographyPattern: PatternFactory = {
  id: "saga-choreography",
  meta: {
    id: "saga-choreography",
    name: "Saga (Choreography)",
    category: "data-consistency",
    description:
      "Autonomous event-chaining without a central coordinator.",
    tags: ["saga", "choreography", "events"],
    defaultScenarioId: "saga-choreography-default",
  },
  create() {
    const graph = createGraph("saga-choreography", "Saga Choreography", "v1", [
      node("ServiceA", "service", "Order Service", { icon: "microservice" }),
      node("ServiceB", "service", "Payment Service", { icon: "microservice" }),
      node("ServiceC", "service", "Shipping Service", { icon: "microservice" }),
      node("EventBus", "queue", "Event Bus", { icon: "kafka" }),
    ], [
      { id: "ch1", source: "ServiceA", target: "EventBus" },
      { id: "ch2", source: "EventBus", target: "ServiceB" },
      { id: "ch3", source: "ServiceB", target: "EventBus" },
      { id: "ch4", source: "EventBus", target: "ServiceC" },
    ]);

    const scenario = createScenario("Choreographed Flow", graph.id, [
      createStep(0, "Order Created", {
        pattern: "saga-choreography",
        primitives: [{
          kind: "emit",
          nodeId: "ServiceA",
          channelId: "ch1",
          payload: createPayload("OrderCreated", { orderId: 1 }),
        }],
      }),
      createStep(1, "Payment Requested", {
        pattern: "saga-choreography",
        primitives: [{
          kind: "emit",
          nodeId: "ServiceB",
          channelId: "ch3",
          payload: createPayload("PaymentRequested", { orderId: 1 }),
        }],
      }),
      createStep(2, "Payment Failed — Cancel Order", {
        pattern: "saga-choreography",
        primitives: [{
          kind: "emit",
          nodeId: "ServiceA",
          channelId: "ch1",
          payload: createPayload("OrderCancelled", { orderId: 1 }),
        }],
        visuals: [
          { kind: "signal", targetId: "ServiceA", color: "red", state: "compensating" },
        ],
      }),
    ], "saga-choreography-default");

    return createDocument(graph, [scenario]);
  },
};
