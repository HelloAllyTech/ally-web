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
 * bug has no repo of its own yet. ally-mobile is included but never
 * auto-merges — Bug Hunter opens a PR there and a human always merges it.
 */
export const BUG_FIX_SESSION_REPOS = [
  "ally-be",
  "ally-web",
  "ally-ai",
  "ally-ai-learn",
  "ally-mobile",
] as const;

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
  /** An admin rewrote the bug's description — the brief a fix session reads. */
  DESCRIPTION_EDITED = "description_edited",
  /** An admin pinned or un-pinned the coarse roadmap stage by hand — see ally-be's BugFindingService.setStage. */
  STAGE_CHANGED = "stage_changed",
  /** Somebody said no, and why — a human rejecting a bug, or the Verify phase refuting one. */
  DECISION_RECORDED = "decision_recorded",
  /** A bug already fixed and shipped has come back. Written on both rows — the return and the fix that failed. */
  REGRESSED = "regressed",
  /** A sweep re-found a bug that was already declined, and dedupe suppressed it rather than opening a second row. */
  RECURRENCE_SUPPRESSED = "recurrence_suppressed",
}

/**
 * The coarse New → Prioritised → In development → Released ladder, mirroring
 * ally-be's RoadmapOpportunityStage.
 *
 * It is the roadmap's own vocabulary, and it appears on a bug because bugs are
 * no longer listed on the roadmap board — Bug Hunter is now the only place a bug
 * is shown, so the ladder the team already reads has to be readable here. The
 * value is DERIVED server-side from the pipeline status unless an admin pinned
 * it; see `BugFinding.stageIsAuto`.
 */
export enum BugFindingStage {
  NEW = "new",
  PRIORITISED = "prioritised",
  UNDER_DEVELOPMENT = "under_development",
  RELEASED = "released",
  ARCHIVED = "archived",
}

/**
 * Who reported a bug, and what their client captured at the time — present only
 * on rows a PERSON filed, null on every sweep-found row.
 *
 * Read server-side from the linked roadmap opportunity, which still stores the
 * report even though the board no longer lists it.
 */
export interface ReportedBugContext {
  opportunityId: string;
  /** "consumer" = the in-app Report-a-problem form; "staff" = somebody internal filed it. */
  reporterSource: "staff" | "consumer";
  reportedBy: number | null;
  reportedByName: string | null;
  tenantId: string | null;
  /**
   * Silently captured at report time: screen/route, device, os, appVersion,
   * clientTimestamp. Free-form — written by three different clients and never
   * validated, so treat every key as optional.
   */
  reporterContext: Record<string, unknown> | null;
  reportedAt: string;
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
  UX_SIGNAL = "ux_signal",
}

export enum BugFindingSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Why a bug was declined. Mirrors ally-be's BugFindingDecisionReason.
 *
 * Required on every reject, which makes it the one triage action that cannot
 * be taken silently. The reason has two readers: the next sweep, which is
 * shown finder-error declines as "do not re-file these", and the metrics
 * panel, which divides by them to say how often Bug Hunter is right.
 */
export enum BugFindingDecisionReason {
  NOT_A_BUG = "not_a_bug",
  DUPLICATE = "duplicate",
  WRONG_REPO = "wrong_repo",
  WONT_FIX = "wont_fix",
  TOO_RISKY = "too_risky",
  OTHER = "other",
}

/**
 * Reasons that mean the FINDER was wrong, as opposed to the bug being real
 * and unwanted. Mirrors ally-be's BUG_FINDING_FINDER_ERROR_REASONS.
 *
 * Only these count against accuracy. A team that declines nine real-but-minor
 * findings has not been served badly by its bug hunter; one that declines two
 * hallucinated bugs has.
 */
export const BUG_FINDING_FINDER_ERROR_REASONS: BugFindingDecisionReason[] = [
  BugFindingDecisionReason.NOT_A_BUG,
  BugFindingDecisionReason.WRONG_REPO,
  BugFindingDecisionReason.DUPLICATE,
];

/** Cap on the optional free-text note beside a reason. Mirrors ally-be's BUG_FINDING_DECISION_NOTE_MAX_LENGTH. */
export const BUG_FINDING_DECISION_NOTE_MAX_LENGTH = 500;

/**
 * Below this, a verified finding waits for a human even in AI mode. Mirrors
 * ally-be's BUG_HUNT_LOW_CONFIDENCE_THRESHOLD.
 *
 * Duplicated rather than fetched: it is a display threshold here (which
 * findings get a "low confidence" chip) and the server applies its own copy
 * where it actually matters. If the server's moves, this has to move too.
 */
export const BUG_FINDING_LOW_CONFIDENCE_THRESHOLD = 0.7;

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

/**
 * Statuses the description may be rewritten from. Mirrors ally-be's
 * BUG_FINDING_DESCRIPTION_EDITABLE_STATUSES, which is itself the fix-session
 * start list — the edit is offered exactly where "Put me on it" is, because
 * the point of editing is to improve the brief that button hands over.
 */
export const BUG_FINDING_DESCRIPTION_EDITABLE_STATUSES: BugFindingStatus[] =
  BUG_FINDING_FIX_SESSION_START_STATUSES;

