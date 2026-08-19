/**
 * Wire types for the Bug Hunter admin tab.
 * Mirrors ally-be src/bug-hunter DTOs.
 */

export enum BugHuntTrigger {
  SCHEDULED = "scheduled",
  MANUAL = "manual",
  /** One admin, one bug, one click — a run scoped to a single finding. */
  FIX_SESSION = "fix_session",
}

/**
 * Repos a fix session can run in — i.e. those carrying `bug-fix-session.yml`.
 * Mirrors ally-be's BUG_FIX_SESSION_REPOS; the admin picks from these when the
 * bug has no repo of its own yet. ally-mobile is absent on purpose: it has no
 * dispatchable fix-session workflow.
 */
export const BUG_FIX_SESSION_REPOS = ["ally-be", "ally-web", "ally-ai", "ally-ai-learn"] as const;

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
  SESSION_DISPATCHED = "session_dispatched",
  PLAN_CREATED = "plan_created",
  STEP_STARTED = "step_started",
  RELEASE_DISPATCHED = "release_dispatched",
  RELEASED = "released",
  RELEASE_FAILED = "release_failed",
  /** An admin pressed "Stop fix session" — see ally-be's BugFixSessionService.cancelFixSession. */
  CANCELLED = "cancelled",
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
  /** Fix session dispatched to GitHub Actions; the agent hasn't reported in yet. */
  QUEUED = "queued",
  /** A step of a multi-repo plan whose turn hasn't come — an earlier repo has to land first. */
  BLOCKED = "blocked",
  /** A multi-repo bug whose plan Bug Hunter is working through, one repo at a time. */
  COORDINATING = "coordinating",
  FIXING = "fixing",
  NEEDS_INPUT = "needs_input",
  PR_OPENED = "pr_opened",
  MERGED = "merged",
  RELEASING = "releasing",
  RELEASED = "released",
  /** Merged to master, but the production deploy went red — a different thing to act on than FAILED. */
  RELEASE_FAILED = "release_failed",
  DISMISSED = "dismissed",
  REJECTED = "rejected",
  FAILED = "failed",
  /** An admin stopped a running fix session. Distinct from FAILED: a human decision, not the agent giving up — see ally-be's BugFixSessionService.cancelFixSession. */
  CANCELLED = "cancelled",
}

/** Statuses the "Start fix session" button is offered from. Mirrors ally-be's BUG_FINDING_FIX_SESSION_START_STATUSES. */
export const BUG_FINDING_FIX_SESSION_START_STATUSES: BugFindingStatus[] = [
  BugFindingStatus.NEW,
  BugFindingStatus.PENDING_APPROVAL,
  BugFindingStatus.APPROVED,
  BugFindingStatus.NEEDS_INPUT,
  BugFindingStatus.PR_OPENED,
  BugFindingStatus.FAILED,
  // A human stopped a stuck session, but the bug still needs fixing — same
  // retry story as FAILED.
  BugFindingStatus.CANCELLED,
];

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
  /** GitHub Actions run doing the fixing. Null until the backend correlates the dispatch to a run. */
  sessionRunUrl: string | null;
  /** GitHub Actions run id for the fix session, once resolved. What "Stop fix session" cancels. */
  sessionRunId: string | null;
  releaseTag: string | null;
  releaseRunUrl: string | null;
  releasedBy: number | null;
  releasedAt: string | null;
  /** The admin who pressed "Stop fix session". */
  cancelledBy: number | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** How loud a notification is. Only ACTION_NEEDED means Bug Hunter has stopped and is waiting on you. */
export enum BugHunterNotificationLevel {
  INFO = "info",
  PROBLEM = "problem",
  ACTION_NEEDED = "action_needed",
}

export interface BugHunterNotification {
  id: string;
  findingId: string | null;
  runId: string | null;
  repo: string | null;
  level: BugHunterNotificationLevel;
  title: string;
  body: string | null;
  readAt: string | null;
  readBy: number | null;
  createdAt: string;
}

export interface ListBugHunterNotificationsResponse {
  items: BugHunterNotification[];
  /** Drives the badge — unread across all levels. */
  unreadCount: number;
}

/** One repo's worth of a multi-repo fix. The array order IS the ship order. */
export interface BugFixStep {
  id: string;
  stepIndex: number;
  repo: string | null;
  stepSummary: string | null;
  status: BugFindingStatus;
  prUrl: string | null;
  releaseTag: string | null;
  sessionRunUrl: string | null;
  releaseRunUrl: string | null;
}

export interface BugFindingDetail extends BugFinding {
  events: BugHuntEvent[];
  /** Empty for an ordinary single-repo bug — its presence is what makes this a coordinated fix. */
  steps: BugFixStep[];
  /** Whether "Release to production" applies right now — the backend decides, since it depends on repo/file mapping and on whether this environment has GitHub credentials. */
  releasable: boolean;
  /** What would be deployed, e.g. "Admin dashboard (CloudFront)". */
  releaseTarget: string | null;
  /** Why releasing is unavailable despite the fix being merged. Null when releasable, or when it simply isn't merged yet. */
  releaseBlockedReason: string | null;
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
