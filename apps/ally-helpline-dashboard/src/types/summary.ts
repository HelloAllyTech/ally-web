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
  Counsellor = "counsellor",
  NewCallFollowUp = "newCallFollowUp",
  CallQuality = "callQuality",

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
  OpenEndedQuestionsAsked = "openEndedQuestionsAsked",

  // Intake section
  IntakeNotes = "intakeNotes",
  RiskSelfHarm = "riskSelfHarm",
  RiskSelfHarmNotes = "riskSelfHarmNotes",
  RiskSuicidalThoughts = "riskSuicidalThoughts",
  RiskSuicidalPlan = "riskSuicidalPlan",
  RiskSuicidalAction = "riskSuicidalAction",
  RiskSuicidalThoughtsNotes = "riskSuicidalThoughtsNotes",
  RiskRunningAway = "riskRunningAway",
  RiskRunningAwayNotes = "riskRunningAwayNotes",
  TraumaPhysicalAbuse = "traumaPhysicalAbuse",
  TraumaSexualAbuse = "traumaSexualAbuse",
  TraumaVerbalAbuse = "traumaVerbalAbuse",
  TraumaNeglect = "traumaNeglect",
  TraumaSeparationFromCaregiverParent = "traumaSeparationFromCaregiverParent",
  TraumaWitnessedDomesticViolence = "traumaWitnessedDomesticViolence",
  TraumaNotes = "traumaNotes",
  AssessmentPsychologicalDiagnosis = "assessmentPsychologicalDiagnosis",
  AssessmentPsychologicalDiagnosisNotes = "assessmentPsychologicalDiagnosisNotes",
  AssessmentUseOfPsychotropicMedications = "assessmentUseOfPsychotropicMedications",
  AssessmentUseOfPsychotropicMedicationsNotes = "assessmentUseOfPsychotropicMedicationsNotes",
  AssessmentHallucinations = "assessmentHallucinations",
  AssessmentHallucinationsNotes = "assessmentHallucinationsNotes",
  AssessmentAffect = "assessmentAffect",
  AssessmentSpeech = "assessmentSpeech",

  // Ongoing Risks section
  OngoingRiskSelfHarm = "ongoingRiskSelfHarm",
  OngoingRiskSelfHarmNotes = "ongoingRiskSelfHarmNotes",
  OngoingRiskSuicidalThoughts = "ongoingRiskSuicidalThoughts",
  OngoingRiskSuicidalPlan = "ongoingRiskSuicidalPlan",
  OngoingRiskSuicidalAction = "ongoingRiskSuicidalAction",
  OngoingRiskSuicidalThoughtsNotes = "ongoingRiskSuicidalThoughtsNotes",
  Mode = "mode",
}

export interface EnhanceContentRequest {
  content: string;
}

export interface EnhanceContentResponse {
  enhanced_content: string;
}

export interface Tag {
  tag: string;
  positivity_rating: number;
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
  startSeconds?: number;
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
  NO_AUDIO = "NO_AUDIO",
}

export interface SubmitFeedbackRequest {
  chatId: string;
  rating: number;
  feedback: {
    issues: string[];
    comment: string;
  };
}

export interface SubmitFeedbackResponse {
  message: string;
  feedback: {
    chatId: number;
    rating: number;
    feedback: {
      issues: string[];
      comment: string;
    };
    id: number;
  };
}
