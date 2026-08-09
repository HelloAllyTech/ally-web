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

/** The most recent run that has already ended, for post-loss recovery framing. */
export interface StreakPreviousRun {
  days: number;
  /** YYYY-MM-DD */
  endedOn: string;
  daysSinceEnded: number;
}

/** Next streak badge the user is working toward. */
export interface StreakMilestone {
  days: number;
  badgeId: string;
  badgeName: string;
  badgeImageUrl: string | null;
  daysRemaining: number;
  /** True when held from an earlier run, so the UI can phrase it as a re-earn. */
  alreadyEarned: boolean;
}

/** What today's practice did to the streak. */
export type StreakEventToday = "STARTED" | "EXTENDED" | "PENDING";

/**
 * Streak state without the heatmap cells — what `/practice-streak/summary`
 * returns and what every streak surface renders from.
 */
export interface PracticeStreakSummary {
  /** IANA timezone whose calendar day the streak resets on. */
  businessTimezone: string;
  /** Today in the business timezone (YYYY-MM-DD). Lets the client spot a stale payload. */
  today: string;
  /** Practised at all today. */
  practicedToday: boolean;
  /** Today already counts toward the streak. This — not the daily goal — protects it. */
  streakSecuredToday: boolean;
  minutesToday: number;
  /** Tenant-configured goal. Equal to the active-day minimum means "no goal set". */
  dailyGoalMinutes: number;
  minutesToGoal: number;
  atRisk: boolean;
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  lastActiveDate: string | null;
  previousRun: StreakPreviousRun | null;
  /** Null when no threshold sits above the current streak — hide the milestone, never invent one. */
  nextMilestone: StreakMilestone | null;
  streakEventToday: StreakEventToday;
}

export interface PracticeStreakResponse extends PracticeStreakSummary {
  groupBy: PracticeStreakGroupBy;
  cells: PracticeStreakCell[];
  totalMinutes: number;
}

export interface GetPracticeStreakQueryParams {
  groupBy?: PracticeStreakGroupBy;
  from?: string;
  to?: string;
}
