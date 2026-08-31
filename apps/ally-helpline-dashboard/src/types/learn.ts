import { triggerWarning } from "@ally-ui-mono/ui-shared/types";
import { Citation, Thread, LanguageOption } from "@types";

export enum ScenarioStatus {
  ACTIVE = "ACTIVE",
  COMING_SOON = "COMING_SOON",
}

export enum PathwayStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The current learner's completion record for a scenario. Null/absent means
 * they have never completed it — guard on the object, not on `attemptCount`.
 * Only returned by the authenticated catalog and detail endpoints.
 */
export interface ScenarioCompletion {
  attemptCount: number;
  lastCompletedAt: string | null;
}

export interface Scenario {
  id?: number;
  title?: string;
  scenario?: string;
  description?: string;
  /** Text reminders shown to the learner during the roleplay. */
  reminders?: string[];
  /** Whether reminders are shown to the learner during the roleplay — reminders should only render when this is true. */
  remindersEnabled?: boolean;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  status?: ScenarioStatus;
  metadata?: {
    name?: string;
    experienceMode?: string;
    enableFeedback?: boolean;
    /**
     * Opt-in, per roleplay, for showing the checklist on the post-session
     * summary. Absent means off. Does not affect the in-session checklist
     * panel, which follows `experienceMode` alone.
     */
    summaryChecklistEnabled?: boolean;
    /**
     * Which post-session tabs this roleplay shows, as sub-toggles of the
     * `enableFeedback` master switch. The backend always sends this RESOLVED,
     * so the client never has to re-implement the "absent means all on"
     * default — but it stays optional here because a cached or older response
     * may predate it, in which case treat every tab as on.
     */
    feedbackTabs?: {
      debrief: boolean;
      skills: boolean;
      transcript: boolean;
    };
  };
  triggerWarnings?: TriggerChipItemWarning[];
  checklistEvents?: any[];
  experienceMode?: string;
  checklistType?: string;
  maxTimeValue?: string;
  timerMode?: boolean;
  showScoreMeter?: boolean;
  pauseEnabled?: boolean;
  /** Live in-session coaching hints in the Supervisor sidebar tab. Opt-in per
   * roleplay, so only an explicit true shows the tab. */
  supervisorNotesEnabled?: boolean;
  /** Whether the learner-facing Live transcript/events tab is shown for this
   * roleplay. Opt-out, so only an explicit false hides the tab. */
  liveTabEnabled?: boolean;
  difficultyLevel?: string;
  stateNames?: { name: string; stateId: string }[];
  availableLanguages?: LanguageOption[];
  completion?: ScenarioCompletion | null;
}

export interface ScenarioSession {
  tenantId: string;
  id: string;
  roomId: string;
  scenarioId: number;
  counselorId: number;
  startedAt: string;
  endedAt: string | null;
  score: number | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  triggerWarnings?: TriggerChipItemWarning[];
  remortparticipantName?: string;
  remortparticipantCoverImageUrl?: string;
  title?: string;
}

export interface SimulationLog {
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  id: string;
  roomId: string;
  scenarioId: number;
  counselorId: number;
  status: string;
  startedAt: string;
  endedAt: string;
  score: number | null;
  metadata: {
    sessionName: string;
  };
  scenario: {
    createdAt: string;
    updatedAt: string;
    id: number;
    title: string;
    scenario: string;
    description: string;
    coverImageUrl: string;
    status: string;
    prompt: string | null;
    metadata: unknown | null;
  };
}

export interface AdminSimulationLog extends SimulationLog {
  counselor: {
    createdAt: string;
    updatedAt: string;
    tenantId: string;
    id: number;
    email: string;
    name: string;
    role: string;
    status: string;
    username: string;
    metadata: unknown | null;
    phone: string;
    externalId: string | null;
  };
}

export interface GetScenarioInput {
  scenarioId: number;
  isPrivate: boolean;
  languageCode?: string;
}

export type SessionPlatform = "web" | "mobile-ios" | "mobile-android";

export interface StartSimulationInput {
  scenarioId: number;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
  /** Track 2.0: link this session to a track item progress row. */
  trackItemProgressId?: string;
  languageCode?: string;
  platform?: SessionPlatform;
}

export interface StartSimulationResponse {
  scenarioSession: ScenarioSession;
  scenario: Scenario;
  accessToken: {
    token: string;
    roomName: string;
    serverUrl: string;
  };
}

export interface EndSimulationInput {
  sessionId: string;
  languageCode?: string;
}

export interface EndSimulationResponse {
  message?: string;
}

export interface GetSimulationLogsInput {
  statuses?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
  languageCode?: string;
}

export type GetSimulationLogsResponse = {
  data: SimulationLog[];
};

export interface GetSimulationSummaryInput {
  sessionId: string;
  languageCode?: string;
}

export interface GetAdminSimulationLogsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
  languageCode?: string;
}

export type GetAdminSimulationLogsResponse = {
  data: AdminSimulationLog[];
};
export interface SimulationSummary {
  sessionId: string;
  id: string;
  reviewId: string;
  reviewStatus: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  roomId: string;
  scenarioId: number;
  counselorId: number;
  status: string;
  startedAt: string;
  endedAt: string;
  score: number | null;
  metadata: {
    sessionName: string;
    languageId?: number;
  };
  totalScore: number;
  eventStatus?: string;
  /**
   * Set only when this session was force-ended by the agent's stall
   * watchdog (commonly a network dropout, but any cause of the learner
   * going silent past the timeout) rather than ending normally. Currently
   * only value on the wire: "TECHNICAL_INTERRUPTION".
   */
  endReason?: string | null;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
  details: {
    id: string;
    createdAt: string;
    updatedAt: string;
    tenantId: string;
    scenarioSessionId: string;
    callDuration: number;
    summary: {
      feedback: {
        improvements?: string[];
        areasOfGrowth?: { improvement: string; recommendation: string }[];
        positives: string[];
        /**
         * The debrief note Ally wrote to the learner, as markdown. Specific
         * moments are anchored as `[[msg:<messageId>]]`, which the Debrief tab
         * renders as chips linking into the annotated transcript.
         * Absent on sessions evaluated before the supervisor note shipped, and
         * on roleplays whose Debrief tab is switched off.
         */
        supervisorNote?: string;
      };
      errorMessage?: string;
    } | null;
  };
  events: KeyEvent[];
  hasFeedback: boolean;
  sessionFeedback: { rating: number; feedback?: string; tags: string[] };
  scenario: Scenario;
  reviewCreatedAt: string;
  reviewNote: string | null;
}

