import type {
  Channel,
  ExecutionStep,
  MutateStatePrimitive,
  NodePort,
  Payload,
  Primitive,
  Scenario,
  StepAnimation,
  StepInteraction,
  SystemDocument,
  SystemGraph,
  SystemNode,
  VisualDirective,
} from "@system-canvas/core";

interface ParsedDocument {
  type: "document";
  name: string;
  version: string;
  nodes: ParsedNode[];
  ports: ParsedPort[];
  channels: ParsedChannel[];
  scenarios: ParsedScenario[];
}

interface ParsedNode {
  type: "node";
  kind: SystemNode["kind"];
  id: string;
  props: Record<string, unknown>;
}

interface ParsedPort {
  type: "port";
  node: string;
  port: string;
  props: Record<string, unknown>;
}

interface ParsedChannel {
  type: "channel";
  id: string;
  source: NodeRefParsed;
  target: NodeRefParsed;
  attrs: Record<string, unknown>;
}

interface ParsedScenario {
  type: "scenario";
  name: string;
  steps: ParsedStep[];
}

interface ParsedStep {
  type: "step";
  name: string;
  pattern?: string;
  body: ParsedStepItem[];
}

type NodeRefParsed = string | { node: string; port?: string };

type ParsedStepItem =
  | {
      type: "interaction";
      source: NodeRefParsed;
      target: NodeRefParsed;
      label: string;
      annotations?: string[];
    }
  | { type: "animate"; data: Record<string, unknown> }
  | {
      type: "emit";
      source: NodeRefParsed;
      target: NodeRefParsed;
      payloadType: string;
      data: Record<string, unknown>;
    }
  | { type: "mutate"; node: NodeRefParsed; patch: Record<string, unknown> }
  | { type: "delay"; durationMs: number };

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function resolveNodeId(ref: NodeRefParsed): string {
  return typeof ref === "string" ? ref : ref.node;
}

function toNodeRef(ref: NodeRefParsed): StepInteraction["source"] {
  if (typeof ref === "string") return ref;
  return { nodeId: ref.node, portId: ref.port };
}

function channelKey(source: string, target: string): string {
  return `${source}->${target}`;
}

export function buildSystemDocument(parsed: ParsedDocument): SystemDocument {
  const graphId = parsed.name;
  const channelMap = new Map<string, Channel>();

  for (const ch of parsed.channels) {
    const source = resolveNodeId(ch.source);
    const target = resolveNodeId(ch.target);
    channelMap.set(ch.id, {
      id: ch.id,
      source,
      target,
      label: typeof ch.attrs.label === "string" ? ch.attrs.label : undefined,
      payloadType:
        typeof ch.attrs.payload === "string" ? ch.attrs.payload : undefined,
    });
  }

  const ensureChannel = (
    sourceRef: NodeRefParsed,
    targetRef: NodeRefParsed,
    label?: string,
  ): string => {
    const source = resolveNodeId(sourceRef);
    const target = resolveNodeId(targetRef);
    const key = channelKey(source, target);
    const existing = [...channelMap.values()].find(
      (c) => c.source === source && c.target === target,
    );
    if (existing) return existing.id;

    const id = makeId("ch");
    channelMap.set(id, { id, source, target, label });
    return id;
  };

  const nodes: SystemNode[] = parsed.nodes.map((n) => {
    const configEntries = Object.entries(n.props).filter(
      ([k]) => k !== "icon" && k !== "label" && k !== "x" && k !== "y",
    );
    const x = typeof n.props.x === "number" ? n.props.x : undefined;
    const y = typeof n.props.y === "number" ? n.props.y : undefined;

    return {
      id: n.id,
      kind: n.kind,
      label: typeof n.props.label === "string" ? n.props.label : n.id,
      position: x !== undefined && y !== undefined ? { x, y } : undefined,
      state: {},
      icon: typeof n.props.icon === "string" ? n.props.icon : undefined,
      config: Object.fromEntries(configEntries),
      behaviors: [],
    };
  });

  const portIndex = new Map<string, NodePort[]>();
  for (const p of parsed.ports) {
    const port: NodePort = {
      id: p.port,
      label: typeof p.props.label === "string" ? p.props.label : p.port,
      nodeId: p.node,
    };
    const existing = portIndex.get(p.node) ?? [];
    existing.push(port);
    portIndex.set(p.node, existing);
  }

  for (const node of nodes) {
    node.ports = portIndex.get(node.id);
  }

  const graph: SystemGraph = {
    id: graphId,
    name: parsed.name,
    version: parsed.version,
    nodes,
    channels: [...channelMap.values()],
  };

  const scenarios: Scenario[] = parsed.scenarios.map((s) => {
    const steps: ExecutionStep[] = s.steps.map((step, index) => {
      const interactions: StepInteraction[] = [];
      const animations: StepAnimation[] = [];
      const primitives: Primitive[] = [];
      const visuals: VisualDirective[] = [];

      for (const item of step.body) {
        if (item.type === "interaction") {
          const interaction: StepInteraction = {
            source: toNodeRef(item.source),
            target: toNodeRef(item.target),
            label: item.label,
            annotations: item.annotations,
          };
          interactions.push(interaction);

          const sourceId = resolveNodeId(item.source);
          const targetId = resolveNodeId(item.target);
          const channelId = ensureChannel(
            item.source,
            item.target,
            item.label,
          );

          if (sourceId === targetId) {
            const mutate: MutateStatePrimitive = {
              kind: "mutate",
              nodeId: sourceId,
              patch: { lastAction: item.label },
            };
            primitives.push(mutate);
          } else {
            const payload: Payload = {
              id: makeId("payload"),
              type: "message",
              data: { label: item.label },
            };
            primitives.push({
              kind: "emit",
              nodeId: sourceId,
              channelId,
              payload,
            });
          }

          if (item.annotations?.includes("Transaction")) {
            visuals.push({
              kind: "highlight",
              targetId: targetId,
              color: "yellow",
              label: "Transaction",
            });
          }
        } else if (item.type === "animate") {
          const payload: Payload = {
            id: makeId("payload"),
            type: "event",
            data: item.data,
          };
          animations.push({ payload });
        } else if (item.type === "emit") {
          const sourceId = resolveNodeId(item.source);
          const channelId = ensureChannel(item.source, item.target);
          const payload: Payload = {
            id: makeId("payload"),
            type: item.payloadType,
            data: item.data,
          };
          primitives.push({
            kind: "emit",
            nodeId: sourceId,
            channelId,
            payload,
          });
        } else if (item.type === "mutate") {
          primitives.push({
            kind: "mutate",
            nodeId: resolveNodeId(item.node),
            patch: item.patch,
          });
        } else if (item.type === "delay") {
          primitives.push({ kind: "delay", durationMs: item.durationMs });
        }
      }

      return {
        index,
        timestamp: index * 1000,
        name: step.name,
        pattern: step.pattern,
        interactions,
        animations: animations.length > 0 ? animations : undefined,
        visuals: visuals.length > 0 ? visuals : undefined,
        primitives,
        traces: [],
      };
    });

    return {
      id: makeId("scenario"),
      name: s.name,
      graphId,
      initialState: {},
      steps,
    };
  });

  return { graph, scenarios };
}
