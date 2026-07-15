/**
 * Domain types for Roleplay Studio v2 (spec-driven roleplays built with the
 * copilot). The spec document shape mirrors the frozen backend contract for
 * `v1/roleplay-studio`; the list/detail envelopes are typed to what the
 * frontend consumes and kept tolerant of extra fields.
 */

// ---------------------------------------------------------------------------
// Spec document
// ---------------------------------------------------------------------------

export interface RoleplayPersonaChunk {
  id: string;
  topics: string[];
  content: string;
}

export interface RoleplayPersona {
  identityCore: string;
  scenarioContext: string;
  chunks: RoleplayPersonaChunk[];
}

export interface RoleplayTransition {
  id: string;
  toStateId: string;
  description: string;
  whenBehaviorsAny?: string[];
  whenBehaviorsAll?: string[];
  minTurnsInState?: number;
  minCumulativeScore?: number;
}

export interface RoleplayStateNode {
  id: string;
  name: string;
  emotionalRegister: string;
  disclosurePosture: string;
  resistanceLevel: string;
  stateCard: string;
  defaultStageDirection: string;
  prosodyHints: string;
  transitions: RoleplayTransition[];
}

export interface RoleplayStateMachine {
  initialStateId: string;
  states: RoleplayStateNode[];
}

export interface RoleplaySecret {
  id: string;
  topic: string;
  content: string;
  unlockConditions: string;
  minStateIds: string[];
  lockedDeflection: string;
  tier: number;
}

export interface RoleplayDisclosureLedger {
  secrets: RoleplaySecret[];
}

export type RoleplayBehaviorPolarity = "positive" | "negative";

export interface RoleplayRubricBehavior {
  id: string;
  name: string;
  description: string;
  polarity: RoleplayBehaviorPolarity;
  weight: number;
  examples: string[];
}

export interface RoleplayRubric {
  behaviors: RoleplayRubricBehavior[];
}

export interface RoleplayEngineeredEvent {
  id: string;
  name?: string;
  description?: string;
  // The event contract is intentionally loose on the client; the copilot owns
  // authorship and additional keys flow through untouched.
  [key: string]: unknown;
}

export interface RoleplayVoiceConfig {
  /** languageId -> voiceId map, mirroring the simulation languageVoices shape. */
  languageVoices: Record<string, string>;
}

export interface RoleplayLanguageConfig {
  languageId?: string | number;
  languageCode?: string;
}

export interface RoleplayNodePosition {
  x: number;
  y: number;
}

export interface RoleplaySpecUi {
  /** Client-owned graph node positions, keyed by stateId. */
  layout: Record<string, RoleplayNodePosition>;
}

export interface RoleplaySpec {
  specSchemaVersion: number;
  title: string;
  competencyId?: string;
  persona: RoleplayPersona;
  stateMachine: RoleplayStateMachine;
  disclosureLedger: RoleplayDisclosureLedger;
  rubric: RoleplayRubric;
  engineeredEvents: RoleplayEngineeredEvent[];
  voice: RoleplayVoiceConfig;
  language: RoleplayLanguageConfig;
  agentTestCaseIds: string[];
  openingStatement: string;
  difficulty: string;
  /** Voice-naturalness / latency-masking runtime toggles (honored by worker_v2). */
  fillerEnabled: boolean;
  comfortAudioEnabled: boolean;
  /** Selected comfort-audio track URL + volume (0..1); used when comfortAudioEnabled. */
  comfortAudioUrl?: string;
  comfortAudioVolume?: number;
  continuousBackchanneling: boolean;
  interimReplyEnabled: boolean;
  ui: RoleplaySpecUi;
}

/** The voice-naturalness runtime toggle keys on the spec. */
export type RoleplayNaturalnessFlag =
  | "fillerEnabled"
  | "comfortAudioEnabled"
  | "continuousBackchanneling"
  | "interimReplyEnabled";

