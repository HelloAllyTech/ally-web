import { Dispatch, SetStateAction } from "react";

import { SummaryFieldKey } from "@/types/summary";

export enum SectionType {
  BoxBreathing = "Box breathing",
  CallSummary = "Call summary",
}

export enum SummarySectionKey {
  FeaturesAndDemographics = "featuresAndDemographics",
  SessionSummary = "sessionSummary",
  Flow = "flow",
  KeyConcerns = "keyConcerns",
  ObjectiveObservations = "objectiveObservations",
  SubjectiveObservations = "subjectiveObservations",
  Assessment = "assessment",
  DominantFeelings = "dominantFeelings",
  IssuesWorkedOn = "issuesWorkedOn",
  KeyTherapeuticTechniques = "keyTherapeuticTechniques",
  ReferralsProvided = "referralsProvided",
  HomeworkRecommended = "homeworkRecommended",
  PlansForNextCall = "plansForNextCall",
  Tags = "tags",
  Metrics = "metrics",
}

export type FieldType = "Text" | "Number" | "Dropdown" | "Multiline" | "Boolean";

export interface SummaryField {
  isEditable: boolean;
  isEnhanceable?: boolean;
  key: SummaryFieldKey;
  label: string;
  options?: string[];
  placeholder?: string;
  sectionKey: SummarySectionKey;
  type: FieldType;
}

export interface CallSummaryStepperProps {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  completedSections: SectionType[];
  className?: string;
}

export interface StressBusterProps {
  onProceed: () => void;
}

export interface CallSummaryProps {
  // TODO: create a type for the call summary
  className?: string;
  callSummary: any;
  chatId: number;
  onProceed: () => void;
  isSummaryLoading: boolean;
  isInSidebar?: boolean;
  isSummaryPolling?: boolean;
  fromSummarySidebar?: boolean;
  onClickViewSummary?: () => void;
}
