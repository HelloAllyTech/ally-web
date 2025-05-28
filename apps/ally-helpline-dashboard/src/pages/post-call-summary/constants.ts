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
import { SummaryFieldKey } from "@/types/summary";

import { SummaryField, SummarySectionKey } from "./types";

export const summarySections = [
  {
    icon: {
      icon: CallDetails,
      alt: "features-and-demographics",
    },
    key: SummarySectionKey.FeaturesAndDemographics,
    title: "Features and Demographics",
  },
  {
    icon: {
      icon: SessionSummary,
      alt: "session-summary",
    },
    key: SummarySectionKey.SessionSummary,
    title: "Session Summary",
  },
  {
    icon: {
      icon: Flow,
      alt: "flow",
    },
    key: SummarySectionKey.Flow,
    title: "Flow",
  },
  {
    icon: {
      icon: KeyConcerns,
      alt: "key-concerns",
    },
    key: SummarySectionKey.KeyConcerns,
    title: "Key concerns",
  },
  {
    icon: {
      icon: ObjectiveObservations,
      alt: "objective-observations",
    },
    key: SummarySectionKey.ObjectiveObservations,
    title: "Objective Observations",
  },
  {
    icon: {
      icon: SubjectiveObservations,
      alt: "subjective-observations",
    },
    key: SummarySectionKey.SubjectiveObservations,
    title: "Subjective Observations",
  },
  {
    icon: {
      icon: Assessment,
      alt: "assessment",
    },
    key: SummarySectionKey.Assessment,
    title: "Assessment",
  },
  {
    icon: {
      icon: DominantFeelings,
      alt: "dominant-feelings",
    },
    key: SummarySectionKey.DominantFeelings,
    title: "Dominant Feelings",
  },  {
    icon: {
      icon: IssuesWorkedOn,
      alt: "issues-worked-on",
    },
    key: SummarySectionKey.IssuesWorkedOn,
    title: "Issues Worked On",
  },  {
    icon: {
      icon: TherapeuticTechniques,
      alt: "key-therapeutic-techniques",
    },
    key: SummarySectionKey.KeyTherapeuticTechniques,
    title: "Key Therapeutic Techniques",
  },
  {
    icon: {
      icon: ReferralsProvided,
      alt: "referrals-provided",
    },
    key: SummarySectionKey.ReferralsProvided,
    title: "Referrals Provided",
  },
  {
    icon: {
      icon: HomeworkRecommended,
      alt: "homework-recommended",
    },
    key: SummarySectionKey.HomeworkRecommended,
    title: "Homework Recommended",
  },
    {
    icon: {
      icon: PlansForNextCall,
      alt: "plans-for-next-call",
    },
    key: SummarySectionKey.PlansForNextCall,
    title: "Plans for Next Call",
  },
    {
    icon: {
      icon: Tags,
      alt: "tags",
    },
    key: SummarySectionKey.Tags,
    title: "Tags",
  },
  {
    icon: {
      icon: Metrics,
      alt: "metrics",
    },
    key: SummarySectionKey.Metrics,
    title: "Metrics",
  },
];

export const summaryFields: SummaryField[] = [
  // Features and Demographics section
  {
    isEditable: false,
    key: SummaryFieldKey.CallId,
    label: "Call ID",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.CallDuration,
    label: "Call Duration",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.CallDate,
    label: "Call Date",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.CallTime,
    label: "Call time",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.ClientId,
    label: "Caller ID",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.CounselorName,
    label: "Counsellor Name",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: false,
    key: SummaryFieldKey.CallType,
    label: "Caller type",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.Age,
    label: "Age",
    options: ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.Gender,
    label: "Gender",
    options: ["Male", "Female", "Other", "Prefer not to say"],
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.Profession,
    label: "Profession",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.RelationshipStatus,
    label: "Relationship status",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.Languages,
    label: "Languages",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.Location,
    label: "Location",
    options: [],
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Dropdown",
  },
  {
    isEditable: true,
    key: SummaryFieldKey.CodeOfConcern,
    label: "Concern code",
    sectionKey: SummarySectionKey.FeaturesAndDemographics,
    type: "Text",
  },

  // Other fields
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.SessionSummary,
    label: "Session Summary",
    sectionKey: SummarySectionKey.SessionSummary,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.CounselingProcessFlow,
    label: "Flow",
    sectionKey: SummarySectionKey.Flow,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.KeyConcerns,
    label: "Key concerns",
    sectionKey: SummarySectionKey.KeyConcerns,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.ObjectiveObservations,
    label: "Objective Observations",
    sectionKey: SummarySectionKey.ObjectiveObservations,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.SubjectiveObservations,
    label: "Subjective Observations",
    sectionKey: SummarySectionKey.SubjectiveObservations,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.Assessment,
    label: "Assessment",
    sectionKey: SummarySectionKey.Assessment,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.DominantFeelings,
    label: "Dominant Feelings",
    sectionKey: SummarySectionKey.DominantFeelings,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.IssuesWorkedOn,
    label: "Issues Worked On",
    sectionKey: SummarySectionKey.IssuesWorkedOn,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.KeyTherapeuticTechniques,
    label: "Key Therapeutic Techniques",
    sectionKey: SummarySectionKey.KeyTherapeuticTechniques,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.ReferralsProvided,
    label: "Referrals Provided",
    sectionKey: SummarySectionKey.ReferralsProvided,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.Homework,
    label: "Homework Recommended",
    sectionKey: SummarySectionKey.HomeworkRecommended,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.PlanForNextCall,
    label: "Plans for Next Call",
    sectionKey: SummarySectionKey.PlansForNextCall,
    type: "Multiline",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.Tags,
    label: "Tags",
    sectionKey: SummarySectionKey.Tags,
    type: "Multiline",
  },

  // Metrics section
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.ListeningShare,
    label: "Listening Share",
    sectionKey: SummarySectionKey.Metrics,
    type: "Text",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.ReflectiveQuestionsAsked,
    label: "No of Reflective Questions asked",
    sectionKey: SummarySectionKey.Metrics,
    type: "Text",
  },
  {
    isEditable: true,
    isEnhanceable: true,
    key: SummaryFieldKey.EmotionalLift,
    label: "Emotions Lift",
    sectionKey: SummarySectionKey.Metrics,
    type: "Text",
  },
];

export const labelShownSections = [
  SummarySectionKey.FeaturesAndDemographics,
  SummarySectionKey.Metrics,
];