/** Top-level spec sections, used for patch attribution + flash highlighting. */
export type RoleplaySpecSection =
  | "title"
  | "competencyId"
  | "persona"
  | "stateMachine"
  | "disclosureLedger"
  | "rubric"
  | "engineeredEvents"
  | "voice"
  | "language"
  | "agentTestCaseIds"
  | "openingStatement"
  | "difficulty"
  | "fillerEnabled"
  | "comfortAudioEnabled"
  | "continuousBackchanneling"
  | "interimReplyEnabled"
  | "ui"
  | "specSchemaVersion";

// ---------------------------------------------------------------------------
// JSON Patch (RFC-6902 subset: add / replace / remove)
// ---------------------------------------------------------------------------

export type JsonPatchOpType = "add" | "replace" | "remove";

export interface JsonPatchOperation {
  op: JsonPatchOpType;
  path: string;
  value?: unknown;
}

// ---------------------------------------------------------------------------
// Spec CRUD envelopes
// ---------------------------------------------------------------------------

export enum RoleplaySpecStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum RoleplaySpecVersionStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export interface RoleplaySpecListItem {
  id: string;
  title: string;
  status: RoleplaySpecStatus | string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleplaySpecVersionSummary {
  id: string;
  status: RoleplaySpecVersionStatus | string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface RoleplaySpecVersionDetail extends RoleplaySpecVersionSummary {
  spec: RoleplaySpec;
}

export interface RoleplaySpecDetail {
  id: string;
  title: string;
  status: RoleplaySpecStatus | string;
  createdAt: string;
  updatedAt: string;
  /** The version the studio edits (latest draft). */
  activeVersion: RoleplaySpecVersionDetail;
}

export interface GetRoleplaySpecsResponse {
  data: RoleplaySpecListItem[];
  total?: number;
}

export interface CreateRoleplaySpecInput {
  title: string;
}

export interface UpdateRoleplaySpecInput {
  specId: string;
  title?: string;
  status?: RoleplaySpecStatus | string;
}

export interface SaveRoleplayDraftInput {
  specId: string;
  spec: RoleplaySpec;
  /** Optimistic-concurrency token; server replies 409 when it doesn't match. */
  expectedUpdatedAt: string | null;
}

export interface SaveRoleplayDraftResponse {
  updatedAt: string;
  /** Id of the immutable version snapshot this save appended server-side. */
  versionId?: string;
}

export interface PublishRoleplayVersionInput {
  specId: string;
  versionId: string;
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Copilot
// ---------------------------------------------------------------------------

export interface RoleplayCopilotSession {
  id: string;
  specId?: string;
  status?: string;
  /** Present on session resume (GET sessions/:id). */
  messages?: RoleplayCopilotServerMessage[];
  createdAt?: string;
}

/** Structured payload of a loop progress row (metadata.kind=improvement_update). */
export interface CopilotImprovementUpdatePayload {
  kind: "improvement_update";
  subkind: "round_scored" | "proposals_applied" | "finished" | "failed";
  improvementRunId: string;
  roundNumber?: number;
  roundKind?: string;
  scores?: { overall: number | null; testCounts: Record<string, number> | null } | null;
  deltas?: { overallVsPrevious: number | null; overallVsBaseline: number | null };
  proposals?: Array<{ summary: string; targetSection: string; severity: string }>;
  outcome?: string | null;
  trajectory?: Array<{
    roundNumber: number;
    kind: string;
    overall: number | null;
    testCounts: Record<string, number> | null;
  }>;
}

/** Structured payload of the "ready" row (metadata.kind=improvement_ready). */
export interface CopilotImprovementReadyPayload {
  kind: "improvement_ready";
  improvementRunId: string;
  specId: string;
  bestVersionId: string | null;
  acceptedVersionId: string | null;
  scores?: { overall: number | null; testCounts: Record<string, number> | null } | null;
}

export interface RoleplayCopilotMessageMetadata {
  /** On user rows answering an ask_trainer question. */
  questionId?: string;
  /** On assistant rows: structured cards emitted during that turn. */
  questions?: CopilotQuestionEvent[];
  testCaseSuggestions?: CopilotTestCaseSuggestion[];
  /** Loop narration / marker rows. */
  kind?: "improvement_update" | "improvement_ready" | "test_cases_accepted";
  suggestionIds?: string[];
  [key: string]: unknown;
}

export interface RoleplayCopilotServerMessage {
  id?: string;
  seq?: number;
  role: "user" | "assistant";
  content: string | null;
  metadata?: RoleplayCopilotMessageMetadata | null;
  toolResults?: Array<{ name?: string; result?: unknown }> | null;
  createdAt?: string;
}

export interface GetRoleplayCopilotMessagesParams {
  sessionId: string;
  page?: number;
  limit?: number;
}

export interface GetRoleplayCopilotMessagesResponse {
  data: RoleplayCopilotServerMessage[];
  total?: number;
}

/** SSE frame payloads on POST .../messages/stream */
export interface CopilotTokenEvent {
  delta: string;
}

export interface CopilotToolCallEvent {
  name: string;
  input?: unknown;
}

export interface CopilotToolResultEvent {
  name: string;
  summary: string;
}

export interface CopilotSpecPatchEvent {
  patchId: string;
  summary: string;
  ops: JsonPatchOperation[];
  specVersionId: string;
}

export type CopilotQuestionKind = "freeText" | "choice";

export interface CopilotQuestionEvent {
  id: string;
  prompt: string;
  kind: CopilotQuestionKind;
  options?: string[];
}

export interface CopilotErrorEvent {
  code: string;
  message: string;
}

export interface CopilotDoneEvent {
  messageSeq: number;
  specVersionId: string;
}

export type CopilotStreamEvent =
  | { type: "token"; data: CopilotTokenEvent }
  | { type: "tool_call"; data: CopilotToolCallEvent }
  | { type: "tool_result"; data: CopilotToolResultEvent }
  | { type: "spec_patch"; data: CopilotSpecPatchEvent }
  | { type: "question"; data: CopilotQuestionEvent }
  | { type: "test_case_suggestions"; data: { suggestions: CopilotTestCaseSuggestion[] } }
  | { type: "error"; data: CopilotErrorEvent }
  | { type: "done"; data: CopilotDoneEvent };

/** Chat feed entry rendered by the copilot panel. */
export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Present when the assistant asked a structured question. */
  question?: CopilotQuestionEvent;
  /** On resumed questions: the answer the trainer already gave. */
  answeredWith?: string;
  /** Present when the assistant suggested agent test cases (accept-to-persist cards). */
  testCaseSuggestions?: CopilotTestCaseSuggestion[];
  /** Resumed suggestion cards already accepted (by suggestion id). */
  acceptedSuggestionIds?: string[];
  /** Auto-improve loop progress row. */
  improvementUpdate?: CopilotImprovementUpdatePayload;
  /** The "ready to test live & publish" row (renders action buttons). */
  improvementReady?: CopilotImprovementReadyPayload;
  /** Subtle system-style note (e.g. accepted-test-cases marker). */
  systemNote?: boolean;
  /** Tool activity annotations shown inline. */
  toolNotes?: string[];
  /** True when a stream was aborted mid-message. */
  interrupted?: boolean;
  /** True while tokens are still streaming into this message. */
  streaming?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Rehearsals
// ---------------------------------------------------------------------------

export type RoleplayTraineeProfile = "SKILLED" | "POOR" | "ADVERSARIAL";

export enum RoleplayRehearsalStatus {
  STARTED = "STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

/**
 * Launch-time snapshot of an agent test case. The library is global and
 * hard-deleted, so completed runs carry their own copy (`config.testCases`).
 */
export interface RoleplayRehearsalTestCaseSnapshot {
  id: string;
  title: string;
  category?: string;
  condition?: string;
  test?: string;
}

export type RoleplayTestCaseVerdict = "PASSED" | "FAILED" | "INCONCLUSIVE";

/** One entry of `results.test_case_results` (snake_case: BE webhook contract). */
export interface RoleplayTestCaseResult {
  test_case_id: string;
  title?: string;
  verdict: RoleplayTestCaseVerdict | string;
  evidence?: string;
  reasoning?: string;
  condition_recreated?: boolean;
}

export interface CreateRoleplayRehearsalInput {
  specId: string;
  versionId: string;
  traineeProfiles: RoleplayTraineeProfile[];
  turnsPerProfile: number;
  /** Agent test cases to run as dedicated condition-driven sessions. */
  agentTestCaseIds?: string[];
  languageId?: number;
}

export type RoleplayJudgeDimension =
  | "persona_consistency"
  | "disclosure_discipline"
  | "difficulty_calibration"
  | "rubric_coverage";

export interface RoleplayRehearsalResults {
  overall: number;
  dimensions: Record<RoleplayJudgeDimension, number>;
  per_profile?: Record<string, Record<string, number>>;
  test_case_results?: RoleplayTestCaseResult[];
  test_counts?: { passed: number; failed: number; inconclusive: number };
  /** Percent 0-100; null when the run had no test cases. */
  test_pass_rate?: number | null;
}

export interface RoleplayRehearsalTranscriptTurn {
  role: string;
  content: string;
  turnIndex: number;
  stateId?: string;
  stageDirection?: string;
}

export interface RoleplayRehearsalTranscript {
  /**
   * Profile sessions carry a real profile; test-case sessions carry the
   * 'CONDITION_DRIVEN' label (not an enum member) plus `agentTestCaseId`.
   */
  traineeProfile?: RoleplayTraineeProfile | string;
  /** Set on test-case sessions; keys the verdict/snapshot lookups. */
  agentTestCaseId?: string;
  transcript: RoleplayRehearsalTranscriptTurn[];
  judgeScores?: Record<string, number>;
  judgeNotes?: string | Record<string, string>;
  directorTrace?: unknown;
}

export interface RoleplayRehearsal {
  id: string;
  specId?: string;
  specVersionId?: string;
  status: RoleplayRehearsalStatus | string;
  createdAt?: string;
  updatedAt?: string;
  /** @deprecated legacy top-level shape — the BE returns the raw entity, so read `config` first. */
  traineeProfiles?: RoleplayTraineeProfile[];
  turnsPerProfile?: number;
  /** Raw entity config as stored by the BE (profiles + launch-time snapshots). */
  config?: {
    traineeProfiles?: RoleplayTraineeProfile[];
    testCases?: RoleplayRehearsalTestCaseSnapshot[];
    turnsPerProfile?: number;
  };
  progress?: RoleplayRehearsalProgress;
  results?: RoleplayRehearsalResults | null;
  reportMarkdown?: string | null;
  transcripts?: RoleplayRehearsalTranscript[];
}

export type RoleplayCritiqueSeverity = "critical" | "major" | "minor";

export type RoleplayCritiqueProposalStatus =
  | "proposed"
  | "applied"
  | "rejected"
  | "skipped_invalid"
  | "verified"
  | "failed_verification";

/** Which metrics a proposal is expected to move — checked after re-rehearsal. */
export interface RoleplayExpectedEffect {
  dimensions?: Array<{ name: string; direction: "increase" | "decrease" }>;
  testCases?: Array<{ id: string; expectedVerdict: RoleplayTestCaseVerdict | string }>;
}

export interface RoleplayCritiqueProposal {
  /** Server-assigned id (persisted roleplay_critique_proposals row). */
  id: string;
  /** Canonical flat RFC-6902 ops — the BE normalizes whatever the LLM emitted. */
  ops: JsonPatchOperation[];
  summary: string;
  rationale: string;
  targetSection: RoleplaySpecSection | string;
  severity: RoleplayCritiqueSeverity | string;
  expectedEffect?: RoleplayExpectedEffect | null;
  status?: RoleplayCritiqueProposalStatus | string;
}

export interface RoleplayCritiqueResponse {
  proposals: Array<Omit<RoleplayCritiqueProposal, "id"> & { id?: string }>;
}

// ---------------------------------------------------------------------------
// Rehearsal comparison (score deltas between two runs)
// ---------------------------------------------------------------------------

export interface RoleplayDimensionDelta {
  before: number | null;
  after: number | null;
  delta: number | null;
}

export type RoleplayTestCaseFlip = "FIXED" | "REGRESSED" | "UNCHANGED" | "NEW" | "DROPPED";

export interface RoleplayRehearsalComparison {
  overall: RoleplayDimensionDelta;
  dimensions: Record<string, RoleplayDimensionDelta>;
  testCases: Array<{
    id: string;
    title: string;
    before: string | null;
    after: string | null;
    flip: RoleplayTestCaseFlip;
  }>;
  testPassRate: RoleplayDimensionDelta;
  regressed: boolean;
}

export interface RoleplayRehearsalComparisonResponse {
  against: {
    rehearsalId: string;
    specVersionId?: string;
    createdAt?: string;
  } | null;
  comparison: RoleplayRehearsalComparison | null;
}

// ---------------------------------------------------------------------------
// Auto-improve (improvement runs)
// ---------------------------------------------------------------------------

export type RoleplayImprovementRunStatus =
  | "RUNNING"
  | "AWAITING_REVIEW"
  | "ACCEPTED"
  | "DISCARDED"
  | "FAILED"
  | "CANCELLED";

export type RoleplayImprovementOutcome =
  | "TARGETS_MET"
  | "NO_PROPOSALS"
  | "MAX_ROUNDS"
  | "NO_IMPROVEMENT"
  | "TIMED_OUT"
  | "REHEARSAL_FAILED";

export type RoleplayImprovementRoundKind = "BASELINE" | "ITERATION" | "FINAL_VERIFICATION";

export type RoleplayImprovementRoundStatus =
  | "REHEARSING"
  | "CRITIQUING"
  | "APPLYING"
  | "DONE"
  | "FAILED";

export interface RoleplayImprovementRound {
  id: string;
  improvementRunId: string;
  roundNumber: number;
  kind: RoleplayImprovementRoundKind | string;
  candidateVersionId: string;
  rehearsalRunId?: string | null;
  status: RoleplayImprovementRoundStatus | string;
  fullScope: boolean;
  scores?: RoleplayRehearsalResults | null;
  deltas?: {
    vsPrevious?: RoleplayRehearsalComparison | null;
    vsBaseline?: RoleplayRehearsalComparison | null;
  } | null;
  proposalsAppliedCount: number;
}

export interface RoleplayImprovementTargets {
  minOverall?: number;
  minDimensions?: Record<string, number>;
  requireAllTestCasesPass?: boolean;
}

export interface RoleplayImprovementRun {
  id: string;
  specId: string;
  baseVersionId: string;
  status: RoleplayImprovementRunStatus | string;
  outcome?: RoleplayImprovementOutcome | string | null;
  config: {
    maxRounds?: number;
    targets?: RoleplayImprovementTargets;
    agentTestCaseIds?: string[];
    traineeProfiles?: RoleplayTraineeProfile[];
    turnsPerProfile?: number;
    languageId?: number;
    judgeModel?: string | null;
    cheapIntermediateRounds?: boolean;
    timeoutMinutes?: number;
  };
  currentRound: number;
  bestVersionId?: string | null;
  bestRehearsalId?: string | null;
  acceptedVersionId?: string | null;
  metadata?: Record<string, unknown> | null;
  endedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleplayImprovementRunDetail extends RoleplayImprovementRun {
  rounds: RoleplayImprovementRound[];
  proposals: RoleplayCritiqueProposal[];
}

export interface RoleplayImprovementDiffEntry {
  path: string;
  before: unknown;
  after: unknown;
}

export interface RoleplayImprovementDiff {
  baseVersionId: string;
  bestVersionId: string | null;
  changes: RoleplayImprovementDiffEntry[];
}

export interface StartImprovementRunInput {
  specId: string;
  versionId: string;
  maxRounds?: number;
  targets?: RoleplayImprovementTargets;
  agentTestCaseIds?: string[];
  traineeProfiles?: RoleplayTraineeProfile[];
  turnsPerProfile?: number;
  languageId?: number;
  cheapIntermediateRounds?: boolean;
}

export enum RoleplayImprovementSocketEvent {
  CONNECTED = "CONNECTED",
  JOIN_USER_IMPROVEMENTS_ROOM = "JOIN_USER_IMPROVEMENTS_ROOM",
  JOIN_IMPROVEMENT_ROOM = "JOIN_IMPROVEMENT_ROOM",
  IMPROVEMENTS_UPDATED = "IMPROVEMENTS_UPDATED",
}

// ---------------------------------------------------------------------------
// Copilot test-case suggestions (SSE frame `test_case_suggestions`)
// ---------------------------------------------------------------------------

export interface CopilotTestCaseSuggestion {
  id: string;
  title: string;
  category?: string | null;
  description?: string | null;
  condition?: string | null;
  test?: string | null;
}

// { completed, total } snapshot reported by the rehearsal webhook and pushed
// live over the rehearsals socket. Ticks once per fully-finished-and-judged
// unit (trainee profile or test case), so `completed` counts settled units.
export interface RoleplayRehearsalProgress {
  completed: number;
  total: number;
}

/**
 * Rehearsals socket (namespace `roleplay-studio/rehearsals`, event
 * `REHEARSALS_UPDATED`). Mirrors the backend `RehearsalEvents` enum. Each
 * `REHEARSALS_UPDATED` carries the whole `RoleplayRehearsal` (single object for
 * a `rehearsal:<id>` room, an array for the user room) — the `progress` field
 * on it is the live sub-progress source.
 */
export enum RoleplayRehearsalSocketEvent {
  CONNECTED = "CONNECTED",
  JOIN_USER_REHEARSALS_ROOM = "JOIN_USER_REHEARSALS_ROOM",
  JOIN_REHEARSAL_ROOM = "JOIN_REHEARSAL_ROOM",
  REHEARSALS_UPDATED = "REHEARSALS_UPDATED",
}

// ---------------------------------------------------------------------------
// Live sessions / preview
// ---------------------------------------------------------------------------

export interface CreateRoleplaySessionInput {
  specId: string;
  versionId: string;
  /** Chosen language for this session; defaults server-side to the spec's default. */
  languageId?: number;
}

export interface CreateRoleplaySessionResponse {
  sessionId: string;
  roomId: string;
  accessToken: {
    token: string;
    serverUrl: string;
    roomName: string;
  };
  useDirectAgentDispatch: boolean;
}

export interface RoleplayDirectorBehaviorObservation {
  id: string;
  observed: boolean;
}

export interface RoleplayDirectorTurnPayload {
  type: "director.turn";
  turn: number;
  behaviors: RoleplayDirectorBehaviorObservation[];
  state: { from: string; to: string };
  unlocks: Array<{ id: string; topic: string }>;
  events?: unknown[];
  score?: number;
  feedback?: string;
  stale?: boolean;
}

export interface RoleplayPreviewRoomData {
  sessionId: string;
  specId: string;
  versionId: string;
  roomId: string;
  title: string;
  localParticipant: { name?: string; coverImageUrl?: string };
  remoteParticipant: { name?: string; coverImageUrl?: string };
  accessToken: string;
  roomName: string;
  serverUrl: string;
  createdAt: string;
  useDirectAgentDispatch: boolean;
  stateNames: string[];
  difficultyLevel: string;
}
