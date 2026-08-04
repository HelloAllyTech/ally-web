import { EventDetectionConfig } from "@types";

import { SimulationStatus, ScenarioVoice } from "./createSimulation";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  AGENT_JOINED = "agent_joined",
}

export interface LiveKitEvent {
  version: string;
  data: {
    score: number | null;
    emoji: string;
    message: string;
    detected_event_ids: string[];
  };
  timestamp: string;
}

export interface UseLiveKitRoomReturn {
  error: string | null;
  events: LiveKitEvent[];
  handleEndSession: () => void;
  handleRetryConnection: () => void;
  room: any; // avoid hard dependency in admin app
  roomStatus: RoomStatus;
  score: number;
  startTime: Date;
  roomData: any;
  detectedEventIds: string[];
}

export interface stateInstruction {
  stateId: number;
  name?: string;
  instruction: string;
  dialogues: string[];
}

export interface knowledgeSource {
  id: string;
  title: string;
  content: string;
}

export type KnowledgeSourceInput = { id?: string; title: string; content: string };

export enum enumBehaviourInstructionCategory {
  HELPER_SHOULD_DO = "SHOULD_DO",
  HELPER_SHOULD_NOT_DO = "SHOULD_NOT_DO",
}
export interface behaviourStateInstruction {
  stateId: string;
  instruction: string;
}

export interface behaviourInstruction {
  id?: string;
  category: enumBehaviourInstructionCategory;
  behaviors: string[];
  instructions: string[];
  stateInstructions?: behaviourStateInstruction[];
}

export interface SimulationInput {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  status?: SimulationStatus;
  /** Studio grouping (ORIGINALS, DEMO, PARTNER_SIM…); null clears it. */
  category?: string | null;
  /** Partner organisation tag (used with category PARTNER_SIM); null clears it. */
  partnerOrgName?: string | null;
  prompt?: string;
  name?: string;
  age?: number;
  gender?: string;
  genderIdentity?: string;
  sexualOrientation?: string;
  currentLocation?: string;
  profession?: string;
  context?: string;
  openingStatements?: string[];
  /** Plain-text reminder bullet points shown to the learner during the live session. */
  reminders?: string[];
  autoTerminationStatus?: boolean;
  terminationEventId?: string;
  terminationMessage?: string;
  terminationEvents?: terminationEvent[];
  isGlobal?: boolean;
  isPublic?: boolean;
  triggerWarningIds?: string[];
  languageVoices?: Record<string, string>;
  linguisticStyleSamples?: Record<string, string[]>;
  allowedFillerWords?: Record<string, string[]>;
  languageCharacteristics?: Record<string, string>;
  experienceMode?: string;
  checklistType?: string;
  timerMode?: boolean;
  maxTimeValue?: string;
  optGuardrails?: boolean;
  fillerEnabled?: boolean;
  comfortAudioEnabled?: boolean;
  comfortAudioUrl?: string;
  comfortAudioVolume?: number;
  historyTrimEnabled?: boolean;
  continuousBackchanneling?: boolean;
  interimReplyEnabled?: boolean;
  currentState?: boolean;
  remindersEnabled?: boolean;
  stateInstructions?: stateInstruction[];
  behaviorInstructions?: behaviourInstruction[];
  knowledgeSources?: KnowledgeSourceInput[];
  stateNames?: stateInstruction[];
  translationOpeningStatements?: Record<string, string[]>;
  translationDescription?: Record<string, string>;
  translationReminders?: Record<string, string[]>;
  /**
   * promptCode of the main-agent prompt variant this simulation uses
   * (e.g. 'ally_ai_learn_system_main_agent_prompt_full'). When unset, the
   * runtime falls back to the default main_agent prompt. Branching and
   * multilingual prompts are not selectable per simulation; they remain
   * singletons shared by every variant.
   */
  selectedMainPromptCode?: string;
  /**
   * Per-language main-agent prompt variant choice, keyed by languageId:
   * "GENERIC" (English source) or "MULTILINGUAL" (translated body). Missing
   * entry defaults to GENERIC; English always uses the source.
   */
  mainPromptVariantByLanguage?: Record<string, "GENERIC" | "MULTILINGUAL">;
  /**
   * Per-simulation states used by main-agent prompts with `hasStates: true`.
   * Each entry: id, name, guidelines, scoreLower, scoreUpper, ragEnabled.
   * Validation rules (contiguous ranges, min gap 50, finite bounds) are
   * enforced server-side on save. The starting state is emergent — the
   * runtime opens in whichever range contains score 0.
   */
  states?: {
    id: string;
    name: string;
    guidelines: string;
    scoreLower: number | null;
    scoreUpper: number | null;
    ragEnabled: boolean;
  }[];
}

