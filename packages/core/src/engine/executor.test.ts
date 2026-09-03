import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Scenario, SystemGraph } from "../../dist/index.mjs";
import { createExecutor } from "../../dist/index.mjs";

function emptyStep(
  index: number,
  name: string,
  primitives: Scenario["steps"][number]["primitives"],
): Scenario["steps"][number] {
  return {
    index,
    timestamp: index * 1000,
    name,
    interactions: [],
    primitives,
    traces: [],
  };
}

const graph: SystemGraph = {
  id: "test",
  name: "test",
  version: "v1",
  nodes: [
    {
      id: "A",
      kind: "service",
      label: "A",
      state: { base: true },
      behaviors: [],
    },
    {
      id: "B",
      kind: "service",
      label: "B",
      state: {},
      behaviors: [],
    },
  ],
  channels: [{ id: "ch1", source: "A", target: "B", delivery: "async" }],
};

describe("createExecutor cumulative state", () => {
  it("starts from initialState + node.state with no prior steps", () => {
    const scenario: Scenario = {
      id: "s1",
      name: "Happy",
      graphId: "test",
      initialState: { A: { fromInitial: 1 } },
      steps: [
        emptyStep(0, "First", [
          { kind: "mutate", nodeId: "A", patch: { count: 1 } },
        ]),
      ],
    };

    const result = createExecutor().executeStep(graph, scenario, 0);
    assert.deepEqual(result.snapshot?.nodeStates.A, {
      fromInitial: 1,
      base: true,
      count: 1,
    });
  });

  it("folds prior mutate patches into later step snapshots", () => {
    const scenario: Scenario = {
      id: "s1",
      name: "Happy",
      graphId: "test",
      initialState: {},
      steps: [
        emptyStep(0, "Step0", [
          { kind: "mutate", nodeId: "A", patch: { phase: "written" } },
        ]),
        emptyStep(1, "Step1", [
          { kind: "mutate", nodeId: "A", patch: { phase: "published", n: 2 } },
          {
            kind: "emit",
            nodeId: "A",
            channelId: "ch1",
            payload: { id: "p1", type: "event", data: {} },
          },
        ]),
      ],
    };

    const executor = createExecutor();
    const at0 = executor.executeStep(graph, scenario, 0);
    assert.deepEqual(at0.snapshot?.nodeStates.A, {
      base: true,
      phase: "written",
    });
    assert.equal(at0.traces.length, 0);

    const at1 = executor.executeStep(graph, scenario, 1);
    assert.deepEqual(at1.snapshot?.nodeStates.A, {
      base: true,
      phase: "published",
      n: 2,
    });
    assert.equal(at1.traces.length, 1);
    assert.equal(at1.traces[0]?.channelId, "ch1");
  });

  it("emits only for the active step and skips unknown channels", () => {
    const scenario: Scenario = {
      id: "s1",
      name: "Happy",
      graphId: "test",
      initialState: {},
      steps: [
        emptyStep(0, "Step0", [
          {
            kind: "emit",
            nodeId: "A",
            channelId: "ch1",
            payload: { id: "p0", type: "event", data: {} },
          },
        ]),
        emptyStep(1, "Step1", [
          {
            kind: "emit",
            nodeId: "A",
            channelId: "missing",
            payload: { id: "p1", type: "event", data: {} },
          },
        ]),
      ],
    };

    const executor = createExecutor();
    const at0 = executor.executeStep(graph, scenario, 0);
    assert.equal(at0.traces.length, 1);

    const at1 = executor.executeStep(graph, scenario, 1);
    assert.equal(at1.traces.length, 0);
  });
});
