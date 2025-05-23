import {
  CallDetails,
  SessionSummary,
  Flow,
  KeyConcerns,
  CallDuration,
  QuestionsAsked,
  Nudges,
  ListeningRatio,
  CallerMood,
  ObjectiveObservations,
  SubjectiveObservations,
  Assessment,
  DominantFeelings,
  IssuesWorkedOn,
  TherapeuticTechniques,
  ReferralsProvided,
  HomeworkRecommended,
  PlansForNextCall,
  Tags,
  Metrics,
} from "@/assets/icons";
import { Highlight, SummaryField } from "./types";

export const highlights: Highlight[] = [
  {
    key: "callDuration",
    title: "The call duration was more than",
    image: CallDuration,
  },
  {
    key: "questionsAsked",
    title: "You asked",
    image: QuestionsAsked,
  },
  {
    key: "nudges",
    title: "You used Copilot",
    image: Nudges,
  },
  {
    key: "listeningRatio",
    title: "Listening to talking ratio was ",
    image: ListeningRatio,
  },
  {
    key: "callerMood",
    title: "Caller's mood had increased by",
    image: CallerMood,
  },
];

export const summarySections = [
  {
    icon: {
      icon: CallDetails,
      alt: "features-and-demographics",
    },
    key: "featuresAndDemographics",
    title: "Features and Demographics",
  },
  {
    icon: {
      icon: SessionSummary,
      alt: "session-summary",
    },
    key: "sessionSummary",
    title: "Session Summary",
  },
  {
    icon: {
      icon: Flow,
      alt: "flow",
    },
    key: "flow",
    title: "Flow",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "keyConcerns",
    title: "Key concerns",
  },
  {
    icon: {
      icon: ObjectiveObservations,
      alt: "objective-observations",
    },
    key: "objectiveObservations",
    title: "Objective Observations",
  },
  {
    icon: {
      icon: SubjectiveObservations,
      alt: "subjective-observations",
    },
    key: "subjectiveObservations",
    title: "Subjective Observations",
  },
  {
    icon: {
      icon: Assessment,
      alt: "assessment",
    },
    key: "assessment",
    title: "Assessment",
  },
  {
    icon: {
      icon: DominantFeelings,
      alt: "dominant-feelings",
    },
    key: "dominantFeelings",
    title: "Dominant Feelings",
  },  {
    icon: {
      icon: IssuesWorkedOn,
      alt: "issues-worked-on",
    },
    key: "issuesWorkedOn",
    title: "Issues Worked On",
  },  {
    icon: {
      icon: TherapeuticTechniques,
      alt: "key-therapeutic-techniques",
    },
    key: "therapeuticTechniques",
    title: "Key Therapeutic Techniques",
  },
  {
    icon: {
      icon: ReferralsProvided,
      alt: "referrals-provided",
    },
    key: "referralsProvided",
    title: "Referrals Provided",
  },
  {
    icon: {
      icon: HomeworkRecommended,
      alt: "homework-recommended",
    },
    key: "homeworkRecommended",
    title: "Homework Recommended",
  },
    {
    icon: {
      icon: PlansForNextCall,
      alt: "plans-for-next-call",
    },
    key: "plansForNextCall",
    title: "Plans for Next Call",
  },
    {
    icon: {
      icon: Tags,
      alt: "tags",
    },
    key: "tags",
    title: "Tags",
  },
  {
    icon: {
      icon: Metrics,
      alt: "metrics",
    },
    key: "metrics",
    title: "Metrics",
  },
];

export const summaryFields: SummaryField[] = [
  // Features and Demographics section
  {
    isEditable: false,
    key: "callId",
    label: "Call ID",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callDuration",
    label: "Call Duration",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callDate",
    label: "Call Date",
      sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callTime",
    label: "Call time",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callerId",
    label: "Caller ID",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callerType",
    label: "Caller type",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: true,
    key: "age",
    label: "Age",
    options: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    sectionKey: "featuresAndDemographics",
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: "gender",
    label: "Gender",
    options: ["Male", "Female", "Other", "Prefer not to say"],
    sectionKey: "featuresAndDemographics",
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: "profession",
    label: "Profession",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: true,
    key: "location",
    label: "Location",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: true,
    key: "language",
    label: "Language",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: true,
    key: "concernCode",
    label: "Concern code",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "counsellorName",
    label: "Counsellor Name",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },

  // Other fields
  {
    isEditable: true,
    isEnhanceable: true,
    key: "sessionSummary",
    label: "Session Summary",
    sectionKey: "sessionSummary",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "flow",
    label: "Flow",
    sectionKey: "flow",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "keyConcerns",
    label: "Key concerns",
    sectionKey: "keyConcerns",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "objectiveObservations",
    label: "Objective Observations",
    sectionKey: "objectiveObservations",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "subjectiveObservations",
    label: "Subjective Observations",
    sectionKey: "subjectiveObservations",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "assessment",
    label: "Assessment",
    sectionKey: "assessment",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "dominantFeelings",
    label: "Dominant Feelings",
    sectionKey: "dominantFeelings",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "issuesWorkedOn",
    label: "Issues Worked On",
    sectionKey: "issuesWorkedOn",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "therapeuticTechniques",
    label: "Key Therapeutic Techniques",
    sectionKey: "therapeuticTechniques",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "referralsProvided",
    label: "Referrals Provided",
    sectionKey: "referralsProvided",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "homeworkRecommended",
    label: "Homework Recommended",
    sectionKey: "homeworkRecommended",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "plansForNextCall",
    label: "Plans for Next Call",
    sectionKey: "plansForNextCall",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "tags",
    label: "Tags",
    sectionKey: "tags",
    type: "Multiline",
  },

  // Metrics section
  {
    isEditable: true,
    isEnhanceable: true,
    key: "listeningShare",
    label: "Listening Share",
    sectionKey: "metrics",
    type: "Text",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "reflectiveQuestionsAsked",
    label: "No of Reflective Questions asked",
    sectionKey: "metrics",
    type: "Text",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "emotionsLift",
    label: "Emotions Lift",
    sectionKey: "metrics",
    type: "Text",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "notes",
    label: "Notes",
    placeholder: "Take notes for the next call",
    sectionKey: "notes",
    type: "Multiline",
  },
];

