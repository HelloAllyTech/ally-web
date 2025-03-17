export enum SectionType {
  CallHighlights = "Call highlights",
  StressBuster = "Stress buster",
  CallSummary = "Call summary",
  Resources = "You might also like",
}

export interface CallHighlightsProps {
  onProceed: () => void;
}
