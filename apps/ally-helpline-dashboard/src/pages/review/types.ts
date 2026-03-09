import { ReviewItem } from "@types";

export interface SimulationReviewProps {
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  feedData: ReviewItem[];
  onReviewTranscript: (reviewId: string) => void;
}

export interface ScribeReviewProps {
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  feedData: ReviewItem[];
  onReviewTranscript: (reviewId: string) => void;
}
