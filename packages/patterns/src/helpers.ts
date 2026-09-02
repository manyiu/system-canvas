import type {
  ExecutionStep,
  Payload,
  Scenario,
  SystemDocument,
  SystemGraph,
  SystemNode,
  VisualDirective,
} from "@system-canvas/core";

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createPayload(
  type: string,
  data: Record<string, unknown>,
): Payload {
  return { id: makeId("payload"), type, data };
}

export function createStep(
  index: number,
  name: string,
  options: {
    pattern?: string;
    primitives?: ExecutionStep["primitives"];
    visuals?: VisualDirective[];
    description?: string;
  } = {},
): ExecutionStep {
  return {
    index,
    timestamp: index * 1000,
    name,
    pattern: options.pattern,
    interactions: [],
    primitives: options.primitives ?? [],
    visuals: options.visuals,
    description: options.description,
    traces: [],
  };
}

export function createScenario(
  name: string,
  graphId: string,
  steps: ExecutionStep[],
  id?: string,
): Scenario {
  return {
    id: id ?? makeId("scenario"),
    name,
    graphId,
    initialState: {},
    steps,
  };
}

export function createGraph(
  id: string,
  name: string,
  version: string,
  nodes: SystemNode[],
  channels: SystemGraph["channels"] = [],
  networks: SystemGraph["networks"] = [],
): SystemGraph {
  return { id, name, version, nodes, channels, networks };
}

export function createDocument(
  graph: SystemGraph,
  scenarios: Scenario[],
): SystemDocument {
  return { graph, scenarios };
}

export function node(
  id: string,
  kind: SystemNode["kind"],
  label: string,
  extra: Partial<SystemNode> = {},
): SystemNode {
  return {
    id,
    kind,
    label,
    state: {},
    behaviors: [],
    ...extra,
  };
}
