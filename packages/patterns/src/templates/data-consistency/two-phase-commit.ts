import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const twoPhaseCommitPattern: PatternFactory = {
  id: "two-phase-commit",
  meta: {
    id: "two-phase-commit",
    name: "Two-Phase Commit (2PC)",
    category: "data-consistency",
    description:
      "Coordinator sends Prepare; all agree → Commit, any fail → Abort.",
    tags: ["2pc", "distributed-transaction"],
    defaultScenarioId: "2pc-default",
  },
  create() {
    const graph = createGraph("two-phase-commit", "Two-Phase Commit", "v1", [
      node("Coordinator", "service", "Transaction Coordinator", { icon: "microservice" }),
      node("DB1", "database", "Participant DB 1", { icon: "postgres" }),
      node("DB2", "database", "Participant DB 2", { icon: "postgres" }),
    ], [
      { id: "ch1", source: "Coordinator", target: "DB1" },
      { id: "ch2", source: "Coordinator", target: "DB2" },
    ]);

    const scenario = createScenario("2PC Vote", graph.id, [
      createStep(0, "Phase 1: Prepare", {
        pattern: "two-phase-commit",
        visuals: [
          { kind: "signal", targetId: "DB1", color: "yellow", label: "Prepare" },
          { kind: "signal", targetId: "DB2", color: "yellow", label: "Prepare" },
        ],
      }),
      createStep(1, "Phase 2: Commit", {
        pattern: "two-phase-commit",
        visuals: [
          { kind: "signal", targetId: "DB1", color: "green", label: "Commit" },
          { kind: "signal", targetId: "DB2", color: "green", label: "Commit" },
        ],
      }),
      createStep(2, "Phase 2: Abort (failure path)", {
        pattern: "two-phase-commit",
        visuals: [
          { kind: "signal", targetId: "DB1", color: "red", label: "Abort" },
          { kind: "signal", targetId: "DB2", color: "red", label: "Abort" },
        ],
      }),
    ]);

    return createDocument(graph, [scenario]);
  },
};
