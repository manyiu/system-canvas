import type { SystemDocument } from "../ast/document.js";
import type { SystemGraph, SystemNode } from "../ast/system.js";
import {
  inferDeliveryFromRelationship,
  isAsyncRelationship,
  isSyncRelationship,
} from "../ast/flow.js";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  ruleId: string;
  severity: LintSeverity;
  message: string;
  /** Channel, node, or network id */
  targetId?: string;
  /** Review guidance */
  suggestion?: string;
}

export interface ReviewLintOptions {
  /** Fail on warnings as well as errors */
  strict?: boolean;
}

function nodeById(graph: SystemGraph, id: string): SystemNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function networkOf(graph: SystemGraph, nodeId: string): string | undefined {
  return nodeById(graph, nodeId)?.networkId;
}

function crossesNetwork(
  graph: SystemGraph,
  sourceId: string,
  targetId: string,
): boolean {
  const srcNet = networkOf(graph, sourceId);
  const tgtNet = networkOf(graph, targetId);
  if (!srcNet || !tgtNet) return false;
  return srcNet !== tgtNet;
}

/** SYNC channel crosses a network/zone boundary — tight coupling risk. */
export function lintSyncCrossesNetwork(document: SystemDocument): LintIssue[] {
  const { graph } = document;
  const issues: LintIssue[] = [];

  for (const channel of graph.channels) {
    if (channel.delivery !== "sync") continue;
    if (!crossesNetwork(graph, channel.source, channel.target)) continue;

    issues.push({
      ruleId: "sync-crosses-network",
      severity: "warning",
      targetId: channel.id,
      message: `Sync channel "${channel.id}" crosses network boundary (${networkOf(graph, channel.source)} → ${networkOf(graph, channel.target)}).`,
      suggestion:
        "Prefer async events/messages across bounded contexts; use ACL if sync is required.",
    });
  }

  return issues;
}

/** Sync call directly to a queue — usually a modeling smell. */
export function lintSyncToQueue(document: SystemDocument): LintIssue[] {
  const { graph } = document;
  const issues: LintIssue[] = [];

  for (const channel of graph.channels) {
    if (channel.delivery !== "sync") continue;
    const target = nodeById(graph, channel.target);
    if (target?.kind !== "queue") continue;

    issues.push({
      ruleId: "sync-to-queue",
      severity: "error",
      targetId: channel.id,
      message: `Sync channel "${channel.id}" targets queue "${channel.target}".`,
      suggestion: "Publish asynchronously (async + event/message relationship).",
    });
  }

  return issues;
}

/** Delivery contradicts relationship semantics. */
export function lintDeliveryRelationshipMismatch(
  document: SystemDocument,
): LintIssue[] {
  const { graph } = document;
  const issues: LintIssue[] = [];

  for (const channel of graph.channels) {
    const { relationship, delivery } = channel;
    if (!relationship || !delivery) continue;

    if (isSyncRelationship(relationship) && delivery === "async") {
      issues.push({
        ruleId: "delivery-relationship-mismatch",
        severity: "warning",
        targetId: channel.id,
        message: `Channel "${channel.id}" is relationship "${relationship}" but delivery is async.`,
        suggestion: `Use delivery: sync for ${relationship}, or change relationship to event/message.`,
      });
    }

    if (isAsyncRelationship(relationship) && delivery === "sync") {
      issues.push({
        ruleId: "delivery-relationship-mismatch",
        severity: "warning",
        targetId: channel.id,
        message: `Channel "${channel.id}" is relationship "${relationship}" but delivery is sync.`,
        suggestion: `Use delivery: async for ${relationship}.`,
      });
    }
  }

  return issues;
}

function isRelationshipReviewGraph(graph: SystemGraph): boolean {
  return (
    graph.id === "outbox" ||
    graph.channels.some((channel) => channel.relationship !== undefined)
  );
}

/** Channels missing relationship annotation — review completeness. */
export function lintMissingRelationship(document: SystemDocument): LintIssue[] {
  if (!isRelationshipReviewGraph(document.graph)) return [];

  const issues: LintIssue[] = [];

  for (const channel of document.graph.channels) {
    if (channel.relationship) continue;
    issues.push({
      ruleId: "missing-relationship",
      severity: "info",
      targetId: channel.id,
      message: `Channel "${channel.id}" has no relationship kind (command, event, message, …).`,
      suggestion: "Add relationship for clearer architecture review.",
    });
  }

  return issues;
}

