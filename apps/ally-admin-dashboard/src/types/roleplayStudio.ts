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
  /** Primary competency (derived from competencyIds[0]); kept for back-compat. */
  competencyId?: string;
  /** All competencies this spec trains (first-class multi-select). */
  competencyIds?: string[];
  /** Competency display names, index-aligned with competencyIds. */
  competencyNames?: string[];
  persona: RoleplayPersona;
  stateMachine: RoleplayStateMachine;
  disclosureLedger: RoleplayDisclosureLedger;
  rubric: RoleplayRubric;
  engineeredEvents: RoleplayEngineeredEvent[];
  voice: RoleplayVoiceConfig;
  language: RoleplayLanguageConfig;
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
  | "competencyIds"
  | "competencyNames"
  | "persona"
  | "stateMachine"
  | "disclosureLedger"
  | "rubric"
  | "engineeredEvents"
  | "voice"
  | "language"
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

export interface RoleplayCopilotMessageMetadata {
  /** On user rows answering an ask_trainer question. */
  questionId?: string;
  /** On user rows: the structured answer for a select/dropdown/behaviour card. */
  answer?: CopilotStructuredAnswer;
  /** On assistant rows: structured cards emitted during that turn. */
  questions?: CopilotQuestionEvent[];
  behaviourReviews?: CopilotBehaviourReviewEvent[];
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

/** `choice` is a legacy alias for `singleSelect` (older persisted messages). */
export type CopilotQuestionKind =
  | "freeText"
  | "singleSelect"
  | "multiSelect"
  | "dropdown"
  | "choice";

export interface CopilotQuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface CopilotQuestionEvent {
  id: string;
  prompt: string;
  kind: CopilotQuestionKind;
  /** Structured options; legacy `choice` questions may carry bare strings. */
  options?: CopilotQuestionOption[] | string[];
  /** Show an "add your own" free-text entry alongside the options. */
  allowCustom?: boolean;
  /** Render a synthetic "None of these" choice. */
  allowNone?: boolean;
  /** Minimum selections before the trainer can confirm (e.g. 1 for languages). */
  minSelections?: number;
  /** Maximum selections allowed (omit for unlimited). */
  maxSelections?: number;
}

export interface CopilotBehaviourReviewItem {
  id: string;
  name: string;
  checked: boolean;
}

/** behaviour_review SSE payload — two polarity groups, pre-checked + tunable. */
export interface CopilotBehaviourReviewEvent {
  id: string;
  prompt: string;
  helpful: CopilotBehaviourReviewItem[];
  unhelpful: CopilotBehaviourReviewItem[];
  allowCustom?: boolean;
}

/** Structured answer the FE posts for select / dropdown / behaviour-review cards. */
export interface CopilotStructuredAnswer {
  selectedOptionIds?: string[];
  customValues?: string[];
  none?: boolean;
  helpful?: string[];
  unhelpful?: string[];
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
  | { type: "behaviour_review"; data: CopilotBehaviourReviewEvent }
  | { type: "error"; data: CopilotErrorEvent }
  | { type: "done"; data: CopilotDoneEvent };

/** Chat feed entry rendered by the copilot panel. */
export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Present when the assistant asked a structured question. */
  question?: CopilotQuestionEvent;
  /** Present when the assistant asked the trainer to review behaviours. */
  behaviourReview?: CopilotBehaviourReviewEvent;
  /** On resumed freeText/singleSelect questions: the answer already given. */
  answeredWith?: string;
  /** On resumed multi-select / dropdown / behaviour cards: the structured answer. */
  answeredAnswer?: CopilotStructuredAnswer;
  /** Tool activity annotations shown inline. */
  toolNotes?: string[];
  /** True when a stream was aborted mid-message. */
  interrupted?: boolean;
  /** True while tokens are still streaming into this message. */
  streaming?: boolean;
  error?: string;
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
