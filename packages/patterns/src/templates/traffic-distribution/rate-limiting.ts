import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const rateLimitingPattern: PatternFactory = {
  id: "rate-limiting",
  meta: {
    id: "rate-limiting",
    name: "Rate Limiting (Token Bucket)",
    category: "traffic-distribution",
    description:
      "Token bucket fills at rate r; empty bucket drops requests.",
    tags: ["rate-limiting", "token-bucket", "gateway"],
    defaultScenarioId: "rate-limiting-default",
  },
  create() {
    const graph = createGraph("rate-limiting", "Rate Limiting", "v1", [
      node("Client", "external", "Client", { icon: "external" }),
      node("Gateway", "gateway", "API Gateway", {
        icon: "gateway",
        ports: [{ id: "bucket", label: "Token Bucket", nodeId: "Gateway" }],
      }),
      node("Service", "service", "Backend Service", { icon: "microservice" }),
    ], [
      { id: "ch1", source: "Client", target: "Gateway", delivery: "sync" },
      { id: "ch2", source: "Gateway", target: "Service", delivery: "sync" },
    ]);

    const scenario = createScenario("Token Bucket", graph.id, [
      createStep(0, "Bucket Has Tokens", {
        pattern: "rate-limiting",
        visuals: [
          { kind: "consume", targetId: "bucket", color: "green", label: "Token consumed" },
          { kind: "signal", targetId: "Service", color: "green" },
        ],
      }),
      createStep(1, "Bucket Empty — Request Dropped", {
        pattern: "rate-limiting",
        visuals: [
          { kind: "bounce", targetId: "Gateway", color: "red", label: "Rate limited" },
        ],
      }),
    ], "rate-limiting-default");

    return createDocument(graph, [scenario]);
  },
};
