import type {
  Channel,
  ExampleDifficulty,
  ExampleMeta,
  FlowDelivery,
  LayoutHint,
  Network,
  PayloadKind,
  RelationshipKind,
  SystemDocument,
  VisualDirective,
} from "@system-canvas/core";
import {
  applyPositions,
  columnPositions,
  hubPositions,
  pipelinePositions,
  sideBranchPositions,
  tieredPositions,
} from "../building-blocks/baked-positions.js";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../helpers.js";
import type { PatternFactory } from "../types.js";

export interface ExampleNodeDef {
  id: string;
  kind: import("@system-canvas/core").NodeKind;
  label: string;
  icon?: string;
  networkId?: string;
  ports?: { id: string; label: string }[];
}

export interface ExampleChannelDef {
  id?: string;
  source: string;
  target: string;
  label?: string;
  delivery?: FlowDelivery;
  relationship?: RelationshipKind;
  payloadKind?: PayloadKind;
}

export interface ExampleStepDef {
  name: string;
  description?: string;
  channelId?: string;
  fromNode?: string;
  payloadType?: string;
  payloadData?: Record<string, unknown>;
  visuals?: VisualDirective[];
}

export interface ExampleScenarioDef {
  id: string;
  name: string;
  steps: ExampleStepDef[];
}

export interface ExampleDefinition {
  id: string;
  name: string;
  difficulty: ExampleDifficulty;
  description: string;
  tags: string[];
  patternsUsed: string[];
  layoutHint: LayoutHint;
  defaultScenarioId: string;
  networks?: Network[];
  nodes: ExampleNodeDef[];
  channels: ExampleChannelDef[];
  scenarios: ExampleScenarioDef[];
  /** Left-to-right architecture layers; each inner array stacks vertically. */
  columns?: string[][];
  pipeline?: string[];
  tiers?: string[][];
  hub?: { left: string[]; hub: string; spokes: string[]; right?: string[] };
  branches?: Record<string, string[]>;
}

function buildChannels(defs: ExampleChannelDef[]): Channel[] {
  return defs.map((ch, i) => ({
    id: ch.id ?? `ch${i + 1}`,
    source: ch.source,
    target: ch.target,
    label: ch.label,
    delivery: ch.delivery,
    relationship: ch.relationship,
    payloadKind: ch.payloadKind,
  }));
}

function resolveLayout(def: ExampleDefinition): Record<string, { x: number; y: number }> {
  let positions: Record<string, { x: number; y: number }> = {};
  if (def.columns) {
    positions = columnPositions(def.columns);
  } else if (def.hub) {
    positions = hubPositions(def.hub);
  } else if (def.tiers) {
    positions = tieredPositions(def.tiers);
  } else if (def.pipeline) {
    positions = pipelinePositions(def.pipeline);
    if (def.branches) {
      for (const [anchorId, branchIds] of Object.entries(def.branches)) {
        const anchor = positions[anchorId];
        if (anchor) {
          Object.assign(positions, sideBranchPositions(anchor, branchIds));
        }
      }
    }
  }

  const placed = Object.values(positions);
  const maxX = placed.length ? Math.max(...placed.map((p) => p.x)) : 48;
  let fallbackY = 80;
  for (const n of def.nodes) {
    if (!positions[n.id]) {
      positions[n.id] = { x: maxX + 240, y: fallbackY };
      fallbackY += 140;
    }
  }
  return positions;
}

export function defineExample(def: ExampleDefinition): PatternFactory {
  const channels = buildChannels(def.channels);
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const meta: ExampleMeta = {
    id: def.id,
    name: def.name,
    difficulty: def.difficulty,
    description: def.description,
    tags: def.tags,
    patternsUsed: def.patternsUsed,
    layoutHint: def.layoutHint,
    defaultScenarioId: def.defaultScenarioId,
  };

  return {
    id: def.id,
    meta,
    create(): SystemDocument {
      const positions = resolveLayout(def);
      const nodes = applyPositions(
        def.nodes.map((n) =>
          node(n.id, n.kind, n.label, {
            icon: n.icon,
            networkId: n.networkId,
            ports: n.ports?.map((p) => ({ ...p, nodeId: n.id })),
          }),
        ),
        positions,
      );

      const graph = createGraph(def.id, def.name, "v1", nodes, channels, def.networks ?? []);

      const scenarios = def.scenarios.map((sc) =>
        createScenario(
          sc.name,
          graph.id,
          sc.steps.map((step, index) => {
            const primitives =
              step.channelId && step.fromNode
                ? [
                    {
                      kind: "emit" as const,
                      nodeId: step.fromNode,
                      channelId: step.channelId,
                      payload: createPayload(step.payloadType ?? "Event", step.payloadData ?? {}),
                    },
                  ]
                : [];
            const ch = step.channelId ? channelById.get(step.channelId) : undefined;
            return createStep(index, step.name, {
              description: step.description,
              primitives,
              visuals:
                step.visuals ??
                (ch
                  ? [
                      {
                        kind: "signal" as const,
                        targetId: ch.target,
                        color: "green" as const,
                      },
                    ]
                  : undefined),
            });
          }),
          sc.id,
        ),
      );

      return createDocument(graph, scenarios);
    },
  };
}
