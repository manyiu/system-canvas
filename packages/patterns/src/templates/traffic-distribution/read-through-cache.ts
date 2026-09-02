import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const readThroughCachePattern: PatternFactory = {
  id: "read-through-cache",
  meta: {
    id: "read-through-cache",
    name: "Read-Through Cache",
    category: "traffic-distribution",
    description:
      "Cache miss triggers DB query; cache populates and returns to app.",
    tags: ["cache", "read-through"],
    defaultScenarioId: "read-through-cache-default",
  },
  create() {
    const graph = createGraph("read-through-cache", "Read-Through Cache", "v1", [
      node("App", "service", "Application", { icon: "microservice" }),
      node("Cache", "database", "Cache", { icon: "redis" }),
      node("DB", "database", "Database", { icon: "postgres" }),
    ], [
      { id: "ch1", source: "App", target: "Cache", delivery: "sync" },
      { id: "ch2", source: "Cache", target: "DB", delivery: "sync" },
    ]);

    const scenario = createScenario("Cache Miss Flow", graph.id, [
      createStep(0, "Read Cache", {
        pattern: "read-through-cache",
        visuals: [
          { kind: "highlight", targetId: "Cache", color: "yellow", label: "Cache Miss" },
        ],
      }),
      createStep(1, "Query DB", {
        pattern: "read-through-cache",
        visuals: [
          { kind: "signal", targetId: "DB", color: "green" },
        ],
      }),
      createStep(2, "Populate Cache", {
        pattern: "read-through-cache",
        visuals: [
          { kind: "highlight", targetId: "Cache", color: "green", label: "Populated" },
        ],
      }),
    ], "read-through-cache-default");

    return createDocument(graph, [scenario]);
  },
};
