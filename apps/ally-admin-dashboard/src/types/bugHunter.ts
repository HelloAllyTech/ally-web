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

export interface BugHunterSettings {
  enabled: boolean;
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
  createdAt: string;
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
