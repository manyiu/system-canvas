import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const writeThroughCachePattern: PatternFactory = {
  id: "write-through-cache",
  meta: {
    id: "write-through-cache",
    name: "Write-Through Cache",
    category: "traffic-distribution",
    description:
      "Write updates cache and DB synchronously in a single block.",
    tags: ["cache", "write-through"],
    defaultScenarioId: "write-through-cache-default",
  },
  create() {
    const graph = createGraph("write-through-cache", "Write-Through Cache", "v1", [
      node("App", "service", "Application", { icon: "microservice" }),
      node("Cache", "database", "Cache", { icon: "redis" }),
      node("DB", "database", "Database", { icon: "postgres" }),
    ], [
      { id: "ch1", source: "App", target: "Cache" },
      { id: "ch2", source: "Cache", target: "DB" },
    ]);

    const scenario = createScenario("Synchronous Write", graph.id, [
      createStep(0, "Write to Cache and DB", {
        pattern: "write-through-cache",
        visuals: [
          { kind: "signal", targetId: "Cache", color: "green", label: "Write" },
          { kind: "signal", targetId: "DB", color: "green", label: "Write" },
        ],
      }),
    ]);

    return createDocument(graph, [scenario]);
  },
};
