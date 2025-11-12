import { SimulationStatus } from "./createSimulation";

export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
}

export interface LiveKitEvent {
  version: string;
  data: {
    score: number | null;
    emoji: string;
    message: string;
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
}

export interface SimulationInput {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  status?: SimulationStatus;
  prompt?: string;
  name?: string;
  age?: number;
  gender?: string;
  genderIdentity?: string;
  sexualOrientation?: string;
  currentLocation?: string;
  profession?: string;
  context?: string;
  sessionBehaviorGuidelines?: string;
  lifeHistory?: string;
  coreMemories?: string;
  personality?: string;
  startingState?: string;
  emotionalNeeds?: string;
  tone?: string;
  openingStatements?: string[];
  voiceId?: string;
  agentGoal?: string;
}

export interface UpdateSimulationByIdInput {
  id: string;
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

export interface GetSimulationByIdResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  coverVideoUrl?: string;
  createdBy: string;
  lastModified: string;
  metadata: {
    age?: number;
    name?: string;
    context?: string;
    coreMemories?: string;
    currentLocation?: string;
    emotionalNeeds?: string;
    gender?: string;
    genderIdentity?: string;
    lifeHistory?: string;
    openingStatements?: string[];
    personality?: string;
    profession?: string;
    sessionBehaviorGuidelines?: string;
    sexualOrientation?: string;
    startingState?: string;
    tone?: string;
    voiceId?: string;
    agentGoal?: string;
  };
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
}

export enum VisibilityType {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  HIDDEN = "HIDDEN",
}

export interface SessionEventResponse {
  data: SessionEvent[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface SessionEvent {
  id?: string;
  name?: string;
  description?: string;
  score?: number;
  emoji?: string;
  message?: string;
  branchInstruction?: string;
  detectionType?: string;
  visibilityType?: string;
  sentences?: string[];
}

export interface GetSessionEventsQuery {
  searchName?: string;
  visibilityType?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string; // e.g. "asc" | "desc"
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

// Scenario Paths Types
export interface ScenarioPath {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string;
  status: "draft" | "published" | "archived";
  isGlobal: boolean;
  totalScenarios: number;
  updatedAt: string;
}

export interface GetScenarioPathsQueryParams {
  status?: string;
  offset?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
}

export interface GetScenarioPathsResponse {
  data: ScenarioPath[];
}
