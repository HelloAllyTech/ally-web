import { GetSimulationSummaryResponse } from "@types";

export interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
}

export type FeedbackSectionProps = GetSimulationSummaryResponse;

export interface ReviewSectionProps {
  summaryId: string;
  onSummaryClose: () => void;
}
