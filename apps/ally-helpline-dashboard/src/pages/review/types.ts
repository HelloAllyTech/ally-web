import { GetReviewThreadsResponse, ReviewItem } from "@types";

export interface SimulationReviewProps {
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  feedData: ReviewItem[];
  selectedReviewId: string | null;
  reviewThreadsData: GetReviewThreadsResponse;
  onReviewTranscript: (reviewId: string) => void;
  onCommentsClick: (reviewId: string) => void;
  isReviewThreadsLoading: boolean;
}

export interface ScribeReviewProps {
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  feedData: ReviewItem[];
  selectedReviewId: string | null;
  reviewThreadsData: GetReviewThreadsResponse;
  onReviewTranscript: (reviewId: string) => void;
  onCommentsClick: (reviewId: string) => void;
  isReviewThreadsLoading: boolean;
}
