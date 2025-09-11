import { SimulationSummary } from "@types";

export interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
}

export type FeedbackSectionProps = SimulationSummary;

export interface ReviewSectionProps {
  summaryId: string;
  onSummaryClose: () => void;
}
