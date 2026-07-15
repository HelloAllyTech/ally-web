export enum PracticeStreakGroupBy {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
}

export interface PracticeStreakCell {
  /** Start date of the bucket (YYYY-MM-DD). */
  periodStart: string;
  /** Inclusive end date of the bucket (YYYY-MM-DD). */
  periodEnd: string;
  /** Practice minutes accumulated in the bucket. */
  minutes: number;
}

export interface PracticeStreakResponse {
  groupBy: PracticeStreakGroupBy;
  cells: PracticeStreakCell[];
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
}

export interface GetPracticeStreakQueryParams {
  groupBy?: PracticeStreakGroupBy;
  from?: string;
  to?: string;
}
