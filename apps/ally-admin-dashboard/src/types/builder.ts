/**
 * Builder types. Mirrors ally-be `src/builder/type/*` and its enums — the two
 * are hand-kept in step, so a change on either side needs the other.
 */

export type BuilderSessionStatus =
  | "INTERVIEWING"
  | "PRD_READY"
  | "BUILDING"
  | "WAITING_FOR_INPUT"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type BuilderStage =
  | "SETUP"
  | "PLANNING"
  | "CODING"
  | "TESTING"
  /** The machine test gate — every touched repo's tests, lint and typecheck. */
  | "GATE"
  | "VERIFYING"
  /** A coder pass fixing gate failures or reviewer objections. */
  | "REMEDIATING"
  /** E2E, push and PRs — only reached once the gate and reviewer are happy. */
  | "FINALISING"
  | "E2E_VERIFY"
  | "OPENING_PRS"
  | "REPORTING"
  | "DONE";

export interface BuilderSession {
  id: string;
  title: string;
  slug: string;
  status: BuilderSessionStatus;
  currentStage: BuilderStage | null;
  repos: string[] | null;
  engine: string;
  model: string | null;
  lastMessageSeq: number;
  budgetUsd: string | null;
  totalCostUsd: string;
  runnerMinutes: number;
  error: string | null;
  /** Set once the creator archives the session out of their default feed. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The archived-only feed view: paginated, unlike the default list above. */
export interface BuilderArchivedSessionsPage {
  sessions: BuilderSession[];
  totalCount: number;
}

/* ── PRD document ───────────────────────────────────────────────────────── */

export interface BuilderPrdRequirement {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface BuilderPrdAssumption {
  id: string;
  text: string;
  status: "confirmed" | "unconfirmed";
}

export interface BuilderPrdRepoPlan {
  repo: string;
  changesMd: string;
}

export interface BuilderPrdDocument {
  title: string;
  summary: string;
  problem: string;
  usersAndContext: string;
  goals: string;
  nonGoals: string;
  requirements: BuilderPrdRequirement[];
  assumptions: BuilderPrdAssumption[];
  technicalPlan: {
    repos: BuilderPrdRepoPlan[];
    dataModelMd: string;
    apiMd: string;
  };
  testPlanMd: string;
  e2ePlanMd: string;
  openQuestions: string[];
  ui?: { interview?: Record<string, boolean> };
}

export interface BuilderPrdReadinessSection {
  key: string;
  label: string;
  ok: boolean;
  /** One short sentence — this is what the section tooltip renders. */
  hint: string;
  /**
   * The same gap spelled out for the interview agent (JSON Pointers, field
   * names, legal values). Deliberately not rendered: it is long by design and
   * belongs in the agent's tool results, not in a tooltip.
   */
  detail?: string;
}

export interface BuilderPrdReadiness {
  score: number;
  ready: boolean;
  sections: BuilderPrdReadinessSection[];
  /** `hint` + `detail` per blocked section. Counted here, not read. */
  blockers: string[];
}

export interface BuilderPrdVersion {
  id: string;
  versionNumber: number;
  author: "agent" | "admin";
  changeSummary: string | null;
  createdAt: string;
}

/* ── Chat + SSE ─────────────────────────────────────────────────────────── */

export type BuilderQuestionKind = "freeText" | "singleSelect" | "multiSelect" | "dropdown";

export interface BuilderQuestionOption {
  id: string;
  label: string;
  /** The trade-off in one line — what makes an option pickable at a glance. */
  description?: string;
  /** At most one per question; the UI focuses it for one-key answering. */
  recommended?: boolean;
}

export interface BuilderQuestionEvent {
  id: string;
  prompt: string;
  kind: BuilderQuestionKind;
  options?: BuilderQuestionOption[];
  allowCustom?: boolean;
  allowNone?: boolean;
  minSelections?: number;
  maxSelections?: number;
  /** Why this is being asked; rendered as a subtitle on the card. */
  rationale?: string;
}

/** Structured answer payload posted back with the next turn. */
export interface BuilderStructuredAnswer {
  selectedOptionIds?: string[];
  customValues?: string[];
  none?: boolean;
}

export interface BuilderDoneEvent {
  messageSeq: number;
  sessionStatus: BuilderSessionStatus;
  readinessScore: number;
}

export type BuilderStreamEvent =
  | { type: "token"; data: { delta: string } }
  | { type: "tool_call"; data: { name: string; input: Record<string, unknown> } }
  | { type: "tool_result"; data: { name: string; summary: string } }
  | { type: "question"; data: BuilderQuestionEvent }
  | {
      type: "prd_draft";
      data: { draft: BuilderPrdDocument; versionNumber: number };
    }
  | { type: "readiness"; data: BuilderPrdReadiness }
  | { type: "error"; data: { code: string; message: string } }
  | { type: "done"; data: BuilderDoneEvent }
  | { type: "ping"; data: { at: number } };

/** One rendered row in the chat feed. */
export interface BuilderChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Tool activity for this turn, shown as chips above the bubble. */
  toolNotes?: string[];
  question?: BuilderQuestionEvent;
  /** Set on resume so an answered card renders locked. */
  answeredWith?: string;
  answeredAnswer?: BuilderStructuredAnswer;
  isStreaming?: boolean;
  interrupted?: boolean;
  error?: string;
}

/** Persisted transcript row, as returned by GET /builder/sessions/:id. */
export interface BuilderServerMessage {
  id: string;
  seq: number;
  role: "user" | "assistant";
  content: string | null;
  toolCalls?: { id: string; name: string; input: Record<string, unknown> }[] | null;
  toolResults?: { toolUseId: string; name: string; result: unknown }[] | null;
  metadata?: {
    questions?: BuilderQuestionEvent[];
    questionId?: string;
    answer?: BuilderStructuredAnswer;
    /** The turn died — set by the server so a reload still shows the failure. */
    errored?: boolean;
    /** What to tell the admin about it; falls back to generic copy. */
    errorMessage?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string;
}

export interface BuilderSessionDetail extends BuilderSession {
  messages: BuilderServerMessage[];
  prd: BuilderPrdDocument;
  prdVersionNumber: number;
  readiness: BuilderPrdReadiness;
}

/* ── Builds ─────────────────────────────────────────────────────────────── */

export type BuilderRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "WAITING_FOR_INPUT";

export interface BuilderBuildRun {
  id: string;
  sessionId: string;
  sequence: number;
  /** `fix` is a run dispatched from Bug Hunter's build-a-fix flow, not a session resume. */
  mode: "build" | "resume" | "fix";
  status: BuilderRunStatus;
  engine: string;
  model: string;
  branchSlug: string;
  branches: Record<string, string> | null;
  githubRunUrl: string | null;
  dispatchedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastEventSeq: number;
  costUsd: string | null;
  runnerMinutes: number | null;
  error: string | null;
}

export type BuilderEventType =
  | "text"
  | "tool_call"
  | "tool_result"
  | "file_edit"
  | "todo"
  | "test_output"
  | "stage_change"
  | "plan"
  | "verification"
  /** A machine-run check result — verified, not self-reported. */
  | "gate_result"
  | "phase_cost"
  /**
   * A run parked at a phase boundary because the spend ceiling is gone.
   * `payload.state`: `held` while it waits, `raised` once a new ceiling let it
   * carry on, `expired` when nobody answered and the run stopped.
   */
  | "budget_hold"
  | "question"
  | "e2e_evidence"
  | "e2e_skipped"
  | "pr_opened"
  | "report"
  | "cost"
  | "error"
  | "done";

/**
 * Live spend against the session's ceiling.
 *
 * Polled while a build is running rather than read off the session, whose
 * detail response is fetched once: the spend moves every phase, and `hold` is
 * set only while a run is actually sitting on the ceiling waiting for a raise.
 */
export interface BuilderBudgetState {
  budgetUsd: number | null;
  spentUsd: number;
  remainingUsd: number | null;
  exceeded: boolean;
  /** How long a held run waits before giving up, from the server. */
  holdSeconds: number;
  pollSeconds: number;
  hold: { runId: string; heldAt: string; holdUntil: string } | null;
}

export interface BuilderBuildEvent {
  id: string;
  runId: string;
  seq: number;
  stage: BuilderStage | null;
  type: BuilderEventType;
  payload: Record<string, any>;
  createdAt: string;
}

/** One row of the agent's own checklist, replaced wholesale on each change. */
export interface BuilderTodoItem {
  id?: string;
  text: string;
  status: "pending" | "in_progress" | "done";
}

export interface BuilderPendingQuestion {
  id: string;
  sessionId: string;
  runId: string;
  groupId: string;
  position: number;
  question: BuilderQuestionEvent;
  status: "pending" | "answered" | "superseded";
}

export interface BuilderPullRequest {
  id: string;
  repo: string;
  branch: string;
  prNumber: number;
  prUrl: string;
  title: string | null;
  ciStatus: string | null;
  merged: boolean;
  mergedAt: string | null;
}

export interface BuilderReport {
  id: string;
  runId: string | null;
  type: "run_report" | "session_report" | "retrospective";
  contentMd: string;
  metrics: Record<string, any> | null;
  createdAt: string;
}

export interface BuilderSettings {
  id: string;
  enabled: boolean;
  maxConcurrentBuilds: number;
  defaultBudgetUsd: string | null;
  /**
   * Per-tier model overrides for new runs. Null falls through to the
   * platform default — same resolution order a per-run override sits above
   * (see `startBuilderBuild`'s `plannerModel`/`model`/`verifierModel`).
   */
  plannerModel: string | null;
  coderModel: string | null;
  verifierModel: string | null;
}

export interface BuilderNotification {
  id: string;
  sessionId: string;
  kind: "question_pending" | "build_completed" | "build_failed" | "prs_opened" | "budget_reached";
  message: string;
  readAt: string | null;
  createdAt: string;
}

/* ── Requests ───────────────────────────────────────────────────────────── */

export interface CreateBuilderSessionRequest {
  title?: string;
}

export interface UpdateBuilderSessionRequest {
  id: string;
  title?: string;
  repos?: string[];
  engine?: string;
  model?: string;
}

export interface BuilderPrdPatchOp {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
}

export interface PatchBuilderPrdRequest {
  id: string;
  ops: BuilderPrdPatchOp[];
  changeSummary?: string;
}

export interface PatchBuilderPrdResponse {
  prd: BuilderPrdDocument;
  readiness: BuilderPrdReadiness;
  versionNumber: number;
}

export interface BuilderRepoCommand {
  repo: string;
  description: string;
  test: string;
  lint: string;
  typecheck: string | null;
  e2eCapable: boolean;
  guardedPaths: string[];
}

export interface BuilderRepoMapSummary {
  repo: string;
  commitSha: string | null;
  generatedAt: string | null;
  stats: Record<string, unknown> | null;
}

/* ── Scoreboard ─────────────────────────────────────────────────────────── */

export type BuilderScoreboardOutcome = "merged" | "open" | "failed" | "cancelled";

export interface BuilderScoreboardBuild {
  sessionId: string;
  title: string;
  repos: string[];
  createdAt: string;
  outcome: BuilderScoreboardOutcome;
  /** First dispatch to last completion — includes any wait for a person. */
  durationHours: number | null;
  /** The sum of the runs' own wall clocks: machine time only. */
  machineMinutes: number | null;
  /** The remainder — time parked on a question. Null when unmeasurable. */
  humanWaitMinutes: number | null;
  costUsd: number;
  runCount: number;
  fixRunCount: number;
  reviewCommentCount: number;
  ciFailureCount: number;
  timeToMergeHours: number | null;
  failureTags: string[];
}

export interface BuilderScoreboardTrendWeek {
  weekStart: string;
  builds: number;
  mergeRate: number;
  medianCostUsd: number;
  medianFixRuns: number;
  medianTimeToMergeHours: number | null;
}

export interface BuilderScoreboardTotals {
  builds: number;
  merged: number;
  mergeRate: number;
  totalCostUsd: number;
  medianCostUsd: number;
}

export interface BuilderScoreboard {
  builds: BuilderScoreboardBuild[];
  trends: BuilderScoreboardTrendWeek[];
  totals: BuilderScoreboardTotals;
  /**
   * Where the losses come from, across the window. The backend has always
   * returned this; nothing rendered it, so the one view that could point effort
   * at a cause showed only per-build tags you had to tally by eye.
   */
  failureTags: { tag: string; count: number }[];
}

/* ── Pipeline health: where a run's time and money go ───────────────────────
 *
 * Every measurement here is nullable and that is load-bearing, not defensive.
 * Runs dispatched before the runner reported timings have a cost record with no
 * clock, so `null` means "not measured" and must never render as 0 — a phase
 * shown as taking no time reads as instant rather than unknown. */

export interface BuilderPipelinePhase {
  /** plan, code-1, verify-2, finalise, fix … */
  phase: string;
  model: string | null;
  invocations: number;
  totalCostUsd: number | null;
  medianCostUsd: number | null;
  /** Wall clock of the invocation. */
  medianWallMs: number | null;
  p95WallMs: number | null;
  /** Of the wall clock, the part spent waiting on the model. */
  medianApiMs: number | null;
  medianTurns: number | null;
}

export interface BuilderPipelineGate {
  repo: string;
  /** test | lint | typecheck */
  kind: string;
  results: number;
  passed: number;
  /** null when there is no evidence either way, which is not the same as 0%. */
  passRate: number | null;
}

export interface BuilderPipelineOutcome {
  status: BuilderRunStatus;
  mode: string;
  runs: number;
  medianRunnerMinutes: number | null;
}

export interface BuilderPipelineHealth {
  windowDays: number;
  phases: BuilderPipelinePhase[];
  gates: BuilderPipelineGate[];
  outcomes: BuilderPipelineOutcome[];
}

/* ── Knowledge: lessons + exemplars ────────────────────────────────────── */

export type BuilderLessonStatus = "candidate" | "active" | "merged" | "retired";

export interface BuilderLesson {
  id: string;
  lesson: string;
  category: string;
  status: BuilderLessonStatus;
  /**
   * A pinned lesson is exempt from the automatic curator's edits and
   * retirement — a person put it there on purpose, and the periodic
   * consolidation pass must not touch it.
   */
  pinned: boolean;
  sourceCount: number;
  timesApplied: number;
  timesContradicted: number;
  repos: string[];
  tags: string[];
  createdAt: string;
}

export interface PatchBuilderLessonRequest {
  id: string;
  lesson?: string;
  category?: string;
  status?: BuilderLessonStatus;
  pinned?: boolean;
  tags?: string[];
}

export interface BuilderExemplar {
  id: string;
  sessionId: string;
  title: string;
  repos: string[];
  outcome: BuilderScoreboardOutcome;
  fixRunCount: number;
  reviewCommentCount: number;
  ciFailureCount: number;
  costUsd: number;
  timeToMergeHours: number | null;
  failureTags: string[];
  summaryMd: string;
  createdAt: string;
}
