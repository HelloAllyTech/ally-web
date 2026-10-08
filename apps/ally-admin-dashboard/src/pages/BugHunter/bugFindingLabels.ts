import { en } from "@constants";
import {
  BugFindingDecisionReason,
  BugFindingMissReason,
  BugFindingMissSense,
  BugFindingSeverity,
  BugFindingSource,
  BugFindingStage,
  BugFindingStatus,
} from "@types";

/** Short, scannable label per source — used by the findings table and drawer. */
export const BUG_FINDING_SOURCE_LABELS: Record<BugFindingSource, string> = {
  [BugFindingSource.TEST_FAILURE]: en.bugHunter.findingSourceTestFailure,
  [BugFindingSource.LINT_ERROR]: en.bugHunter.findingSourceLintError,
  [BugFindingSource.CODE_REVIEW]: en.bugHunter.findingSourceCodeReview,
  [BugFindingSource.PRODUCTION_LOG]: en.bugHunter.findingSourceProductionLog,
  [BugFindingSource.REPORTED_BUG]: en.bugHunter.findingSourceReportedBug,
  [BugFindingSource.ANALYTICS_SUGGESTION]: en.bugHunter.findingSourceAnalyticsSuggestion,
  [BugFindingSource.UX_SIGNAL]: en.bugHunter.findingSourceUxSignal,
  [BugFindingSource.LOCALE_PARITY]: en.bugHunter.findingSourceLocaleParity,
};

/**
 * The decline reasons, as the words a reviewer picks from.
 *
 * Deliberately phrased from the REVIEWER's point of view rather than the
 * database's — "Not actually a bug" is what someone means when they press it,
 * where "not_a_bug" is what gets stored. The order here is the order they are
 * offered in, commonest first: the whole point of the pick-list is that the
 * usual answer is the first key you reach for.
 */
export const BUG_FINDING_DECISION_REASON_LABELS: Record<BugFindingDecisionReason, string> = {
  [BugFindingDecisionReason.NOT_A_BUG]: en.bugHunter.declineNotABug,
  [BugFindingDecisionReason.WONT_FIX]: en.bugHunter.declineWontFix,
  [BugFindingDecisionReason.DUPLICATE]: en.bugHunter.declineDuplicate,
  [BugFindingDecisionReason.WRONG_REPO]: en.bugHunter.declineWrongRepo,
  [BugFindingDecisionReason.TOO_RISKY]: en.bugHunter.declineTooRisky,
  [BugFindingDecisionReason.OTHER]: en.bugHunter.declineOther,
};

/**
 * The order the reasons are offered in.
 *
 * `Object.keys` on the map above would work today and would silently reorder
 * the list the moment anyone added a key in the middle — and this order is a
 * product decision, not an implementation detail.
 */
export const BUG_FINDING_DECISION_REASON_ORDER: BugFindingDecisionReason[] = [
  BugFindingDecisionReason.NOT_A_BUG,
  BugFindingDecisionReason.WONT_FIX,
  BugFindingDecisionReason.DUPLICATE,
  BugFindingDecisionReason.WRONG_REPO,
  BugFindingDecisionReason.TOO_RISKY,
  BugFindingDecisionReason.OTHER,
];

/** One line per reason, explaining what picking it actually does. Shown as help text under the picker. */
export const BUG_FINDING_DECISION_REASON_HINTS: Record<BugFindingDecisionReason, string> = {
  [BugFindingDecisionReason.NOT_A_BUG]: en.bugHunter.declineNotABugHint,
  [BugFindingDecisionReason.WONT_FIX]: en.bugHunter.declineWontFixHint,
  [BugFindingDecisionReason.DUPLICATE]: en.bugHunter.declineDuplicateHint,
  [BugFindingDecisionReason.WRONG_REPO]: en.bugHunter.declineWrongRepoHint,
  [BugFindingDecisionReason.TOO_RISKY]: en.bugHunter.declineTooRiskyHint,
  [BugFindingDecisionReason.OTHER]: en.bugHunter.declineOtherHint,
};

/**
 * Short provider name for a finding's `engine` field — "Claude"/"Gemini", not
 * the raw settings value ("claude-code"/"gemini") a reader would have to
 * already know the mapping for. Falls back to the raw string for an engine
 * this map doesn't know yet, rather than hiding it.
 */
