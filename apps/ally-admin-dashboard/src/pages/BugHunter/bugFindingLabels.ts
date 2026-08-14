import { en } from "@constants";
import { BugFindingSeverity, BugFindingSource } from "@types";

/** Short, scannable label per source — used by the findings table and drawer. */
export const BUG_FINDING_SOURCE_LABELS: Record<BugFindingSource, string> = {
  [BugFindingSource.TEST_FAILURE]: en.bugHunter.findingSourceTestFailure,
  [BugFindingSource.LINT_ERROR]: en.bugHunter.findingSourceLintError,
  [BugFindingSource.CODE_REVIEW]: en.bugHunter.findingSourceCodeReview,
  [BugFindingSource.PRODUCTION_LOG]: en.bugHunter.findingSourceProductionLog,
  [BugFindingSource.REPORTED_BUG]: en.bugHunter.findingSourceReportedBug,
  [BugFindingSource.ANALYTICS_SUGGESTION]: en.bugHunter.findingSourceAnalyticsSuggestion,
};

export const BUG_FINDING_SEVERITY_LABELS: Record<BugFindingSeverity, string> = {
  [BugFindingSeverity.LOW]: en.bugHunter.findingSeverityLow,
  [BugFindingSeverity.MEDIUM]: en.bugHunter.findingSeverityMedium,
  [BugFindingSeverity.HIGH]: en.bugHunter.findingSeverityHigh,
};
