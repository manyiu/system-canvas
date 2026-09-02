import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const cdcPattern: PatternFactory = {
  id: "cdc",
  meta: {
    id: "cdc",
    name: "Change Data Capture (CDC)",
    category: "data-consistency",
    description:
      "WAL/transaction log tailing via Debezium streams row changes to Kafka.",
    tags: ["cdc", "streaming", "debezium"],
    defaultScenarioId: "cdc-default",
  },
  create() {
    const graph = createGraph("cdc", "Change Data Capture", "v1", [
      node("SourceDB", "database", "Source DB", {
        icon: "postgres",
        ports: [{ id: "wal", label: "WAL Log", nodeId: "SourceDB" }],
      }),
      node("Debezium", "service", "Debezium Connector", { icon: "microservice" }),
      node("Kafka", "queue", "Kafka", { icon: "kafka" }),
    ], [
      { id: "ch1", source: "SourceDB", target: "Debezium", label: "tail log", delivery: "async" },
      { id: "ch2", source: "Debezium", target: "Kafka", label: "stream", delivery: "async" },
    ]);

    const scenario = createScenario("CDC Stream", graph.id, [
      createStep(0, "Row Change", {
        pattern: "cdc",
        visuals: [
          { kind: "highlight", targetId: "wal", color: "yellow", label: "New row" },
        ],
      }),
      createStep(1, "Debezium Tail", {
        pattern: "cdc",
        primitives: [{
          kind: "emit",
          nodeId: "Debezium",
          channelId: "ch2",
          payload: createPayload("RowChanged", { table: "orders", op: "insert" }),
        }],
        visuals: [
          { kind: "signal", targetId: "Debezium", color: "green", label: "Tailing" },
        ],
      }),
      createStep(2, "Kafka Stream", {
        pattern: "cdc",
        visuals: [
          { kind: "signal", targetId: "Kafka", color: "green" },
        ],
      }),
    ], "cdc-default");

    return createDocument(graph, [scenario]);
  },
};
