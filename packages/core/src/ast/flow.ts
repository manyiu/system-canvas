/** Semantic flow type — orthogonal to sync/async delivery. */
export type RelationshipKind =
  | "command"
  | "query"
  | "request"
  | "response"
  | "event"
  | "message"
  | "stream"
  | "replication"
  | "compensation"
  | "poll";

/** Payload role for review and labeling. */
export type PayloadKind =
  | "command"
  | "query"
  | "request"
  | "response"
  | "event"
  | "message"
  | "record";

const SYNC_RELATIONSHIPS = new Set<RelationshipKind>([
  "command",
  "query",
  "request",
  "response",
]);

const ASYNC_RELATIONSHIPS = new Set<RelationshipKind>([
  "event",
  "message",
  "stream",
  "replication",
  "compensation",
  "poll",
]);

/** Suggested delivery when only relationship is set. */
export function inferDeliveryFromRelationship(
  relationship: RelationshipKind,
): "sync" | "async" {
  if (SYNC_RELATIONSHIPS.has(relationship)) return "sync";
  if (ASYNC_RELATIONSHIPS.has(relationship)) return "async";
  return "async";
}

export function isSyncRelationship(
  relationship: RelationshipKind | undefined,
): boolean {
  return relationship !== undefined && SYNC_RELATIONSHIPS.has(relationship);
}

export function isAsyncRelationship(
  relationship: RelationshipKind | undefined,
): boolean {
  return relationship !== undefined && ASYNC_RELATIONSHIPS.has(relationship);
}

export function parseRelationshipKind(
  value: unknown,
): RelationshipKind | undefined {
  const kinds: RelationshipKind[] = [
    "command",
    "query",
    "request",
    "response",
    "event",
    "message",
    "stream",
    "replication",
    "compensation",
    "poll",
  ];
  return kinds.includes(value as RelationshipKind)
    ? (value as RelationshipKind)
    : undefined;
}

export function parsePayloadKind(value: unknown): PayloadKind | undefined {
  const kinds: PayloadKind[] = [
    "command",
    "query",
    "request",
    "response",
    "event",
    "message",
    "record",
  ];
  return kinds.includes(value as PayloadKind)
    ? (value as PayloadKind)
    : undefined;
}

const LABEL_SEPARATOR = " · ";

/** Strip delivery/relationship prefixes accidentally persisted as channel labels. */
export function stripChannelLabelPrefix(
  label: string,
  delivery?: "sync" | "async",
  relationship?: RelationshipKind,
): string {
  let rest = label.trim();
  const prefixParts = [delivery, relationship].filter(Boolean);
  if (prefixParts.length === 0) return rest;

  const prefix = prefixParts.join(LABEL_SEPARATOR);
  let changed = true;
  while (changed) {
    changed = false;
    if (rest.startsWith(`${prefix}${LABEL_SEPARATOR}`)) {
      rest = rest.slice(prefix.length + LABEL_SEPARATOR.length);
      changed = true;
    } else if (rest === prefix) {
      return "";
    }
  }
  return rest;
}
