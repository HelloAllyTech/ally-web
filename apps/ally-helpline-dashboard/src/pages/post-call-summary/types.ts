import { ChatSummaryStatus, SummaryFieldKey } from "@types";

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

export enum FieldType {
  Text = "Text",
  Number = "Number",
  Dropdown = "Dropdown",
  Multiline = "Multiline",
}

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
  postProcess?: (status?: ChatSummaryStatus) => void;
  chatId: number;
  refetchCallLogs?: () => void;
  isInSidebar?: boolean;
  fromSummarySidebar?: boolean;
  headerContent?: React.ReactNode;
}

export interface SummaryLoadingProps {
  isSummaryGenerated?: boolean;
  estimatedTime?: number;
  isNotesSaving?: boolean;
  onNotesChange?: (notes: string) => void;
  onViewCallLogs: () => void;
  notes?: string;
  refetchSummary: () => void;
  inSummarySidebar?: boolean;
}
