import { PracticeStreakSummary } from "@types";

/**
 * What the streak bar is saying right now. Each state gets its own copy and,
 * where there is something to do about it, its own call to action.
 */
export enum StreakState {
  /** Today already counts. Nothing to do. */
  SECURED = "SECURED",
  /** A live streak that today has not yet protected. */
  AT_RISK = "AT_RISK",
  /** A streak ended recently enough to be worth restarting. */
  JUST_LOST = "JUST_LOST",
  /** No streak, and none recent enough to reference. */
  NEVER_STARTED = "NEVER_STARTED",
}

/**
 * How long after a streak ends we keep offering to restart it. Past this the
 * loss is no longer news and the bar reverts to a plain invitation.
 */
export const RECOVERY_WINDOW_DAYS = 7;

/** Today's date (YYYY-MM-DD) in an IANA timezone. */
export const localDateIn = (timeZone: string): string =>
  // en-CA formats as YYYY-MM-DD, which is what the API speaks.
  new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());

/**
 * True when the payload describes a different day than the one the user is
 * currently in.
 *
 * /learn is the landing route and the bar never unmounts, so a dashboard left
 * open across midnight would otherwise keep rendering yesterday's `atRisk` and
 * `streakSecuredToday` as though they were current — showing a secured streak
 * that is, as of a few minutes ago, at risk.
 */
export const isPayloadStale = (
  summary: Pick<PracticeStreakSummary, "today" | "businessTimezone">,
) => summary.today !== localDateIn(summary.businessTimezone);

type StreakStateInput = Pick<
  PracticeStreakSummary,
  "currentStreak" | "streakSecuredToday" | "lastActiveDate" | "previousRun"
>;

export const deriveStreakState = (summary: StreakStateInput): StreakState => {
  if (!summary.lastActiveDate) return StreakState.NEVER_STARTED;
  if (summary.streakSecuredToday) return StreakState.SECURED;
  if (summary.currentStreak > 0) return StreakState.AT_RISK;
  if (summary.previousRun && summary.previousRun.daysSinceEnded <= RECOVERY_WINDOW_DAYS) {
    return StreakState.JUST_LOST;
  }
  return StreakState.NEVER_STARTED;
};

export interface StreakRingTarget {
  /** Days the ring fills toward. */
  target: number;
  /** 0..1 fill fraction. */
  progress: number;
  /** True when the user is past every target we know about. */
  beyondTarget: boolean;
}

/**
 * What the ring counts toward, in DAYS.
 *
 * Preference order: the next badge milestone, then the personal best, then the
 * bare streak. The ring never mixes units with the number at its centre — both
 * are days.
 */
export const resolveRingTarget = (
  summary: Pick<PracticeStreakSummary, "currentStreak" | "longestStreak" | "nextMilestone">,
): StreakRingTarget => {
  const { currentStreak, longestStreak, nextMilestone } = summary;

  // Guard days === 0: a milestone at zero would divide by zero, and a target at
  // or below the current streak can never fill meaningfully.
  if (nextMilestone && nextMilestone.days > 0 && nextMilestone.days > currentStreak) {
    return {
      target: nextMilestone.days,
      progress: Math.min(currentStreak / nextMilestone.days, 1),
      beyondTarget: false,
    };
  }

  if (longestStreak > 0 && currentStreak < longestStreak) {
    return {
      target: longestStreak,
      progress: Math.min(currentStreak / longestStreak, 1),
      beyondTarget: false,
    };
  }

  // At or past the personal best with no milestone ahead: a full ring, and the
  // copy switches to "new personal best" rather than implying more to go.
  return {
    target: Math.max(currentStreak, longestStreak),
    progress: 1,
    beyondTarget: currentStreak > 0 && currentStreak >= longestStreak,
  };
};

/**
 * Whether the daily goal is a real, separate target worth showing.
 *
 * When a tenant has not configured one the API returns the active-day minimum,
 * which is the same rule the streak already enforces — rendering "1 of 1 min
 * daily goal" would be noise, and showing a goal larger than the streak rule
 * without saying so is what made the old bar misleading.
 */
export const hasDistinctDailyGoal = (
  summary: Pick<PracticeStreakSummary, "dailyGoalMinutes">,
  activeDayMinutes = 1,
): boolean => summary.dailyGoalMinutes > activeDayMinutes;