const ENGINE_PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude",
  gemini: "Gemini",
  opencode: "OpenCode",
};

/** "Claude · claude-sonnet-5", or null when either half hasn't been reported yet. */
export const engineModelLabel = (engine: string | null, model: string | null): string | null => {
  if (!engine || !model) return null;
  return `${ENGINE_PROVIDER_LABELS[engine] ?? engine} · ${model}`;
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

/**
 * The seventeen pipeline statuses, in words.
 *
 * Lives here beside the other label maps rather than inside the badge that
 * renders them, because three surfaces need the words and only one of them
 * renders a badge: the status facet lists them as checkbox labels and the stage
 * chip names the status its tooltip is explaining. Both of those used to hold
 * their own copy of this map — seventeen entries, written out twice, with
 * nothing making them agree.
 */
export const BUG_FINDING_STATUS_LABELS: Record<BugFindingStatus, string> = {
  [BugFindingStatus.NEW]: en.bugHunter.findingStatusNew,
  [BugFindingStatus.PENDING_APPROVAL]: en.bugHunter.findingStatusPendingApproval,
  [BugFindingStatus.APPROVED]: en.bugHunter.findingStatusApproved,
  [BugFindingStatus.QUEUED]: en.bugHunter.findingStatusQueued,
  [BugFindingStatus.BLOCKED]: en.bugHunter.findingStatusBlocked,
  [BugFindingStatus.COORDINATING]: en.bugHunter.findingStatusCoordinating,
  [BugFindingStatus.FIXING]: en.bugHunter.findingStatusFixing,
  [BugFindingStatus.NEEDS_INPUT]: en.bugHunter.findingStatusNeedsInput,
  [BugFindingStatus.PR_OPENED]: en.bugHunter.findingStatusPrOpened,
  [BugFindingStatus.MERGED]: en.bugHunter.findingStatusMerged,
  [BugFindingStatus.RELEASING]: en.bugHunter.findingStatusReleasing,
  [BugFindingStatus.RELEASED]: en.bugHunter.findingStatusReleased,
  [BugFindingStatus.RELEASE_FAILED]: en.bugHunter.findingStatusReleaseFailed,
  [BugFindingStatus.DISMISSED]: en.bugHunter.findingStatusDismissed,
  [BugFindingStatus.REJECTED]: en.bugHunter.findingStatusRejected,
  [BugFindingStatus.FAILED]: en.bugHunter.findingStatusFailed,
  [BugFindingStatus.CANCELLED]: en.bugHunter.findingStatusCancelled,
};

/**
 * Why a human-reported bug was missed, in Bug Hunter's own words — the five
 * reasons ally-be's miss classifier can write (OPP-0774).
 */
export const BUG_FINDING_MISS_REASON_LABELS: Record<BugFindingMissReason, string> = {
  [BugFindingMissReason.NO_SENSE]: en.bugHunter.missNoSense,
  [BugFindingMissReason.SENSE_MISSED]: en.bugHunter.missSenseMissed,
  [BugFindingMissReason.DETECTED_DECLINED]: en.bugHunter.missDetectedDeclined,
  [BugFindingMissReason.DETECTED_NOT_FIXED]: en.bugHunter.missDetectedNotFixed,
  [BugFindingMissReason.NOT_A_MISS]: en.bugHunter.missNotAMiss,
};

/** The sense named on a miss, as a short phrase a reader can act on. */
export const BUG_FINDING_MISS_SENSE_LABELS: Record<BugFindingMissSense, string> = {
  production_log: en.bugHunter.missSenseProductionLog,
  browser_errors: en.bugHunter.missSenseBrowserErrors,
  ux_signal: en.bugHunter.missSenseUxSignal,
  code_review: en.bugHunter.missSenseCodeReview,
  tests: en.bugHunter.missSenseTests,
  user_journey: en.bugHunter.missSenseUserJourney,
  data_integrity: en.bugHunter.missSenseDataIntegrity,
  voice_qa: en.bugHunter.missSenseVoiceQa,
  api_contract: en.bugHunter.missSenseApiContract,
  visual: en.bugHunter.missSenseVisual,
  locale_parity: en.bugHunter.missSenseLocaleParity,
  mobile_crash: en.bugHunter.missSenseMobileCrash,
  static_content: en.bugHunter.missSenseStaticContent,
  llm_output_eval: en.bugHunter.missSenseLlmOutputEval,
};
