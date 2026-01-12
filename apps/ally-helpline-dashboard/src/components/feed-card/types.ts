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
  user: {
    name: string;
    profileImage?: string;
  };
  date: string;
  text: string;
  reactions: Reactions;
  repliesCount?: number;
  replies?: Comment[];
}

export interface FeedCardProps {
  id: string;
  createdAt: string;
  user: FeedUser;
  scenario: FeedScenario;
  reactions: Reactions;
  commentsCount: number;
  comments?: Comment[];
  onReviewTranscript?: () => void;
  onCardClick?: () => void;
  onCommentsClick?: () => void;
}