/** Cap on an edited description. Mirrors ally-be's BUG_FINDING_DESCRIPTION_MAX_LENGTH. */
export const BUG_FINDING_DESCRIPTION_MAX_LENGTH = 5000;

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
  /** The finder's or reporter's own words, before an admin rewrote them. Null when nobody has edited this bug. */
  originalDescription: string | null;
  descriptionEditedBy: number | null;
  descriptionEditedAt: string | null;
  file: string | null;
  evidence: string | null;
  severity: BugFindingSeverity | null;
  proven: boolean;
  touchesGuardedPath: boolean;
  reportedBugId: string | null;
  status: BugFindingStatus;
  /** The coarse roadmap ladder. Derived from `status` unless pinned — see `stageIsAuto`. */
  stage: BugFindingStage;
  /** True while the stage tracks `status`. False once an admin pinned it, after which transitions no longer move it. */
  stageIsAuto: boolean;
  stageOverriddenBy: number | null;
  stageOverriddenByName: string | null;
  stageOverriddenAt: string | null;
  /** Present only when a person filed this bug. Null on every finder-discovered row. */
  report: ReportedBugContext | null;
  prUrl: string | null;
  escalationQuestion: string | null;
  escalationAnswer: string | null;
  escalationAnsweredBy: number | null;
  escalationAnsweredAt: string | null;
  decidedBy: number | null;
  decidedAt: string | null;
  /** Why this was declined. Null on anything not declined, and on rows declined before the reason was recorded. */
  decisionReason: BugFindingDecisionReason | null;
  decisionNote: string | null;
  /**
   * The Verify phase's LOWEST verifier certainty, 0-1.
   *
   * Null on a proven finding (nothing to verify) and on rows from before
   * verifiers reported one — so "no score" and "scored zero" are different
   * facts and must render differently.
   */
  confidence: number | null;
  /** The earlier finding this one is a return of — set when a shipped fix did not hold. */
  regressionOf: string | null;
  /** True on the EARLIER finding whose own fix came back. Points the opposite way to `regressionOf`. */
  regressed: boolean;
  /** How many sweeps have re-found this bug since it was declined. */
  rediscoveredCount: number;
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
  /**
   * Scope the table to one sweep's findings. Filtered server-side on purpose —
   * a sweep stamps its id onto every row it touches, including a
   * human-reported bug filed weeks earlier, so its findings are not the newest
   * rows and cannot be found inside a newest-100 window.
   */
  runId?: string;
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
  /** USD, snapshotted from llm_usage at close time — not a live figure while RUNNING. Cache-blind; prefer cliReportedCostUsd when present. */
  totalTokenCostUsd: string;
  /** USD, from the Claude Code CLI's own total_cost_usd — prices cache reads/writes at their real rate. Null for runs closed before this was captured. */
  cliReportedCostUsd: number | null;
  /** Raw token counts behind totalTokenCostUsd. Null for runs closed before this was tracked. */
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  createdAt: string;
}

export interface BugHuntRunDetail extends BugHuntRun {
  events: BugHuntEvent[];
}

export interface ListBugHuntRunsResponse {
  items: BugHuntRun[];
}

/**
 * Where a roadmap bug went. Returned by the deep-link lookup so an
 * `?opportunity=<id>` link to a bug can redirect rather than 404.
 *
 * `findingId` is null when no finding was ever opened for that roadmap row — a
 * bug filed before Bug Hunter's table existed, or one whose inbox write failed
 * (that write is best-effort by design).
 */
export interface BugFindingRef {
  findingId: string | null;
}

// ── metrics (GET /v1/bug-hunter/metrics) ──────────────────────────────────

/** One source's or one repo's funnel, from filed to live. Mirrors ally-be's FindingFunnel. */
export interface BugHunterFunnel {
  /** The source or repo this row aggregates. Null for a finding with no repo yet. */
  key: string | null;
  filed: number;
  /** Refuted by the Verify phase. */
  dismissed: number;
  /** Declined by a human. */
  rejected: number;
  /** Reached a fix at all — explicitly in Manual mode, implicitly in AI mode. */
  approved: number;
  /** Reached master. A released fix counts here too. */
  merged: number;
  released: number;
  failed: number;
  open: number;
  /** Declines where the finder was judged wrong. */
  finderErrors: number;
  /** Declines with no reason stored — rows decided before the column existed. */
  reasonNotRecorded: number;
  /**
   * `1 - finderErrors / judged`. **Null when nothing has been judged**, which
   * a renderer must show as "not enough decisions yet" rather than as 0%:
   * a young install has findings and no decisions, and 0% would read as the
   * agent being wrong every time.
   */
  accuracy: number | null;
  lowConfidence: number;
  unscored: number;
}

export interface BugHunterDecline {
  reason: BugFindingDecisionReason | "not_recorded";
  count: number;
  /** True when this reason means the finder was wrong. */
  finderError: boolean;
}

export interface BugHunterStageLatency {
  /** Median, not mean — one stalled bug should not describe the month. */
  medianHours: number | null;
  p90Hours: number | null;
  /** Findings the figures are computed from. A median over two is not a latency. */
  sampled: number;
}

export interface BugHunterMetrics {
  windowDays: number;
  since: string;
  totalFiled: number;
  overall: BugHunterFunnel;
  bySource: BugHunterFunnel[];
  byRepo: BugHunterFunnel[];
  declines: BugHunterDecline[];
  latency: {
    filedToDecided: BugHunterStageLatency;
    filedToMerged: BugHunterStageLatency;
    mergedToReleased: BugHunterStageLatency;
  };
  regressions: {
    /** New findings in the window that are a fix coming back. */
    filed: number;
    /** Fixes shipped in the window that have since returned. */
    fixesThatFailed: number;
    /** fixesThatFailed / merged. Null when nothing merged. */
    rate: number | null;
  };
  cost: {
    totalUsd: number;
    runs: number;
    fixSessionRuns: number;
    fixSessionUsd: number;
    /** Fix-session spend per fix that actually landed. Null when nothing merged. */
    perMergedFixUsd: number | null;
  };
}