export const visibleFields = {
  age: true,
  callDate: true,
  callerId: true,
  callLastedOver: true,
  callTime: true,
  callerType: true,
  concernCode: true,
  counsellorName: true,
  flow: true,
  formalDiagnosis: true,
  gender: true,
  keyConcerns: true,
  listeningRatio: true,
  location: true,
  moodImprovedBy: true,
  profession: true,
  usedCopilot: true,
  youAsked: true,
};

export const summaryValues = {
  // Features and Demographics section
  callId: "CALL-123456",
  callDuration: "45 minutes",
  callDate: "15 August 2023",
  callTime: "10:30 - 11:15",
  callerId: "CL-2023-0042",
  callerType: "First-time caller",
  age: "25-34",
  gender: "Female",
  profession: "Software Engineer",
  location: "Mumbai, India",
  language: "English",
  concernCode: "ANX-001",
  counsellorName: "Sarah Johnson",
  formalDiagnosis: "Client reported previous diagnosis of Generalized Anxiety Disorder (GAD) from psychiatrist in 2020. Currently not on medication but practices meditation regularly.",

  // Session Summary
  sessionSummary: "Client reached out due to increasing anxiety related to work stress and burnout. They described feeling overwhelmed with deadlines and experiencing difficulty sleeping. The session focused on identifying specific triggers and exploring coping mechanisms. Client was receptive to suggested breathing techniques and committed to trying journaling as a way to track thought patterns.",

  // Flow
  flow: "1. Built rapport and created safe space\n2. Explored current anxiety triggers\n3. Discussed coping strategies used in the past\n4. Identified specific workplace stressors\n5. Practiced breathing technique together\n6. Recommended journaling for thought patterns\n7. Discussed potential followup session",

  // Key concerns
  keyConcerns: "1. Work-related anxiety and burnout\n2. Difficulty maintaining work-life balance\n3. Sleep disturbances due to rumination\n4. Social withdrawal from friends and family\n5. Increased physical symptoms (headaches, tension)",

  // Observations and Assessment
  objectiveObservations: "1. Client spoke rapidly during portions of the call\n2. Audible sighing when discussing work environment\n3. Voice tone brightened when talking about potential solutions\n4. Client mentioned checking the time frequently at work (potential time anxiety)",
  
  subjectiveObservations: "Client appeared highly self-aware and insightful about their condition. They were engaged throughout the call and receptive to suggestions. Client demonstrated good cognitive abilities in analyzing their situation, though showed some resistance when discussing potential boundary-setting with their manager.",
  
  assessment: "Client is experiencing moderate to severe work-related anxiety with symptoms affecting sleep quality and social connections. Their self-awareness and previous experience with therapy are strengths that can be leveraged. Primary concerns center around workplace boundaries and perfectionist tendencies.",

  // Emotional and Therapeutic aspects
  dominantFeelings: "1. Anxiety\n2. Frustration\n3. Overwhelm\n4. Hopefulness (toward end of call)",
  
  issuesWorkedOn: "1. Workplace boundary setting\n2. Sleep hygiene techniques\n3. Recognition of physical anxiety symptoms\n4. Cognitive restructuring of perfectionist thoughts",
  
  therapeuticTechniques: "1. Active listening\n2. Validation\n3. Cognitive reframing\n4. Diaphragmatic breathing instruction\n5. Psychoeducation about anxiety response",
  
  referralsProvided: "Suggested Calm app for guided meditations. Mentioned employee assistance program if workplace issues escalate. Provided information about local anxiety support group.",
  
  homeworkRecommended: "1. Daily 5-minute breathing practice\n2. Journaling anxious thoughts using provided template\n3. Setting one boundary at work before next call",
  
  plansForNextCall: "1. Review homework outcomes\n2. Explore childhood origins of perfectionism if client is comfortable\n3. Develop more comprehensive sleep strategy\n4. Practice additional relaxation techniques",
  
  tags: "#work-stress #anxiety #sleep-issues #boundary-setting #perfectionism",

  // Metrics section
  listeningShare: "70:30",
  reflectiveQuestionsAsked: "12",
  emotionsLift: "+3 points",

  // Call Highlights
  callLastedOver: "45 minutes",
  youAsked: "12 open-ended questions",
  usedCopilot: true,
  listeningRatio: "70:30",
  moodImprovedBy: "3 points",

  // Notes
  notes: "For next call: Remember to follow up specifically on the journaling exercise and how the client's conversation with their manager went. Client mentioned potentially needing more support during upcoming project deadline in two weeks.",
};

export const labelShownSections = ["featuresAndDemographics", "metrics"];
