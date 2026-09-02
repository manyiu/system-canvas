import type { SystemDocument } from "../ast/document.js";
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
/** SYNC channel crosses a network/zone boundary — tight coupling risk. */
export declare function lintSyncCrossesNetwork(document: SystemDocument): LintIssue[];
/** Sync call directly to a queue — usually a modeling smell. */
export declare function lintSyncToQueue(document: SystemDocument): LintIssue[];
/** Delivery contradicts relationship semantics. */
export declare function lintDeliveryRelationshipMismatch(document: SystemDocument): LintIssue[];
/** Channels missing relationship annotation — review completeness. */
export declare function lintMissingRelationship(document: SystemDocument): LintIssue[];
/** Multiple services sync-write to the same database. */
export declare function lintSharedDatabaseWrite(document: SystemDocument): LintIssue[];
/** Outbox RFC: persist sync; publish async; no sync to broker. */
export declare function lintOutboxPatternShape(document: SystemDocument): LintIssue[];
/** Suggest delivery when only relationship is set. */
export declare function lintUnderspecifiedDelivery(document: SystemDocument): LintIssue[];
export declare const REVIEW_LINT_RULE_IDS: readonly ["sync-crosses-network", "sync-to-queue", "delivery-relationship-mismatch", "missing-relationship", "shared-database-write", "outbox-missing-sync-persist", "outbox-missing-async-publish", "inferred-delivery"];
/** Run architecture review lint rules on a document. */
export declare function runReviewLint(document: SystemDocument, options?: ReviewLintOptions): LintIssue[];
export declare function reviewLintSummary(issues: LintIssue[]): {
    errors: number;
    warnings: number;
    infos: number;
    passed: boolean;
};
//# sourceMappingURL=lint.d.ts.map