export interface UpdateSimulationByIdInput {
  id: string | number;
  simulation: SimulationInput;
}

export interface UpdateSimulationByIdResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  createdBy: string;
  lastModified: string;
}

export interface SimulationCustomField {
  id?: string;
  name?: string;
  value?: string;
  useInDefaultPrompt?: boolean;
}
export interface terminationEvent {
  eventId: string;
  message: string;
  autoTerminationStatus: boolean;
  name: string;
}

export interface GetSimulationByIdResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  coverVideoUrl?: string;
  createdBy: string;
  lastModified: string;
  isGlobal: boolean;
  isPublic?: boolean;
  status: SimulationStatus;
  category?: string | null;
  partnerOrgName?: string | null;
  prompt?: string;
  metadata: {
    age?: number;
    name?: string;
    context?: string;
    currentLocation?: string;
    gender?: string;
    genderIdentity?: string;
    openingStatements?: string[];
    reminders?: string[];
    profession?: string;
    sexualOrientation?: string;
    voiceId?: string;
    languageVoices?: Record<string, string>;
    agentDialoguesArray?: string[];
    agentDialogues?: string[];
    customFields: SimulationCustomField[];
    experienceMode?: string;
    checklistType?: string;
    timerMode?: boolean;
    showScoreMeter?: boolean;
    enableFeedback?: boolean;
    pauseEnabled?: boolean;
    maxTimeValue?: string;
    optGuardrails?: boolean;
    fillerEnabled?: boolean;
    comfortAudioEnabled?: boolean;
    comfortAudioUrl?: string;
    comfortAudioVolume?: number;
    historyTrimEnabled?: boolean;
    continuousBackchanneling?: boolean;
    interimReplyEnabled?: boolean;
    currentState?: boolean;
    remindersEnabled?: boolean;
    stateInstructions?: stateInstruction[];
    characterProfileText?: string;
    knowledgeSources?: knowledgeSource[];
    stateNames?: stateInstruction[];
    linguisticStyleSamples?: Record<string, string[]>;
    allowedFillerWords?: Record<string, string[]>;
    languageCharacteristics?: Record<string, string>;
    /** promptCode of the main-agent prompt variant chosen for this simulation. */
    selectedMainPromptCode?: string;
    /** Per-language GENERIC vs MULTILINGUAL choice, keyed by languageId. */
    mainPromptVariantByLanguage?: Record<string, "GENERIC" | "MULTILINGUAL">;
    /**
     * Per-simulation states used by main-agent prompts with `hasStates: true`.
     * Same shape as `SimulationInput.states`.
     */
    states?: {
      id: string;
      name: string;
      guidelines: string;
      scoreLower: number | null;
      scoreUpper: number | null;
      ragEnabled: boolean;
    }[];
  };
  translationOpeningStatements?: Record<string, string[]>;
  openingDialoguePrimaryLanguageId?: number | null;
  translationDescription?: Record<string, string>;
  challengeDescriptionPrimaryLanguageId?: number | null;
  translationTitle?: Record<string, string>;
  translationReminders?: Record<string, string[]>;
  remindersPrimaryLanguageId?: number | null;
  competency?: Competency;
  terminationEvents?: terminationEvent[];
  terminationEvent?: {
    eventId: string;
    message: string;
    autoTerminationStatus: boolean;
    name: string;
  };
  behaviorInstructions?: behaviourInstruction[];
  triggerWarnings: triggerWarning[];
  difficultyLevel: string;
}

export interface CreateSimulationInput {
  scenarios: SimulationInput[];
}

export interface CreateSimulationResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  createdBy: string;
  lastModified: string;
  // status: SimulationStatus;
}

export interface StartSimulationResponse {
  accessToken: { token: string; serverUrl: string; roomName: string };
  useDirectAgentDispatch?: boolean;
  scenario?: {
    id?: string;
    title?: string;
    description?: string;
    coverImageUrl?: string;
    triggerWarnings?: { id: number; name: string }[];
    metadata?: {
      name?: string;
      maxTimeValue?: string;
      timerMode?: boolean;
      experienceMode?: string;
      checklistType?: string;
      showScoreMeter?: boolean;
      enableFeedback?: boolean;
      pauseEnabled?: boolean;
      currentState?: boolean;
      stateNames?: stateInstruction[];
    };
    difficultyLevel?: string;
  };
  checklistEvents?: any[];
  stateNames: { name: string; stateId: string }[];
}

