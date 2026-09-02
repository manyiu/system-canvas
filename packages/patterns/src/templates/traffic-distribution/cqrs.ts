import type { PatternFactory } from "../../types.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../../helpers.js";

export const cqrsPattern: PatternFactory = {
  id: "cqrs",
  meta: {
    id: "cqrs",
    name: "CQRS",
    category: "traffic-distribution",
    description:
      "Write to RDBMS; async sync updates read model with eventual consistency lag.",
    tags: ["cqrs", "eventual-consistency"],
    defaultScenarioId: "cqrs-default",
  },
  create() {
    const graph = createGraph("cqrs", "CQRS", "v1", [
      node("CommandAPI", "service", "Command API", { icon: "microservice" }),
      node("WriteDB", "database", "Write DB (RDBMS)", { icon: "postgres" }),
      node("EventBus", "queue", "Event Bus", { icon: "kafka" }),
      node("ReadDB", "database", "Read DB (NoSQL)", { icon: "mongodb" }),
      node("QueryAPI", "service", "Query API", { icon: "microservice" }),
    ], [
      { id: "ch1", source: "CommandAPI", target: "WriteDB" },
      { id: "ch2", source: "WriteDB", target: "EventBus" },
      { id: "ch3", source: "EventBus", target: "ReadDB" },
      { id: "ch4", source: "QueryAPI", target: "ReadDB" },
    ]);

    const scenario = createScenario("CQRS Write + Read", graph.id, [
      createStep(0, "Write Command", {
        pattern: "cqrs",
        primitives: [{
          kind: "emit",
          nodeId: "CommandAPI",
          channelId: "ch1",
          payload: createPayload("CreateOrder", { orderId: 1 }),
        }],
        visuals: [{ kind: "signal", targetId: "WriteDB", color: "green" }],
      }),
      createStep(1, "Async Sync to Read Model", {
        pattern: "cqrs",
        primitives: [{
          kind: "emit",
          nodeId: "EventBus",
          channelId: "ch3",
          payload: createPayload("OrderCreated", { orderId: 1 }),
        }],
        visuals: [
          { kind: "lag", targetId: "ReadDB", color: "yellow", label: "Eventual consistency" },
        ],
      }),
      createStep(2, "Read Query", {
        pattern: "cqrs",
        visuals: [{ kind: "signal", targetId: "QueryAPI", color: "green" }],
      }),
    ], "cqrs-default");

    return createDocument(graph, [scenario]);
  },
};
