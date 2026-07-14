import { Comment } from "@src/components/feed-card";

export interface ReviewUser {
  id: number;
  name: string;
  profileImage?: string;
}

export interface ReviewScenario {
  title: string;
  createdAt: string;
  duration: string;
  description: string;
  coverImageUrl: string;
}

export interface ReviewComment {
  id: string;
  user: ReviewUser;
  date: string;
  text: string;
  reactions: Record<string, number>;
  repliesCount: number;
}

export interface ReviewItem {
  id: string;
  createdAt: string;
  createdBy: ReviewUser;
  scenario: ReviewScenario;
  reactions: Record<string, number>;
  commentsCount: number;
  scenarioSession?: {
    duration?: number;
    createdAt?: string;
    audioUrl?: string | null;
  };
  scribeSession?: {
    duration?: number;
    createdAt?: string;
    summaryName?: string;
  };
  note: string;
  noteEditedAt: string;
  isEdited: boolean;
  isReviewed: boolean;
}

export interface GetReviewsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  languageCode?: string;
  readFilter?: string;
  scenarioId?: number;
}

export interface GetReviewsResponse {
  count: number;
  data: ReviewItem[];
}

export interface GetReviewThreadsResponse {
  data: ReviewThread[];
}

export interface ReviewThread {
  id: string;
  comments: Comment[];
  commentCount: number;
}
export enum ReactionsType {
  ADD = "ADD",
  REMOVE = "REMOVE",
  UPDATE = "UPDATE",
}

export interface ReactionInput {
  reaction: string;
  action: ReactionsType;
}

export interface GetReviewReactionsResponse {
  data: ReviewReaction[];
  count: number;
}

export interface ReviewReaction {
  id: string;
  createdBy: ReviewUser;
  reaction: string;
  count: number;
}

export interface GetReviewsReactionsInput {
  limit?: number;
  offset?: number;
  reaction?: string;
  reviewId: string;
  isScribe?: boolean;
}

export interface CommentItem {
  id: string;
  createdBy: {
    id: number;
    name: string;
    profileImage: string | null;
  };
  createdAt: string;
  content: string;
  reactions: {
    [key: string]: number;
  };
  replyCount: number;
  hidden?: boolean;
  myReaction?: string;
}

export interface CommentChangeParams {
  comments: CommentItem[];
  threadId: string;
  transcript?: {
    id: number;
  };
  selection?: {
    text: string;
    startIndex: number;
    endIndex: number;
    messageId: number;
  };
  isThreadExists?: boolean;
}
export interface Thread {
  id: string;
  selection: {
    text: string;
    startIndex: number;
    endIndex: number;
    messageId: number;
  };
  comments: CommentItem[];
}

export interface TextSegment {
  id: number;
  content: string;
  isComment: boolean;
  commentIndex?: number;
  threadId?: string;
  selection?: {
    startIndex: number;
    endIndex: number;
  };
  comments?: CommentItem[];
  overlappingThreads?: Thread[];
}

export interface ShareForReviewsInput {
  scenarioSessionId: string;
  note?: string;
  status: string;
}

export interface ShareForReviewsScribeInput {
  scribeSessionId: number;
  note?: string;
  status: string;
}
