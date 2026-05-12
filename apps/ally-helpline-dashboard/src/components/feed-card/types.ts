import { ReviewUser } from "@src/types";

export interface FeedScenario {
  createdAt: string;
  duration: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
}

export interface ScribeSession {
  duration: number;
  createdAt: string;
}

export interface FeedUser {
  name: string;
  profileImage?: string;
  id: number;
}

export interface Reactions {
  [reactionCode: string]: number;
}

export interface FeedItem {
  id: string;
  createdAt: string;
  scenario: FeedScenario;
  commentsCount: number;
  reactions: Reactions;
  user: FeedUser;
}

export interface FeedApiResponse {
  data: FeedItem[];
  count: number;
}

export interface Comment {
  id: string;
  createdBy: {
    id: number;
    name: string;
    profileImage?: string;
  };
  createdAt: string;
  content: string;
  reactions: Reactions;
  replyCount?: number;
}

export interface FeedCardProps {
  id: string;
  createdAt: string;
  user: ReviewUser;
  scenario?: FeedScenario;
  reactions: Reactions;
  commentsCount: number;
  onReviewTranscript?: () => void;
  duration?: number;
  dateTime?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  badgeText?: string;
  isEdited?: boolean;
  isViewMoreExpanded?: boolean;
  onTapViewMore?: () => void;
  note?: string;
  isScribeReview?: boolean;
  scribeSummaryName?: string;
  audioUrl?: string | null;
}