export interface KeyEvent {
  eventId: string;
  createdAt: string;
  occurredAt: string;
  score: string;
  emoji: string;
  message: string;
  events: {
    id: string;
    name: string;
    description: string;
    score: string;
    emoji: string;
    message: string;
  };
}

export type GetSimulationSummaryResponse = SimulationSummary;

export interface SubmitSimulationFeedbackRequest {
  sessionId: string;
  sessionFeedback: { rating: number; feedback?: string; tags: string[] };
}

export interface SubmitSimulationFeedbackResponse {
  tenantId: string;
  scenarioSessionId: string;
  rating: number;
  feedback: string;
  createdAt: string;
  updatedAt: string;
  id: string;
}

export interface GetSimulationTranscriptRequest {
  sessionId: string;
  offset: number;
  limit: number;
  sortBy: string;
  languageCode?: string;
}

export interface GetSimulationTranscriptResponse {
  messages: SimulationTranscriptMessage[];
}

interface UpcomingScenario {
  id?: string;
  title?: string;
  description?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  scenarioPathSessionItemStatus?: string;
  order?: number;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
}

interface CurrentSession {
  eventStatus?: string;
  scenarioId?: string;
  scenarioPathSessionItemStatus?: string;
  coverImageUrl?: string;
  title?: string;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
  transitionMessageTitle?: string;
  transitionMessageContent?: string;
  isScenarioPathSessionCompleted?: boolean;
  sessionGlimpse?: string;
  isCaseSessionCompleted?: boolean;
  caseSessionItemStatus?: string;
}

export interface GetUpComingSimulationResponse {
  upcomingScenario?: UpcomingScenario;
  currentSession?: CurrentSession;
}

export interface SimulationTranscriptMessage {
  id: number;
  content: string;
  senderId: number;
  startSeconds?: number;
  endSeconds?: number | null;
  createdAt?: string;
  threads?: Thread[];
}

/**
 * A request to bring one transcript message into view — raised by the "See
 * this moment" chips in Ally's debrief note. `messageId` is the anchor's raw
 * `scenarioSessionMessageId` (a string in the note, numeric in the transcript
 * payload, so compare as strings). `requestId` increments per request so
 * tapping the same chip twice scrolls to the moment twice.
 */
export interface TranscriptFocusRequest {
  messageId: string;
  requestId: number;
}

export interface ScenarioPathway {
  id: string;
  scenarioPathSessionId?: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: PathwayStatus;
  isGlobal: boolean;
  totalScenarios: number;
  updatedAt: string;
}

export interface GetScenarioPathwaysInput {
  offset?: number;
  limit?: number;
}

export interface GetScenarioPathwaysResponse {
  data: ScenarioPathway[];
}

export interface GetScenarioCasesResponse {
  data: ScenarioCaseDetails[];
}

export enum PathwayScenarioStatus {
  COMPLETED = "COMPLETED",
  IN_PROGRESS = "IN_PROGRESS",
  UNLOCKED = "UNLOCKED",
  LOCKED = "LOCKED",
}

export interface PathwayScenario {
  sessionItemId?: number;
  sessionId?: string;
  scenarioId: number;
  coverImageUrl: string;
  coverVideoUrl?: string;
  description?: string;
  title?: string;
  order: number;
  triggerWarnings?: triggerWarning[];
  status: PathwayScenarioStatus;
  availableLanguages?: LanguageOption[];
}

export interface ScenarioPathwayDetails {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
  userId: number;
  completedAt: string | null;
  completedScenarios: number;
  totalScenarios: number;
  scenarioPathSessionId?: string;
  scenarios: PathwayScenario[];
}

export interface ScenarioCaseDetails {
  id: string;
  title: string;
  description?: string;
  coverImageUrl: string;
  userId: number;
  completedAt: string | null;
  completedScenarios: number;
  totalScenarios: number;
  caseSessionId?: string;
  scenarios: PathwayScenario[];
}

export interface ChecklistItem {
  id: string;
  name: string;
  hasOccurred: boolean;
}

export interface GetSimulationChecklistResponse {
  scorePercentage: number;
  eventChecklist: ChecklistItem[];
}
export interface ChatStreamRequest {
  message: string;
  sessionId: string;
}

export enum ChatStreamEventType {
  TOKEN = "token",
  DONE = "done",
  ERROR = "error",
}

export interface SkillCoverageItem {
  category: string;
  percentage: number;
  iconUrl?: string;
}

export interface EmotionalMovementItem {
  messageId: string;
  level: number;
  startTime: number;
}

export interface GetSimulationSkillsResponse {
  skillCoverage: SkillCoverageItem[];
  emotionalMovement: EmotionalMovementItem[];
}
export interface GetChatHistoryResponse {
  id: string;
  sourceId: string;
  sourceType: string;
  userId: string;
  role: string;
  content: string;
  citations: Citation[];
  createdAt: string;
  updatedAt: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
}
