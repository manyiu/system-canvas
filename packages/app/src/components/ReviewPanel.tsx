import { reviewLintSummary, runReviewLint, type LintIssue } from "@system-canvas/core";
import { useMemo } from "react";
import { useDocumentStore } from "../store/document-store.js";

const SEVERITY_CLASS: Record<LintIssue["severity"], string> = {
  error: "review-lint-error",
  warning: "review-lint-warning",
  info: "review-lint-info",
};

export function ReviewPanel() {
  const document = useDocumentStore((s) => s.document);

  const { issues, summary } = useMemo(() => {
    const result = runReviewLint(document);
    return { issues: result, summary: reviewLintSummary(result) };
  }, [document]);

  return (
    <aside className="review-panel" data-testid="review-panel">
      <div className="review-panel-header">
        <span className="review-panel-title">Architecture Review</span>
        <span
          className={`review-summary ${summary.passed ? "review-pass" : "review-fail"}`}
        >
          {summary.errors} errors · {summary.warnings} warnings · {summary.infos}{" "}
          info
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="review-empty">No lint findings — ready for review.</p>
      ) : (
        <ul className="review-lint-list">
          {issues.map((issue, index) => (
            <li
              key={`${issue.ruleId}-${issue.targetId ?? index}`}
              className={`review-lint-item ${SEVERITY_CLASS[issue.severity]}`}
            >
              <span className="review-lint-rule">{issue.ruleId}</span>
              <p className="review-lint-message">{issue.message}</p>
              {issue.suggestion && (
                <p className="review-lint-suggestion">{issue.suggestion}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
