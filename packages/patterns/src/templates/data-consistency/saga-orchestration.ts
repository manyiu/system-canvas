import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const sagaOrchestrationPattern: PatternFactory = {
  id: "saga-orchestration",
  meta: {
    id: "saga-orchestration",
    name: "Saga (Orchestration)",
    category: "data-consistency",
    description:
      "Central orchestrator coordinates services; compensating actions on failure.",
    tags: ["saga", "orchestration", "compensation"],
    defaultScenarioId: "saga-orchestration-default",
  },
  create() {
    const graph = createGraph("saga-orchestration", "Saga Orchestration", "v1", [
      node("Orchestrator", "service", "Saga Orchestrator", { icon: "microservice" }),
      node("ServiceA", "service", "Inventory Service", { icon: "microservice" }),
      node("ServiceB", "service", "Payment Service", { icon: "microservice" }),
      node("ServiceC", "service", "Shipping Service", { icon: "microservice" }),
      node("DLQ", "queue", "Dead Letter Queue", { icon: "kafka" }),
    ], [
      { id: "ch1", source: "Orchestrator", target: "ServiceA", delivery: "sync" },
      { id: "ch2", source: "Orchestrator", target: "ServiceB", delivery: "sync" },
      { id: "ch3", source: "Orchestrator", target: "ServiceC", delivery: "sync" },
    ]);

    const scenario = createScenario("Saga Happy Path + Compensation", graph.id, [
      createStep(0, "Reserve Inventory", {
        pattern: "saga-orchestration",
        primitives: [{
          kind: "emit",
          nodeId: "Orchestrator",
          channelId: "ch1",
          payload: createPayload("ReserveInventory", { orderId: 1 }),
        }],
        visuals: [{ kind: "signal", targetId: "ServiceA", color: "green" }],
      }),
      createStep(1, "Process Payment", {
        pattern: "saga-orchestration",
        primitives: [{
          kind: "emit",
          nodeId: "Orchestrator",
          channelId: "ch2",
          payload: createPayload("ChargePayment", { orderId: 1 }),
        }],
        visuals: [{ kind: "signal", targetId: "ServiceB", color: "green" }],
      }),
      createStep(2, "Payment Failed — Compensate", {
        pattern: "saga-orchestration",
        primitives: [{
          kind: "emit",
          nodeId: "Orchestrator",
          channelId: "ch1",
          payload: createPayload("ReleaseInventory", { orderId: 1 }),
        }],
        visuals: [
          { kind: "signal", targetId: "ServiceA", color: "red", state: "compensating" },
        ],
      }),
    ], "saga-orchestration-default");

    return createDocument(graph, [scenario]);
  },
};
