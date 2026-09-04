import type {
  Channel,
  CustomPatternDefinition,
  ExecutionStep,
  InvokeOutcome,
  MutateStatePrimitive,
  NodePort,
  Payload,
  PatternEventHandler,
  PatternExpandContext,
  PatternExpr,
  PatternStmt,
  Primitive,
  Scenario,
  StepAnimation,
  StepInteraction,
  SystemDocument,
  SystemGraph,
  SystemNode,
  VisualDirective,
} from "@system-canvas/core";
import {
  expandPattern,
  parsePayloadKind,
  parseRelationshipKind,
} from "@system-canvas/core";

interface ParsedDocument {
  type: "document";
  name: string;
  version: string;
  nodes: ParsedNode[];
  ports: ParsedPort[];
  channels: ParsedChannel[];
  patterns: ParsedPattern[];
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

interface ParsedPattern {
  type: "pattern";
  name: string;
  params: { type: "param"; name: string; defaultValue: unknown }[];
  handlers: {
    type: "handler";
    event: string;
    payloadBinding: string;
    body: ParsedPatternStmt[];
  }[];
}

type ParsedPatternStmt =
  | {
      type: "invoke";
      target: string;
      method: string;
      payloadBinding: string;
      onSuccess?: ParsedPatternStmt[];
      onFailure?: ParsedPatternStmt[];
    }
  | {
      type: "if";
      condition: ParsedPatternExpr;
      then: ParsedPatternStmt[];
      else?: ParsedPatternStmt[];
    }
  | { type: "retry" }
  | {
      type: "hold";
      payloadBinding: string;
      durationMs: number;
      label?: string;
    }
  | {
      type: "emit";
      payloadType: string;
      payloadBinding: string;
      target: string;
    }
  | {
      type: "mutate";
      nodeId: string;
      patch: Record<string, unknown>;
    };

type ParsedPatternExpr =
  | { type: "literal"; value: number | string | boolean }
  | { type: "ref"; path: string[] }
  | {
      type: "compare";
      op: "<" | "<=" | ">" | ">=" | "==" | "!=";
      left: ParsedPatternExpr;
      right: ParsedPatternExpr;
    };

interface ParsedScenario {
  type: "scenario";
  name: string;
  steps: ParsedScenarioItem[];
}

type ParsedScenarioItem = ParsedStep | ParsedApply;

interface ParsedApply {
  type: "apply";
  pattern: string;
  bindings: Record<string, unknown>;
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

function parseDelivery(value: unknown): Channel["delivery"] {
  if (value === "sync" || value === "async") return value;
  return undefined;
}

function toPatternExpr(expr: ParsedPatternExpr): PatternExpr {
  switch (expr.type) {
    case "literal":
      return { kind: "literal", value: expr.value };
    case "ref":
      return { kind: "ref", path: expr.path };
    case "compare":
      return {
        kind: "compare",
        op: expr.op,
        left: toPatternExpr(expr.left),
        right: toPatternExpr(expr.right),
      };
  }
}

function toPatternStmt(stmt: ParsedPatternStmt): PatternStmt {
  switch (stmt.type) {
    case "invoke":
      return {
        kind: "invoke",
        target: stmt.target,
        method: stmt.method,
        payloadBinding: stmt.payloadBinding,
        onSuccess: stmt.onSuccess?.map(toPatternStmt),
        onFailure: stmt.onFailure?.map(toPatternStmt),
      };
    case "if":
      return {
        kind: "if",
        condition: toPatternExpr(stmt.condition),
        then: stmt.then.map(toPatternStmt),
        else: stmt.else?.map(toPatternStmt),
      };
    case "retry":
      return { kind: "retry" };
    case "hold":
      return {
        kind: "hold",
        payloadBinding: stmt.payloadBinding,
        durationMs: stmt.durationMs,
        label: stmt.label,
      };
    case "emit":
      return {
        kind: "emit",
        payloadType: stmt.payloadType,
        payloadBinding: stmt.payloadBinding,
        target: stmt.target,
      };
    case "mutate":
      return {
        kind: "mutate",
        nodeId: stmt.nodeId,
        patch: stmt.patch,
      };
  }
}

function toCustomPattern(parsed: ParsedPattern): CustomPatternDefinition {
  const handlers: PatternEventHandler[] = parsed.handlers.map((h) => ({
    event: h.event,
    payloadBinding: h.payloadBinding,
    body: h.body.map(toPatternStmt),
  }));
  return {
    id: parsed.name,
    name: parsed.name,
    params: parsed.params.map((p) => ({
      name: p.name,
      defaultValue: p.defaultValue,
    })),
    handlers,
  };
}

function asString(value: unknown, key: string): string {
  if (typeof value === "string") return value;
  throw new Error(`apply binding "${key}" must be a string`);
}

function asOutcomes(value: unknown): InvokeOutcome[] {
  if (!Array.isArray(value)) {
    throw new Error('apply binding "outcomes" must be an array of ok|fail');
  }
  if (value.length === 0) {
    throw new Error('apply binding "outcomes" must be a non-empty list of ok|fail');
  }
  return value.map((v) => {
    if (v === "ok" || v === "fail") return v;
    throw new Error(`invalid outcome "${String(v)}" (expected ok|fail)`);
  });
}

function buildApplyContext(
  bindings: Record<string, unknown>,
): PatternExpandContext {
  const source = asString(bindings.source, "source");
  const target = asString(bindings.target, "target");
  const channelId = asString(bindings.channel, "channel");
  const event = asString(bindings.event ?? "Request", "event");
  const outcomes = asOutcomes(bindings.outcomes ?? ["ok"]);

  const named: Record<string, string> = { target };
  if (typeof bindings.DLQ === "string") named.DLQ = bindings.DLQ;
  if (typeof bindings.dlq === "string") named.DLQ = bindings.dlq;

  for (const [k, v] of Object.entries(bindings)) {
    if (
      typeof v === "string" &&
      k !== "source" &&
      k !== "target" &&
      k !== "channel" &&
      k !== "dlqChannel" &&
      k !== "event" &&
      k !== "DLQ" &&
      k !== "dlq"
    ) {
      named[k] = v;
    }
  }

  const params: Record<string, unknown> = {};
  if (typeof bindings.maxRetries === "number") {
    params.maxRetries = bindings.maxRetries;
  }

  return {
    sourceNodeId: source,
    bindings: named,
    channelId,
    dlqChannelId:
      typeof bindings.dlqChannel === "string"
        ? bindings.dlqChannel
        : undefined,
    event,
    outcomes,
    params: Object.keys(params).length > 0 ? params : undefined,
  };
}

function buildStepFromParsed(
  step: ParsedStep,
  index: number,
  ensureChannel: (
    sourceRef: NodeRefParsed,
    targetRef: NodeRefParsed,
    label?: string,
  ) => string,
): ExecutionStep {
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
      const channelId = ensureChannel(item.source, item.target, item.label);

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
      delivery: parseDelivery(ch.attrs.delivery),
      relationship: parseRelationshipKind(ch.attrs.relationship),
      payloadKind: parsePayloadKind(ch.attrs.payloadKind),
    });
  }

  const ensureChannel = (
    sourceRef: NodeRefParsed,
    targetRef: NodeRefParsed,
    label?: string,
  ): string => {
    const source = resolveNodeId(sourceRef);
    const target = resolveNodeId(targetRef);
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
      ([k]) =>
        k !== "icon" &&
        k !== "label" &&
        k !== "x" &&
        k !== "y" &&
        k !== "network",
    );
    const x = typeof n.props.x === "number" ? n.props.x : undefined;
    const y = typeof n.props.y === "number" ? n.props.y : undefined;
    const networkId =
      typeof n.props.network === "string" ? n.props.network : undefined;

    return {
      id: n.id,
      kind: n.kind,
      label: typeof n.props.label === "string" ? n.props.label : n.id,
      position: x !== undefined && y !== undefined ? { x, y } : undefined,
      state: {},
      networkId,
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

  const patterns = (parsed.patterns ?? []).map(toCustomPattern);
  const patternById = new Map<string, (typeof patterns)[number]>();
  for (const pattern of patterns) {
    if (patternById.has(pattern.id)) {
      throw new Error(`Duplicate pattern definition "${pattern.id}"`);
    }
    patternById.set(pattern.id, pattern);
  }

  const graph: SystemGraph = {
    id: graphId,
    name: parsed.name,
    version: parsed.version,
    nodes,
    channels: [...channelMap.values()],
  };

  const scenarios: Scenario[] = parsed.scenarios.map((s) => {
    const steps: ExecutionStep[] = [];

    for (const item of s.steps) {
      if (item.type === "apply") {
        const pattern = patternById.get(item.pattern);
        if (!pattern) {
          throw new Error(
            `apply references unknown pattern "${item.pattern}"`,
          );
        }
        const ctx = buildApplyContext(item.bindings);
        const expanded = expandPattern(pattern, {
          ...ctx,
          patternTag: pattern.id,
        });
        for (const step of expanded) {
          steps.push({
            ...step,
            index: steps.length,
            timestamp: steps.length * 1000,
          });
        }
      } else {
        steps.push(
          buildStepFromParsed(item, steps.length, ensureChannel),
        );
      }
    }

    return {
      id: makeId("scenario"),
      name: s.name,
      graphId,
      initialState: {},
      steps,
    };
  });

  return {
    graph,
    scenarios,
    patterns: patterns.length > 0 ? patterns : undefined,
  };
}
