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
    title: "Caller’s mood had increased by",
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
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "objectiveObservations",
    title: "Objective Observations",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "subjectiveObservations",
    title: "Subjective Observations",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "assessment",
    title: "Assessment",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "dominantFeelings",
    title: "Dominant Feelings",
  },  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "issuesWorkedOn",
    title: "Issues Worked On",
  },  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "therapeuticTechniques",
    title: "Key Therapeutic Techniques",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "referralsProvided",
    title: "Referrals Provided",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "homeworkRecommended",
    title: "Homework Recommended",
  },
    {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "plansForNextCall",
    title: "Plans for Next Call",
  },
    {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: "tags",
    title: "Tags",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
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
    type: "Dropdown",
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
  // Call Details section
  callDate: "15 August 2023",
  callTime: "10:30 - 11:15",
  callerType: "First-time caller",
  counsellorName: "Sarah Johnson",

  // Demogs section
  callerId: "CL-2023-0042",
  age: 28,
  gender: "Female",
  location: "Mumbai, India",
  profession: "Software Engineer",
  concernCode: "ANX-001",
  formalDiagnosis:
    "Client reported previous diagnosis of Generalized Anxiety Disorder (GAD) from psychiatrist in 2020. Currently not on medication but practices meditation regularly.",

  // Call Highlights section
  callLastedOver: "45 minutes",
  youAsked: "12 open-ended questions",
  usedCopilot: true,
  listeningRatio: "70:30",
  moodImprovedBy: "3 points",

  // Other fields
  flow: "1. Built rapport and created safe space\n2. Explored current anxiety triggers\n3. Discussed coping strategies used in the past\n4. Identified specific workplace stressors\n5. Practiced breathing technique together\n6. Recommended journaling for thought patterns\n7. Discussed potential followup session",

  keyConcerns:
    "1. Work-related anxiety and burnout\n2. Difficulty maintaining work-life balance\n3. Sleep disturbances due to rumination\n4. Social withdrawal from friends and family\n5. Increased physical symptoms (headaches, tension)",
  notes: "",
};

export const labelShownSections = ["featuresAndDemographics", "metrics"];
