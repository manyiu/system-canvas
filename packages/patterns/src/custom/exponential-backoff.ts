import type { SystemDocument } from "@system-canvas/core";
import { expandPattern } from "@system-canvas/core";
import type { PatternFactory } from "../types.js";
import {
  createDocument,
  createGraph,
  createScenario,
  node,
} from "../helpers.js";
import { applyPositions, columnPositions } from "../building-blocks/baked-positions.js";
import type { CustomPatternDefinition } from "@system-canvas/core";

/** Canonical ExponentialBackoff pattern definition (matches DSL grammar). */
export function createExponentialBackoffPattern(
  maxRetries = 3,
): CustomPatternDefinition {
  return {
    id: "ExponentialBackoff",
    name: "ExponentialBackoff",
    params: [{ name: "maxRetries", defaultValue: maxRetries }],
    handlers: [
      {
        event: "Request",
        payloadBinding: "payload",
        body: [
          {
            kind: "invoke",
            target: "target",
            method: "process",
            payloadBinding: "payload",
            onFailure: [
              {
                kind: "if",
                condition: {
                  kind: "compare",
                  op: "<",
                  left: { kind: "ref", path: ["context", "attempt"] },
                  right: { kind: "ref", path: ["maxRetries"] },
                },
                then: [
                  {
                    kind: "hold",
                    payloadBinding: "payload",
                    durationMs: 1000,
                    label: "Backoff",
                  },
                  { kind: "retry" },
                ],
                else: [
                  {
                    kind: "emit",
                    payloadType: "DeadLetter",
                    payloadBinding: "payload",
                    target: "DLQ",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

function buildBackoffDocument(
  scenarioName: string,
  scenarioId: string,
  outcomes: Array<"ok" | "fail">,
): SystemDocument {
  const pattern = createExponentialBackoffPattern(3);
  const positions = columnPositions([
    ["Gateway"],
    ["PaymentService"],
    ["DLQ"],
    ["Ops"],
  ]);

  const nodes = applyPositions(
    [
      node("Gateway", "gateway", "Gateway", { icon: "api-gateway" }),
      node("PaymentService", "service", "Payment Service", {
        icon: "microservice",
      }),
      node("DLQ", "queue", "Dead Letter Queue", { icon: "sqs" }),
      node("Ops", "service", "Ops Alert", { icon: "microservice" }),
    ],
    positions,
  );

  const channels = [
    {
      id: "ch_req",
      source: "Gateway",
      target: "PaymentService",
      label: "process",
      delivery: "sync" as const,
      relationship: "command" as const,
      payloadKind: "command" as const,
    },
    {
      id: "ch_dlq",
      source: "PaymentService",
      target: "DLQ",
      label: "dead letter",
      delivery: "async" as const,
      relationship: "event" as const,
      payloadKind: "event" as const,
    },
    {
      id: "ch_ops",
      source: "DLQ",
      target: "Ops",
      label: "alert",
      delivery: "async" as const,
      relationship: "event" as const,
      payloadKind: "event" as const,
    },
  ];

  const graph = createGraph(
    "ExponentialBackoffDemo",
    "Exponential Backoff",
    "v1",
    nodes,
    channels,
  );

  const steps = expandPattern(pattern, {
    sourceNodeId: "Gateway",
    bindings: { target: "PaymentService", DLQ: "DLQ" },
    channelId: "ch_req",
    dlqChannelId: "ch_dlq",
    event: "Request",
    outcomes,
    patternTag: pattern.id,
  });

  return createDocument(graph, [
    createScenario(scenarioName, graph.id, steps, scenarioId),
  ], [pattern]);
}

export const exponentialBackoffExample: PatternFactory = {
  id: "exponential-backoff",
  meta: {
    id: "exponential-backoff",
    name: "Exponential Backoff (custom pattern)",
    difficulty: "community",
    description:
      "Step 4 demo: pattern { onEvent } expands into linear retry steps with hold visuals and optional DLQ.",
    tags: ["resilience", "retry", "custom-pattern", "step-4"],
    patternsUsed: ["exponential-backoff"],
    layoutHint: "pipeline",
    defaultScenarioId: "retry-then-succeed",
  },
  create() {
    return buildBackoffDocument(
      "Retry then succeed",
      "retry-then-succeed",
      ["fail", "fail", "ok"],
    );
  },
};

export const exponentialBackoffDlqExample: PatternFactory = {
  id: "exponential-backoff-dlq",
  meta: {
    id: "exponential-backoff-dlq",
    name: "Exponential Backoff → DLQ",
    difficulty: "community",
    description:
      "Same custom pattern with scripted failures that exhaust retries and emit to the dead-letter queue.",
    tags: ["resilience", "retry", "dlq", "custom-pattern", "step-4"],
    patternsUsed: ["exponential-backoff"],
    layoutHint: "pipeline",
    defaultScenarioId: "exhaust-to-dlq",
  },
  create() {
    return buildBackoffDocument(
      "Exhaust to DLQ",
      "exhaust-to-dlq",
      ["fail", "fail", "fail"],
    );
  },
};
