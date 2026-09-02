import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const circuitBreakerPattern: PatternFactory = {
  id: "circuit-breaker",
  meta: {
    id: "circuit-breaker",
    name: "Circuit Breaker",
    category: "resilience",
    description:
      "Closed → Open (barrier) → Half-Open trickle on failure threshold.",
    tags: ["resilience", "fault-tolerance"],
    defaultScenarioId: "circuit-breaker-default",
  },
  create() {
    const graph = createGraph("circuit-breaker", "Circuit Breaker", "v1", [
      node("Client", "external", "Client", { icon: "external" }),
      node("Gateway", "gateway", "API Gateway", {
        icon: "gateway",
        ports: [{ id: "breaker", label: "Circuit Breaker", nodeId: "Gateway" }],
      }),
      node("Service", "service", "Downstream Service", { icon: "microservice" }),
    ], [
      { id: "ch1", source: "Client", target: "Gateway", delivery: "sync" },
      { id: "ch2", source: "Gateway", target: "Service", delivery: "sync" },
    ]);

    const scenario = createScenario("Circuit Breaker States", graph.id, [
      createStep(0, "Closed — Traffic Flows", {
        pattern: "circuit-breaker",
        visuals: [
          { kind: "signal", targetId: "Gateway", color: "green", state: "active" },
        ],
      }),
      createStep(1, "Open — Barrier Drops", {
        pattern: "circuit-breaker",
        visuals: [
          { kind: "barrier", targetId: "breaker", color: "red", state: "barrier" },
          { kind: "bounce", targetId: "Client", color: "red" },
        ],
      }),
      createStep(2, "Half-Open — Trickle Test", {
        pattern: "circuit-breaker",
        visuals: [
          { kind: "signal", targetId: "Gateway", color: "yellow", label: "Half-Open" },
        ],
      }),
    ], "circuit-breaker-default");

    return createDocument(graph, [scenario]);
  },
};
