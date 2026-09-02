import type { SystemDocument } from "@system-canvas/core";
import {
  createDocument,
  createGraph,
  createPayload,
  createScenario,
  createStep,
  node,
} from "../helpers.js";

export interface ExponentialBackoffParams {
  maxRetries?: number;
  baseDelayMs?: number;
}

export function createExponentialBackoff(
  params: ExponentialBackoffParams = {},
): SystemDocument {
  const maxRetries = params.maxRetries ?? 3;
  const baseDelayMs = params.baseDelayMs ?? 1000;

  const graph = createGraph("exponential-backoff", "Exponential Backoff", "v1", [
    node("Client", "external", "Client", { icon: "external" }),
    node("Service", "service", "Target Service", { icon: "microservice" }),
    node("DLQ", "queue", "Dead Letter Queue", { icon: "kafka" }),
  ], [
    { id: "ch1", source: "Client", target: "Service", label: "request" },
    { id: "ch2", source: "Service", target: "DLQ", label: "dead letter" },
  ]);

  const steps = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delay = baseDelayMs * 2 ** attempt;
    steps.push(
      createStep(steps.length, `Attempt ${attempt} — Failure`, {
        pattern: "exponential-backoff",
        primitives: [
          {
            kind: "invoke",
            sourceNodeId: "Client",
            targetNodeId: "Service",
            payload: createPayload("Request", { attempt }),
            onSuccess: [],
            onFailure: [
              { kind: "delay", durationMs: delay },
            ],
          },
        ],
        visuals: [
          {
            kind: "hold",
            targetId: "Service",
            color: "yellow",
            durationMs: delay,
            label: `Backoff ${delay}ms`,
          },
        ],
      }),
    );
  }

  steps.push(
    createStep(steps.length, "Max Retries — Dead Letter", {
      pattern: "exponential-backoff",
      primitives: [{
        kind: "emit",
        nodeId: "Service",
        channelId: "ch2",
        payload: createPayload("DeadLetter", { reason: "max retries exceeded" }),
      }],
      visuals: [
        { kind: "signal", targetId: "DLQ", color: "red" },
      ],
    }),
  );

  const scenario = createScenario(
    "Exponential Backoff Retry",
    graph.id,
    steps,
    "exponential-backoff-default",
  );
  return createDocument(graph, [scenario]);
}
