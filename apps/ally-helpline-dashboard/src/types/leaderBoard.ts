export interface getLeaderBoardList {
  data: {
    userId: number;
    name: string;
    profileImageUrl: string;
    rank: number;
    minutesPlayed: number;
    badgeCount: number;
    /** All-time consecutive-active-days streak, not window-scoped. */
    currentStreak: number;
  }[];
  hideRankInCommunity?: boolean;
  window: string;
  totalCount: number;
}

export interface getCurrentUser {
  userId: number;
  name: string;
  profileImageUrl: string;
  rank: number;
  minutesPlayed: number;
  badgeCount: number;
  /** All-time consecutive-active-days streak, not window-scoped. */
  currentStreak: number;
  window: string;
}

export interface GetLeaderBoardQueryParams {
  window?: string;
  offset?: number;
  limit?: number;
  sortBy?: string;
  order?: "ASC" | "DESC";
}
