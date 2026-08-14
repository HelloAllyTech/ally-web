/**
 * Wire types for the Bug Hunter admin tab.
 * Mirrors ally-be src/bug-hunter DTOs.
 */

export enum BugHuntTrigger {
  SCHEDULED = "scheduled",
  MANUAL = "manual",
}

export enum BugHuntRunStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  /** The kill switch was off when this trigger fired; the run did no work. */
  SKIPPED_DISABLED = "skipped_disabled",
}

export enum BugHuntEventStage {
  SKIPPED_DISABLED = "skipped_disabled",
  FINDER_RESULT = "finder_result",
  VERIFY = "verify",
  FIX_ATTEMPT = "fix_attempt",
  TEST_WRITTEN = "test_written",
  DOC_UPDATED = "doc_updated",
  PR_OPENED = "pr_opened",
  MERGED = "merged",
  ESCALATED = "escalated",
  ERROR = "error",
  SETTINGS_CHANGED = "settings_changed",
}

/**
 * The kill switch's three positions. OFF blocks every trigger. MANUAL and AI
 * both let discovery run; only MANUAL gates the fix stage on an admin
 * approving each finding first.
 */
export enum BugHunterMode {
  OFF = "off",
  MANUAL = "manual",
  AI = "ai",
}

export enum BugFindingSource {
  TEST_FAILURE = "test_failure",
  LINT_ERROR = "lint_error",
  CODE_REVIEW = "code_review",
  PRODUCTION_LOG = "production_log",
  REPORTED_BUG = "reported_bug",
  ANALYTICS_SUGGESTION = "analytics_suggestion",
}

export enum BugFindingSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/** See ally-be's BugFindingStatus doc for the full transition map. */
export enum BugFindingStatus {
  NEW = "new",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  FIXING = "fixing",
  NEEDS_INPUT = "needs_input",
  PR_OPENED = "pr_opened",
  MERGED = "merged",
  DISMISSED = "dismissed",
  REJECTED = "rejected",
  FAILED = "failed",
}

export interface BugHunterSettings {
  mode: BugHunterMode;
  updatedBy: number | null;
  updatedAt: string;
}

export interface BugHuntEvent {
  id: string;
  runId: string | null;
  repo: string | null;
  stage: BugHuntEventStage;
  summary: string;
  payload: Record<string, unknown> | null;
  suggestionId: string | null;
  findingId: string | null;
  createdAt: string;
}

export interface BugFinding {
  id: string;
  runId: string | null;
  repo: string | null;
  source: BugFindingSource;
  title: string;
  description: string;
  file: string | null;
  evidence: string | null;
  severity: BugFindingSeverity | null;
  proven: boolean;
  touchesGuardedPath: boolean;
  reportedBugId: string | null;
  status: BugFindingStatus;
  prUrl: string | null;
  escalationQuestion: string | null;
  escalationAnswer: string | null;
  escalationAnsweredBy: number | null;
  escalationAnsweredAt: string | null;
  decidedBy: number | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugFindingDetail extends BugFinding {
  events: BugHuntEvent[];
}

export interface ListBugFindingsResponse {
  items: BugFinding[];
  count: number;
}

export interface ListBugFindingsQuery {
  status?: BugFindingStatus | "all";
  source?: BugFindingSource;
  repo?: string;
  limit?: number;
  offset?: number;
}

export interface BugHuntRun {
  id: string;
  trigger: BugHuntTrigger;
  repo: string;
  status: BugHuntRunStatus;
  finishedAt: string | null;
  foundCount: number;
  autoMergedCount: number;
  prOpenedCount: number;
  dismissedCount: number;
  /** USD, snapshotted from llm_usage at close time — not a live figure while RUNNING. */
  totalTokenCostUsd: string;
  createdAt: string;
}

export interface BugHuntRunDetail extends BugHuntRun {
  events: BugHuntEvent[];
}

export interface ListBugHuntRunsResponse {
  items: BugHuntRun[];
}
