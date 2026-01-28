export interface FeedScenario {
  createdAt: string;
  duration: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
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
    id: string;
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
  user: FeedUser;
  scenario: FeedScenario;
  reactions: Reactions;
  commentsCount: number;
  comments?: Comment[];
  isCommentsLoading?: boolean;
  isCommentsExpanded?: boolean;
  onReviewTranscript?: () => void;
  onCardClick?: () => void;
  onCommentsClick?: () => void;
  duration?: number;
}
