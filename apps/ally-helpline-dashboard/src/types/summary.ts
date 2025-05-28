export enum SummaryFieldKey {
  // Features and Demographics section
  CallId = "callId",
  CallDuration = "callDuration",
  CallDate = "callDate",
  CallTime = "callTime",
  ClientId = "clientId",
  CounselorName = "counselorName",
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
