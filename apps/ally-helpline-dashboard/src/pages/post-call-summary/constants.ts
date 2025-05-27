import {
  CallDetails,
  SessionSummary,
  Flow,
  KeyConcerns,
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

import { SummaryField } from "./types";

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
    key: "keyTherapeuticTechniques",
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
    key: "clientId",
    label: "Caller ID",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "counselorName",
    label: "Counsellor Name",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: false,
    key: "callType",
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
    key: "relationshipStatus",
    label: "Relationship status",
    sectionKey: "featuresAndDemographics",
    type: "Text",
  },
  {
    isEditable: true,
    key: "language",
    label: "Languages",
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
    key: "codeOfConcern",
    label: "Concern code",
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
    key: "counselingProcessFlow",
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
    key: "keyTherapeuticTechniques",
    label: "Key Therapeutic Techniques",
    sectionKey: "keyTherapeuticTechniques",
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
    key: "homework",
    label: "Homework Recommended",
    sectionKey: "homeworkRecommended",
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: "planForNextCall",
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
    key: "emotionalLift",
    label: "Emotions Lift",
    sectionKey: "metrics",
    type: "Text",
  },
];

export const labelShownSections = ["featuresAndDemographics", "metrics"];
