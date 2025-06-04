import { Dispatch, SetStateAction } from "react";

import { Article } from "@/components/article/types";
import { SummaryFieldKey } from "@/types/summary";

export enum SectionType {
  StressBuster = "Stress buster",
  CallSummary = "Call summary",
  Resources = "You might also like",
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
  callSummary: any;
  chatId: number;
  onProceed: () => void;
  isSummaryLoading: boolean;
  showInitialLoading: boolean;
  setShowInitialLoading: Dispatch<SetStateAction<boolean>>;
}

export interface ModalData {
  type: "article" | "redirect";
  article: Article;
}

export interface ArticleGridStepProps {
  onArticleClick: (article: Article) => void;
  onProceed: () => void;
}