export enum VisibilityType {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

export enum SessionEventDetectionType {
  SENTENCE_SIMILARITY = "SENTENCE_SIMILARITY",
  SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY",
  BINARY_CLASSIFIER = "BINARY_CLASSIFIER",
  TIME = "TIME",
  SCORE = "SCORE",
  COMBINATION = "COMBINATION",
}

export enum SessionEventDetectionCondition {
  LT = "LT",
  GT = "GT",
  EQ = "EQ",
  LTE = "LTE",
  GTE = "GTE",
}

export interface SessionEventResponse {
  data: SessionEvent[];
  pagination: Pagination;
}

export interface ScenarioVoiceResponse {
  data: ScenarioVoice[];
  pagination?: Pagination;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Expression node for combination events
 */
export interface ExpressionNode {
  type?: "AND" | "OR" | "NOT";
  id?: string;
  left?: ExpressionNode;
  right?: ExpressionNode;
}

/**
 * Detection data structure for session events
 * Contains event-specific detection parameters
 * Note: Only relevant fields are included based on detectionType:
 * - SENTENCE_SIMILARITY/SEMANTIC_SIMILARITY: only sentences
 * - SCORE: only score and condition
 * - TIME: only time and condition
 * - COMBINATION: only expression
 */
export interface SessionEventDetectionData {
  speaker?: string;
  sentences?: string[];
  className?: string;
  score?: number;
  time?: number;
  condition?: SessionEventDetectionCondition;
  expression?: ExpressionNode;
}

/**
 * Session Event interface matching the API payload format
 * Used for creating and updating session events
 */
export interface SessionEvent {
  id?: string;
  name?: string;
  eventCode?: string;
  description?: string;
  score?: number;
  emoji?: string;
  message?: string;
  branchInstruction?: string;
  detectionType?: SessionEventDetectionType | string;
  visibilityType?: string;
  detectionData?: SessionEventDetectionData;
  detectionConfig?: EventDetectionConfig;
  isEditable?: boolean;
  checklistVisibilityStatus?: boolean;
  tags?: string[];
}

export interface GetSessionEventsQuery {
  searchName?: string;
  visibilityType?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string; // e.g. "asc" | "desc"
}

export interface GetScenarioVoicesQuery {
  searchName?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string; // e.g. "asc" | "desc"
  providers?: string[];
  languageIds?: number[];
}

export interface GetCoverImageUrlRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export interface GetCoverImageUrlResponse {
  presignedUrl: string;
  coverImageUrl: string;
}

export interface DeleteCoverImageRequest {
  coverImageUrl: string;
}

export interface GetCoverVideoUrlRequest {
  fileName: string;
  fileSize: number;
  duration: number;
  contentType: string;
}

export interface GetCoverVideoUrlResponse {
  presignedUrl: string;
  coverVideoUrl: string;
}

export interface DeleteCoverVideoRequest {
  coverVideoUrl: string;
}

export interface getTriggerWarningsQueryParams {
  name?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
}

export interface triggerWarning {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface triggerWarningsRequest {
  name: string;
}

export interface createTriggerResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioVoiceFilters {
  providers: string[];
  languages: string[];
}

export interface CharacterData {
  id?: string;
  name: string;
  age: number | string;
  gender: string;
  profession: string | null;
  currentLocation: string;
  genderIdentity: string;
  sexualOrientation: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  characterProfileText?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

export interface DeleteCharacterRequest {
  scenarioCharacterIds: string[];
}

export type CoverImageProvider = "openai" | "gemini";

export interface GenerateCoverImageRequest {
  title: string;
  description?: string;
  /** Scenario persona fields — substituted into the managed prompt. */
  name?: string;
  age?: number;
  gender?: string;
  profession?: string;
  currentLocation?: string;
  styleHints?: string;
  provider?: CoverImageProvider;
}

export interface GenerateCoverImageResponse {
  imageUrl: string;
  provider: string;
}

export interface CoverImageLibraryItem {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export interface GetImageLibraryQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
  searchName?: string;
}

export interface GetImageLibraryResponse {
  coverImages: CoverImageLibraryItem[];
  count: number;
}
export interface GetHelperTagsQueryParams {
  limit?: number;
  offset?: number;
  name?: string;
}

export interface HelperTagItem {
  id: string;
  name: string;
}

export interface HelperTagInput {
  data: HelperTagItem[];
  count: number;
}

export type GetFillerTagsQueryParams = GetHelperTagsQueryParams;

export interface FillerTagListResponse {
  data: HelperTagItem[];
  count: number;
}

export interface CreateFillerTagResponse {
  id: string;
  name: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  name: string;
  // True for user-owned custom competencies (created on the fly when a
  // scenario's behaviours diverge from a defined competency's mapping). These
  // are private to their owner and never shown in the superadmin Competencies
  // tab — only in the owner's simulation-builder dropdown.
  isCustom?: boolean;
}

export interface CompetenciesResponse {
  data: Competency[];
  count: number;
}

export interface GetCompetenciesArgs {
  name?: string;
  // Include the requester's own custom competencies alongside the global ones.
  includeOwnCustom?: boolean;
}

export interface CreateCompetencyRequest {
  // Omitted for custom competencies — the backend generates the name.
  name?: string;
  isCustom?: boolean;
}

export interface UpdateCompetencyRequest {
  id: string;
  data: { name: string };
}

export interface CompetencyBehavioursResponse {
  helpful: HelperTagItem[];
  unhelpful: HelperTagItem[];
}

export interface SetCompetencyBehavioursRequest {
  id: string;
  data: {
    helpful: string[];
    unhelpful: string[];
  };
}

export type AgentTestCaseType = "condition" | "full_session";

export interface AgentTestCaseRubric {
  criteria: string;
  scoringInstructions: string;
}

export interface AgentTestCase {
  id: string;
  title: string;
  type: AgentTestCaseType;
  tags: string[];
  description?: string;
  /** Condition test cases: the condition to simulate. */
  condition?: string;
  /** Condition test cases: test pass description. */
  test?: string;
  /** Full-session test cases: rubric rows. */
  rubrics?: AgentTestCaseRubric[];
}

export interface AgentTestCasesResponse {
  data: AgentTestCase[];
  count: number;
}

export interface CreateAgentTestCaseRequest {
  title: string;
  type: AgentTestCaseType;
  tags: string[];
  condition?: string;
  test?: string;
  rubrics?: AgentTestCaseRubric[];
}

export interface UpdateAgentTestCaseRequest {
  id: string;
  data: CreateAgentTestCaseRequest;
}

export interface ScenarioContext {
  title?: string;
  name?: string;
  age?: number;
  gender?: string;
  genderIdentity?: string;
  sexualOrientation?: string;
  profession?: string;
  currentLocation?: string;
  competency?: string;
  characterProfileText?: string;
  challengeDescription?: string;
  languageId?: string;
  languageCode?: string;
  languageName?: string;
  /**
   * Number of states to produce — only set when fieldName is "states".
   * The studio passes the count of state cards currently on screen so
   * the LLM generates exactly that many.
   */
  numStates?: number;
  /**
   * Stringified JSON of already-filled states — only set when fieldName
   * is "states" and the user has filled cards alongside blank ones.
   * Lets the LLM compose new states that don't duplicate names or
   * overlap score ranges with the existing ones.
   */
  existingStates?: string;
  /**
   * Number of knowledge source documents to produce — only set when
   * fieldName is "knowledgeSources". Studio passes the current document
   * count so the LLM produces exactly that many.
   */
  numKnowledgeSources?: number;
  /**
   * Stringified JSON of existing knowledge source titles — only set
   * when fieldName is "knowledgeSources". Lets the LLM avoid producing
   * duplicates of titles already in the form.
   */
  existingKnowledgeSources?: string;
}

export interface AutofillModelOption {
  value: string;
  label: string;
  provider: "openai" | "anthropic";
  /**
   * False for reasoning models (o-series, gpt-5) that reject a custom
   * temperature. Sourced from the universal LLM registry (GET /v1/learn/models
   * now returns the registry filtered to autofill-runnable providers).
   */
  supportsTemperature?: boolean;
}

export interface EnhanceFieldRequest {
  /** One of ENHANCE_TYPE — identifies the field being improved. */
  fieldName: string;
  /**
   * Existing field content to improve (multi-line fields newline-joined; the
   * state field sends a JSON string {name, guidelines}). This is the ONLY
   * scenario data sent — no other fields are included as context.
   */
  currentValue: string;
  /** Custom guidance; omit/empty for auto-improve. */
  guidance?: string;
  model?: string;
  provider?: "openai" | "anthropic";
  /**
   * Primary+translation fields only: re-translate the improved content into
   * these languages. The response then carries a `translations` map keyed by
   * languageId.
   */
  translateTo?: { languageId: string; languageCode: string }[];
}

export interface EnhanceFieldResponse {
  fieldName: string;
  /** Improved content as plain text (multi-line fields keep line structure). */
  content: string;
  /** Translations of the improved content, keyed by languageId (if requested). */
  translations?: Record<string, string>;
}