/** Multiple services sync-write to the same database. */
export function lintSharedDatabaseWrite(document: SystemDocument): LintIssue[] {
  const { graph } = document;
  const dbWriters = new Map<string, string[]>();

  for (const channel of graph.channels) {
    if (channel.delivery !== "sync") continue;
    const target = nodeById(graph, channel.target);
    if (target?.kind !== "database") continue;

    const writers = dbWriters.get(channel.target) ?? [];
    if (!writers.includes(channel.source)) {
      writers.push(channel.source);
    }
    dbWriters.set(channel.target, writers);
  }

  const issues: LintIssue[] = [];
  for (const [dbId, writers] of dbWriters) {
    if (writers.length < 2) continue;
    issues.push({
      ruleId: "shared-database-write",
      severity: "warning",
      targetId: dbId,
      message: `Database "${dbId}" receives sync writes from: ${writers.join(", ")}.`,
      suggestion:
        "Consider database-per-service, outbox, or explicit shared-data decision.",
    });
  }

  return issues;
}

/** Outbox RFC: persist sync; publish async; no sync to broker. */
export function lintOutboxPatternShape(document: SystemDocument): LintIssue[] {
  if (document.graph.id !== "outbox") return [];

  const issues: LintIssue[] = [];
  const syncToDb = document.graph.channels.some(
    (c) =>
      c.delivery === "sync" &&
      nodeById(document.graph, c.target)?.kind === "database",
  );
  const asyncToQueue = document.graph.channels.some(
    (c) =>
      c.delivery === "async" &&
      nodeById(document.graph, c.target)?.kind === "queue",
  );

  if (!syncToDb) {
    issues.push({
      ruleId: "outbox-missing-sync-persist",
      severity: "warning",
      message: "Outbox pattern expects a sync channel to the database (dual write).",
      suggestion: "Add sync command/request channel: Service → DB.",
    });
  }

  if (!asyncToQueue) {
    issues.push({
      ruleId: "outbox-missing-async-publish",
      severity: "warning",
      message: "Outbox pattern expects async publish to a queue/broker.",
      suggestion: "Add async event/message channel: Poller → Kafka.",
    });
  }

  return issues;
}

/** Suggest delivery when only relationship is set. */
export function lintUnderspecifiedDelivery(
  document: SystemDocument,
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const channel of document.graph.channels) {
    if (channel.delivery || !channel.relationship) continue;
    const inferred = inferDeliveryFromRelationship(channel.relationship);
    issues.push({
      ruleId: "inferred-delivery",
      severity: "info",
      targetId: channel.id,
      message: `Channel "${channel.id}" relationship "${channel.relationship}" implies delivery: ${inferred}.`,
      suggestion: `Set delivery: ${inferred} explicitly.`,
    });
  }

  return issues;
}

const ALL_RULES = [
  lintSyncCrossesNetwork,
  lintSyncToQueue,
  lintDeliveryRelationshipMismatch,
  lintMissingRelationship,
  lintSharedDatabaseWrite,
  lintOutboxPatternShape,
  lintUnderspecifiedDelivery,
] as const;

export const REVIEW_LINT_RULE_IDS = [
  "sync-crosses-network",
  "sync-to-queue",
  "delivery-relationship-mismatch",
  "missing-relationship",
  "shared-database-write",
  "outbox-missing-sync-persist",
  "outbox-missing-async-publish",
  "inferred-delivery",
] as const;

/** Run architecture review lint rules on a document. */
export function runReviewLint(
  document: SystemDocument,
  options: ReviewLintOptions = {},
): LintIssue[] {
  const issues = ALL_RULES.flatMap((rule) => rule(document));

  if (options.strict) {
    return issues.filter((i) => i.severity !== "info");
  }

  return issues;
}

export function reviewLintSummary(issues: LintIssue[]): {
  errors: number;
  warnings: number;
  infos: number;
  passed: boolean;
} {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;
  return {
    errors,
    warnings,
    infos,
    passed: errors === 0,
  };
}
