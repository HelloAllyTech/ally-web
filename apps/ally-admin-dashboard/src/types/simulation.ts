import { SimulationStatus, ScenarioVoice } from "./createSimulation";

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
  autoTerminationStatus?: boolean;
  terminationEventId?: string;
  terminationMessage?: string;
  terminationEvents?: terminationEvent[];
  isGlobal?: boolean;
  isPublic?: boolean;
  triggerWarningIds?: string[];
  languageVoices?: Record<string, string>;
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

export interface CustomFieldType {
  id?: string;
  name?: string;
  value?: string;
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
  prompt?: string;
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
    responseLength?: string;
    openingStatements?: string[];
    personality?: string;
    profession?: string;
    sessionBehaviorGuidelines?: string;
    sexualOrientation?: string;
    startingState?: string;
    voiceId?: string;
    tone?: string;
    agentGoal?: string;
    languageVoices?: Record<string, string>;
    agentDialoguesArray?: string[];
    agentDialogues?: string[];
    customFields: CustomFieldType[];
  };
  terminationEvents?: terminationEvent[];
  terminationEvent?: {
    eventId: string;
    message: string;
    autoTerminationStatus: boolean;
    name: string;
  };
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
  scenario?: {
    id?: string;
    title?: string;
    description?: string;
    coverImageUrl?: string;
    triggerWarnings?: { id: number; name: string }[];
    metadata?: {
      name?: string;
    };
  };
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

export interface EventDetectionConfig {
  startTime: string | number | null | undefined;
  endTime: string | number | null | undefined;
  maxOccurrences: number;
  minGapTime: string | number | null | undefined;
  minScore: number;
  maxScore: number | null | undefined;
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
