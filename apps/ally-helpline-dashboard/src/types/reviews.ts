export interface ReviewUser {
  id: string;
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
  comments: ReviewComment[];
}

export interface GetReviewsInput {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface GetReviewsResponse {
  count: number;
  data: ReviewItem[];
}

export enum ReactionsType {
  ADD = "ADD",
  REMOVE = "REMOVE",
}
export interface ReactionInput {
  reaction: string;
  action: ReactionsType;
}
