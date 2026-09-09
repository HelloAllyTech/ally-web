export interface getLeaderBoardList {
  data: {
    userId: number;
    name: string;
    profileImageUrl: string;
    rank: number;
    minutesPlayed: number;
    badgeCount: number;
    /** Days this ISO week that earned XP, of any kind. Week-scoped, not window-scoped. */
    daysActiveThisWeek: number;
    weeklyGoalDays: number;
    weeklyGoalMet: boolean;
    /** @deprecated Carries daysActiveThisWeek. Read that instead. */
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
  /** Days this ISO week that earned XP, of any kind. Week-scoped, not window-scoped. */
  daysActiveThisWeek: number;
  weeklyGoalDays: number;
  weeklyGoalMet: boolean;
  /** @deprecated Carries daysActiveThisWeek. Read that instead. */
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
