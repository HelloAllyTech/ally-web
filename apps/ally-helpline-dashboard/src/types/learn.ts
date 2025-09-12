export enum ScenarioStatus {
  ACTIVE = "ACTIVE",
  COMING_SOON = "COMING_SOON",
}

export interface Scenario {
  id?: number;
  title?: string;
  scenario?: string;
  description?: string;
  coverImageUrl?: string | null;
  status?: ScenarioStatus;
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
  metadata: unknown | null;
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
}

export interface StartSimulationInput {
  scenarioId: number;
}

export interface StartSimulationResponse {
  scenarioSession: ScenarioSession;
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

export type GetSimulationLogsResponse = SimulationLog[];

export interface GetAdminSimulationLogsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}

export type GetAdminSimulationLogsResponse = AdminSimulationLog[];

export interface SimulationSummary {
  id: string;
  createdAt: string;
  score: number;
  details: {
    callDuration: number;
    summary: {
      feedback: {
        improvements: string[];
        positives: string[];
      };
    };
  };
  events: KeyEvent[];
}

export interface KeyEvent {
  eventId: string;
  createdAt: string;
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

export interface SubmitSessionFeedbackInput {
  sessionId: string;
  sessionFeedback: { rating: number; feedback?: string };
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

export interface SimulationTranscriptMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt?: string;
}
