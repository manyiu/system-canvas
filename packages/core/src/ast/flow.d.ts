/** Semantic flow type — orthogonal to sync/async delivery. */
export type RelationshipKind = "command" | "query" | "request" | "response" | "event" | "message" | "stream" | "replication" | "compensation" | "poll";
/** Payload role for review and labeling. */
export type PayloadKind = "command" | "query" | "request" | "response" | "event" | "message" | "record";
/** Suggested delivery when only relationship is set. */
export declare function inferDeliveryFromRelationship(relationship: RelationshipKind): "sync" | "async";
export declare function isSyncRelationship(relationship: RelationshipKind | undefined): boolean;
export declare function isAsyncRelationship(relationship: RelationshipKind | undefined): boolean;
export declare function parseRelationshipKind(value: unknown): RelationshipKind | undefined;
export declare function parsePayloadKind(value: unknown): PayloadKind | undefined;
/** Strip delivery/relationship prefixes accidentally persisted as channel labels. */
export declare function stripChannelLabelPrefix(label: string, delivery?: "sync" | "async", relationship?: RelationshipKind): string;
//# sourceMappingURL=flow.d.ts.map