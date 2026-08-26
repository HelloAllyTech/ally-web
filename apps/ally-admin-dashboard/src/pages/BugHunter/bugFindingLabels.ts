import { en } from "@constants";
import { BugFindingSeverity, BugFindingSource, BugFindingStage } from "@types";

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

/**
 * The coarse roadmap ladder's labels — the roadmap board's own wording, reused
 * verbatim (`under_development` reads "In development" there too). Bugs left the
 * board, so this is now the only screen showing these; a bug that said
 * "Under development" where an idea says "In development" would read as two
 * different ladders.
 */
export const BUG_FINDING_STAGE_LABELS: Record<BugFindingStage, string> = {
  [BugFindingStage.NEW]: en.bugHunter.findingStageNew,
  [BugFindingStage.PRIORITISED]: en.bugHunter.findingStagePrioritised,
  [BugFindingStage.UNDER_DEVELOPMENT]: en.bugHunter.findingStageUnderDevelopment,
  [BugFindingStage.RELEASED]: en.bugHunter.findingStageReleased,
  [BugFindingStage.ARCHIVED]: en.bugHunter.findingStageArchived,
};
