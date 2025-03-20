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

export interface StressBusterProps {
  onProceed: () => void;
}

export interface CallHighlightsProps {
  onProceed: () => void;
}

export interface CallSummaryProps {
  onProceed: () => void;
  summaryData: any;
}

export interface ModalData {
  type: "article" | "redirect";
}