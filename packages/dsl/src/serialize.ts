import type {
  Channel,
  CustomPatternDefinition,
  NodeRef,
  PatternExpr,
  PatternStmt,
  Scenario,
  StepInteraction,
  SystemDocument,
  SystemNode,
} from "@system-canvas/core";

const KIND_KEYWORD: Record<SystemNode["kind"], string> = {
  service: "service",
  database: "database",
  queue: "queue",
  gateway: "gateway",
  external: "external",
  custom: "service",
};

function indent(level: number): string {
  return "  ".repeat(level);
}

function escapeString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatNodeRef(ref: NodeRef): string {
  if (typeof ref === "string") return ref;
  return ref.portId ? `${ref.nodeId}.${ref.portId}` : ref.nodeId;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return escapeString(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const inner = entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(" ");
    return `{ ${inner} }`;
  }
  return escapeString(String(value));
}

function formatProps(props: Record<string, unknown>): string {
  const entries = Object.entries(props);
  if (entries.length === 0) return "";
  const inner = entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(" ");
  return ` { ${inner} }`;
}

function serializeNode(node: SystemNode): string {
  const keyword = KIND_KEYWORD[node.kind];
  const props: Record<string, unknown> = { ...node.config };

  if (node.icon) props.icon = node.icon;
  if (node.label !== node.id) props.label = node.label;
  if (node.networkId) props.network = node.networkId;
  if (node.position) {
    props.x = node.position.x;
    props.y = node.position.y;
  }

  return `${keyword} ${node.id}${formatProps(props)}`;
}

function serializeChannel(channel: Channel): string {
  const props: Record<string, unknown> = {};
  if (channel.label) props.label = channel.label;
  if (channel.payloadType) props.payload = channel.payloadType;
  if (channel.delivery) props.delivery = channel.delivery;
  if (channel.relationship) props.relationship = channel.relationship;
  if (channel.payloadKind) props.payloadKind = channel.payloadKind;
  return `channel ${channel.id} ${channel.source} -> ${channel.target}${formatProps(props)}`;
}

function serializePorts(nodes: SystemNode[]): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    for (const port of node.ports ?? []) {
      const props: Record<string, unknown> = {};
      if (port.label !== port.id) props.label = port.label;
      lines.push(`port ${node.id}.${port.id}${formatProps(props)}`);
    }
  }
  return lines;
}

function serializeExpr(expr: PatternExpr): string {
  switch (expr.kind) {
    case "literal":
      return formatValue(expr.value);
    case "ref":
      return expr.path.join(".");
    case "compare":
      return `${serializeExpr(expr.left)} ${expr.op} ${serializeExpr(expr.right)}`;
  }
}

function serializePatternStmts(stmts: PatternStmt[], level: number): string[] {
  const lines: string[] = [];
  for (const stmt of stmts) {
    switch (stmt.kind) {
      case "invoke": {
        lines.push(
          `${indent(level)}invoke ${stmt.target}.${stmt.method}(${stmt.payloadBinding}) {`,
        );
        if (stmt.onSuccess && stmt.onSuccess.length > 0) {
          lines.push(`${indent(level + 1)}onSuccess {`);
          lines.push(...serializePatternStmts(stmt.onSuccess, level + 2));
          lines.push(`${indent(level + 1)}}`);
        }
        if (stmt.onFailure && stmt.onFailure.length > 0) {
          lines.push(`${indent(level + 1)}onFailure {`);
          lines.push(...serializePatternStmts(stmt.onFailure, level + 2));
          lines.push(`${indent(level + 1)}}`);
        }
        lines.push(`${indent(level)}}`);
        break;
      }
      case "if": {
        lines.push(`${indent(level)}if (${serializeExpr(stmt.condition)}) {`);
        lines.push(...serializePatternStmts(stmt.then, level + 1));
        lines.push(`${indent(level)}}`);
        if (stmt.else && stmt.else.length > 0) {
          lines.push(`${indent(level)}else {`);
          lines.push(...serializePatternStmts(stmt.else, level + 1));
          lines.push(`${indent(level)}}`);
        }
        break;
      }
      case "retry":
        lines.push(`${indent(level)}retry()`);
        break;
      case "hold": {
        const label = stmt.label ? `, label: ${escapeString(stmt.label)}` : "";
        lines.push(
          `${indent(level)}visual.hold(${stmt.payloadBinding}, duration: ${stmt.durationMs}${label})`,
        );
        break;
      }
      case "emit":
        lines.push(
          `${indent(level)}emit ${stmt.payloadType}(${stmt.payloadBinding}) -> ${stmt.target}`,
        );
        break;
      case "mutate":
        lines.push(`${indent(level)}mutate ${stmt.nodeId} ${formatValue(stmt.patch)}`);
        break;
    }
  }
  return lines;
}

