import { triggerWarning } from "@ally-ui-mono/ui-shared/types";
import { Thread } from "@types";

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

export interface Scenario {
  id?: number;
  title?: string;
  scenario?: string;
  description?: string;
  coverImageUrl?: string | null;
  coverVideoUrl?: string | null;
  status?: ScenarioStatus;
  metadata?: {
    name?: string;
  };
  triggerWarnings?: TriggerChipItemWarning[];
  checklistEvents?: any[];
  experienceMode?: string;
  checklistType?: string;
  maxTimeValue?: string;
  timerMode?: boolean;
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
}

export interface StartSimulationInput {
  scenarioId: number;
  scenarioPathSessionItemId?: string;
  caseSessionItemId?: string;
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
}

export type GetSimulationLogsResponse = {
  data: SimulationLog[];
};

export interface GetAdminSimulationLogsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

export type GetAdminSimulationLogsResponse = {
  data: AdminSimulationLog[];
};
export interface SimulationSummary {
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
  };
  totalScore: number;
  eventStatus?: string;
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
        improvements: string[];
        positives: string[];
      };
      errorMessage?: string;
    };
  };
  events: KeyEvent[];
  hasFeedback: boolean;
  scenario: Scenario;
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
  sessionFeedback: { rating: number; feedback?: string };
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
}

interface CurrentSession {
  eventStatus?: string;
  scenarioId?: string;
  scenarioPathSessionItemStatus?: string;
  coverImageUrl?: string;
  title?: string;
  scenarioPathSessionItemId?: string;
  transitionMessageTitle?: string;
  transitionMessageContent?: string;
  isScenarioPathSessionCompleted?: boolean;
  sessionGlimpse?: string;
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
