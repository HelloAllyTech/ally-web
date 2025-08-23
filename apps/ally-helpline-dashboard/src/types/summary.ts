export enum SummaryFieldKey {
  // Features and Demographics section
  CallId = "callId",
  CallDuration = "callDuration",
  CallDate = "callDate",
  CallTime = "callTime",
  ClientId = "clientId",
  CounsellorName = "counselorName",
  CallType = "callType",
  Age = "age",
  Gender = "gender",
  Profession = "profession",
  RelationshipStatus = "relationshipStatus",
  Languages = "languages",
  Location = "location",
  CodeOfConcern = "codeOfConcern",

  // Other fields
  SessionSummary = "sessionSummary",
  CounselingProcessFlow = "counselingProcessFlow",
  KeyConcerns = "keyConcerns",
  ObjectiveObservations = "objectiveObservations",
  SubjectiveObservations = "subjectiveObservations",
  Assessment = "assessment",
  DominantFeelings = "dominantFeelings",
  IssuesWorkedOn = "issuesWorkedOn",
  KeyTherapeuticTechniques = "keyTherapeuticTechniques",
  ReferralsProvided = "referralsProvided",
  Homework = "homework",
  PlanForNextCall = "planForNextCall",
  Tags = "tags",

  // Metrics section
  ListeningShare = "listeningShare",
  ReflectiveQuestionsAsked = "reflectiveQuestionsAsked",
  EmotionalLift = "emotionalLift",
}

export interface EnhanceContentRequest {
  content: string;
}

export interface EnhanceContentResponse {
  enhanced_content: string;
}

export interface Tag {
  tag: string;
  priority_rating: number;
}

export interface UpdateCallInfoRequest {
  chatId: number;
  callInfo: {
    summaryName: string;
  };
}

export interface ExportCallSummaryRequest {
  chatId: number;
}

interface Place {
  id: number;
  city: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetLocationsResponse {
  data: Place[];
  total: number;
}

export interface TranscriptMessage {
  chatId?: number;
  content: string;
  senderId: number;
  createdAt?: string;
}

export interface GetTranscriptResponse {
  data: TranscriptMessage[];
  count?: number;
}

export interface GetTranscriptRequest {
  chatId: number;
  offset: number;
  limit: number;
  sortBy: string;
}

export interface UpdateCallSummaryNotesRequest {
  chatId: string;
  notes: string;
}

export enum ChatSummaryStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export const SummaryEnabledStatuses = [
  ChatSummaryStatus.PENDING,
  ChatSummaryStatus.IN_PROGRESS,
  ChatSummaryStatus.SUCCESS,
];
