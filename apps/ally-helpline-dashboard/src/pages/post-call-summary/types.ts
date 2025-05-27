import { Article } from "@/components/article/types";

export enum SectionType {
  StressBuster = "Stress buster",
  CallSummary = "Call summary",
  Resources = "You might also like",
}

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  NON_BINARY = "Non-binary",
  PREFER_NOT_TO_SAY = "Client Prefers Not to Say"
}

export type FieldType = "Text" | "Number" | "Dropdown" | "Multiline" | "Boolean";

export interface SummaryField {
  isEditable: boolean;
  isEnhanceable?: boolean;
  key: string;
  label: string;
  options?: string[];
  placeholder?: string;
  sectionKey: string;
  type: FieldType;
}

export interface CallSummaryStepperProps {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  completedSections: SectionType[];
}

export interface StressBusterProps {
  onProceed: () => void;
}

export interface CallSummaryStepProps {
  isLoading: boolean;
  onProceed: () => void;
  summaryData: any;
}

export interface CallSummaryProps {
  onProceed: () => void;
}

export interface ModalData {
  type: "article" | "redirect";
  article: Article;
}

export interface ArticleGridStepProps {
  onArticleClick: (article: Article) => void;
  onProceed: () => void;
}