function serializePattern(pattern: CustomPatternDefinition): string[] {
  const lines: string[] = [`${indent(1)}pattern ${pattern.name} {`];
  for (const param of pattern.params) {
    lines.push(`${indent(2)}param ${param.name} = ${formatValue(param.defaultValue)}`);
  }
  for (const handler of pattern.handlers) {
    lines.push(`${indent(2)}onEvent ${handler.event}(${handler.payloadBinding}) {`);
    lines.push(...serializePatternStmts(handler.body, 3));
    lines.push(`${indent(2)}}`);
  }
  lines.push(`${indent(1)}}`);
  return lines;
}

function serializeInteraction(interaction: StepInteraction): string[] {
  const lines: string[] = [];
  const src = formatNodeRef(interaction.source);
  const tgt = formatNodeRef(interaction.target);
  lines.push(`${indent(3)}${src} -> ${tgt}: ${interaction.label}`);
  if (interaction.annotations && interaction.annotations.length > 0) {
    lines.push(`${indent(4)}annotations: [${interaction.annotations.join(", ")}]`);
  }
  return lines;
}

function serializeStep(step: Scenario["steps"][number], channels: Channel[]): string[] {
  const patternTag = step.pattern ? ` [pattern: ${step.pattern}]` : "";
  const lines: string[] = [`${indent(2)}step ${escapeString(step.name)}${patternTag} {`];

  for (const interaction of step.interactions) {
    lines.push(...serializeInteraction(interaction));
  }

  for (const animation of step.animations ?? []) {
    lines.push(`${indent(3)}animate payload: ${formatValue(animation.payload.data)}`);
  }

  for (const primitive of step.primitives) {
    if (primitive.kind === "emit" && step.interactions.length === 0) {
      const channel = channels.find((c) => c.id === primitive.channelId);
      const target = channel?.target ?? primitive.channelId;
      lines.push(
        `${indent(3)}emit ${primitive.nodeId} -> ${target} payload ${primitive.payload.type} ${formatValue(primitive.payload.data)}`,
      );
    } else if (primitive.kind === "mutate" && step.interactions.length === 0) {
      lines.push(`${indent(3)}mutate ${primitive.nodeId} ${formatValue(primitive.patch)}`);
    } else if (primitive.kind === "delay") {
      lines.push(`${indent(3)}delay ${primitive.durationMs}ms`);
    }
  }

  lines.push(`${indent(2)}}`);
  return lines;
}

function serializeScenario(scenario: Scenario, channels: Channel[]): string[] {
  const lines: string[] = [`${indent(1)}scenario ${escapeString(scenario.name)} {`];
  for (const step of scenario.steps) {
    lines.push(...serializeStep(step, channels));
  }
  lines.push(`${indent(1)}}`);
  return lines;
}

export function serializeDsl(doc: SystemDocument): string {
  const { graph, scenarios, patterns } = doc;
  const lines: string[] = [`system ${graph.id} ${graph.version} {`, ""];

  for (const node of graph.nodes) {
    lines.push(`${indent(1)}${serializeNode(node)}`);
  }

  const portLines = serializePorts(graph.nodes);
  if (portLines.length > 0) {
    lines.push("");
    for (const line of portLines) {
      lines.push(`${indent(1)}${line}`);
    }
  }

  if (graph.channels.length > 0) {
    lines.push("");
    for (const channel of graph.channels) {
      lines.push(`${indent(1)}${serializeChannel(channel)}`);
    }
  }

  if (patterns && patterns.length > 0) {
    lines.push("");
    for (const pattern of patterns) {
      lines.push(...serializePattern(pattern));
      lines.push("");
    }
  }

  if (scenarios.length > 0) {
    lines.push("");
    for (const scenario of scenarios) {
      lines.push(...serializeScenario(scenario, graph.channels));
      lines.push("");
    }
  }

  lines.push("}");
  return lines.join("\n");
}
