export enum SectionType {
  StressBuster = "Stress buster",
  CallHighlights = "Call highlights",
  CallSummary = "Call summary",
  Resources = "You might also like",
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