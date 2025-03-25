import { Article } from "@/components/article/types";

export enum SectionType {
  StressBuster = "Stress buster",
  CallHighlights = "Call highlights",
  CallSummary = "Call summary",
  Resources = "You might also like",
}

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  NON_BINARY = "Non-binary",
  PREFER_NOT_TO_SAY = "Client Prefers Not to Say"
}

export interface CallSummaryStepperProps {
  activeSection: SectionType;
  setActiveSection: (section: SectionType) => void;
  completedSections: SectionType[];
}

export interface StressBusterProps {
  onProceed: () => void;
}

export interface CallHighlightsProps {
  onProceed: () => void;
  summaryData: any;
}

export interface Highlight {
  key: string;
  title: string;
  image: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface CallSummaryProps {
  onProceed: () => void;
  summaryData: any;
}

export interface ModalData {
  type: "article" | "redirect";
  article: Article;
}

export interface ArticleGridStepProps {
  onArticleClick: (article: Article) => void;
  onProceed: () => void;
}