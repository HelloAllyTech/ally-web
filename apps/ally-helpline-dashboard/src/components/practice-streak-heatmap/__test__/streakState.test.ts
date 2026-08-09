import { afterEach, describe, expect, it, vi } from "vitest";

import { PracticeStreakSummary } from "@types";

import {
  deriveStreakState,
  hasDistinctDailyGoal,
  isPayloadStale,
  localDateIn,
  resolveRingTarget,
  StreakState,
} from "../streakState";

const summary = (overrides: Partial<PracticeStreakSummary> = {}): PracticeStreakSummary => ({
  businessTimezone: "Asia/Kolkata",
  today: "2026-08-09",
  practicedToday: true,
  streakSecuredToday: true,
  minutesToday: 5,
  dailyGoalMinutes: 1,
  minutesToGoal: 0,
  atRisk: false,
  currentStreak: 3,
  longestStreak: 9,
  streakStartDate: "2026-08-07",
  lastActiveDate: "2026-08-09",
  previousRun: null,
  nextMilestone: null,
  streakEventToday: "EXTENDED",
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("deriveStreakState", () => {
  it("is NEVER_STARTED when the user has never practised", () => {
    expect(deriveStreakState(summary({ lastActiveDate: null, currentStreak: 0 }))).toBe(
      StreakState.NEVER_STARTED,
    );
  });

  it("is SECURED once today counts", () => {
    expect(deriveStreakState(summary({ streakSecuredToday: true }))).toBe(StreakState.SECURED);
  });

  it("is AT_RISK when a live streak has not been secured today", () => {
    expect(
      deriveStreakState(summary({ streakSecuredToday: false, currentStreak: 4 })),
    ).toBe(StreakState.AT_RISK);
  });

  it("is AT_RISK even when the user has practised, if it was under the threshold", () => {
    // practicedToday true but streakSecuredToday false — the case the old bar
    // could not express at all.
    expect(
      deriveStreakState(
        summary({ practicedToday: true, streakSecuredToday: false, currentStreak: 4 }),
      ),
    ).toBe(StreakState.AT_RISK);
  });

  it("is JUST_LOST when a run ended inside the recovery window", () => {
    expect(
      deriveStreakState(
        summary({
          streakSecuredToday: false,
          currentStreak: 0,
          lastActiveDate: "2026-08-05",
          previousRun: { days: 12, endedOn: "2026-08-05", daysSinceEnded: 3 },
        }),
      ),
    ).toBe(StreakState.JUST_LOST);
  });

  it("falls back to NEVER_STARTED once the loss is old news", () => {
    expect(
      deriveStreakState(
        summary({
          streakSecuredToday: false,
          currentStreak: 0,
          lastActiveDate: "2026-06-01",
          previousRun: { days: 12, endedOn: "2026-06-01", daysSinceEnded: 40 },
        }),
      ),
    ).toBe(StreakState.NEVER_STARTED);
  });

  it("prefers AT_RISK over JUST_LOST when a streak is still alive", () => {
    expect(
      deriveStreakState(
        summary({
          streakSecuredToday: false,
          currentStreak: 2,
          previousRun: { days: 12, endedOn: "2026-08-01", daysSinceEnded: 6 },
        }),
      ),
    ).toBe(StreakState.AT_RISK);
  });
});

describe("isPayloadStale", () => {
  it("is false when the payload describes the user's current day", () => {
    // 12:00 UTC on Aug 9 is 17:30 IST the same day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));

    expect(isPayloadStale({ today: "2026-08-09", businessTimezone: "Asia/Kolkata" })).toBe(false);
  });

  it("is true once the business day has rolled over", () => {
    // 19:00 UTC on Aug 9 is 00:30 IST on Aug 10 — a tab left open past IST
    // midnight now holds a payload for the previous day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T19:00:00Z"));

    expect(isPayloadStale({ today: "2026-08-09", businessTimezone: "Asia/Kolkata" })).toBe(true);
  });

  it("does not roll over early, just before IST midnight", () => {
    // 18:29 UTC is 23:59 IST — still the same IST day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T18:29:00Z"));

    expect(isPayloadStale({ today: "2026-08-09", businessTimezone: "Asia/Kolkata" })).toBe(false);
  });
});

describe("localDateIn", () => {
  it("formats as YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));

    expect(localDateIn("Asia/Kolkata")).toBe("2026-08-09");
  });
});

describe("resolveRingTarget", () => {
  it("targets the next milestone when one is ahead", () => {
    const result = resolveRingTarget(
      summary({
        currentStreak: 3,
        longestStreak: 9,
        nextMilestone: {
          days: 7,
          badgeId: "b",
          badgeName: "Week One",
          badgeImageUrl: null,
          daysRemaining: 4,
          alreadyEarned: false,
        },
      }),
    );

    expect(result).toEqual({ target: 7, progress: 3 / 7, beyondTarget: false });
  });

  it("falls back to the personal best when there is no milestone", () => {
    const result = resolveRingTarget(
      summary({ currentStreak: 3, longestStreak: 9, nextMilestone: null }),
    );

    expect(result).toEqual({ target: 9, progress: 3 / 9, beyondTarget: false });
  });

  it("reports a new personal best when the current run is the longest", () => {
    const result = resolveRingTarget(
      summary({ currentStreak: 12, longestStreak: 12, nextMilestone: null }),
    );

    expect(result.progress).toBe(1);
    expect(result.beyondTarget).toBe(true);
  });

  it("does not divide by zero on a zero-day milestone", () => {
    const result = resolveRingTarget(
      summary({
        currentStreak: 3,
        longestStreak: 9,
        nextMilestone: {
          days: 0,
          badgeId: "b",
          badgeName: "Broken",
          badgeImageUrl: null,
          daysRemaining: 1,
          alreadyEarned: false,
        },
      }),
    );

    expect(Number.isFinite(result.progress)).toBe(true);
    expect(result.target).toBe(9);
  });

  it("ignores a milestone at or below the current streak", () => {
    const result = resolveRingTarget(
      summary({
        currentStreak: 10,
        longestStreak: 20,
        nextMilestone: {
          days: 7,
          badgeId: "b",
          badgeName: "Week One",
          badgeImageUrl: null,
          daysRemaining: 1,
          alreadyEarned: true,
        },
      }),
    );

    expect(result.target).toBe(20);
  });

  it("stays finite for a brand new user with nothing to aim at", () => {
    const result = resolveRingTarget(
      summary({ currentStreak: 0, longestStreak: 0, nextMilestone: null }),
    );

    expect(Number.isFinite(result.progress)).toBe(true);
    expect(result.beyondTarget).toBe(false);
  });
});

describe("hasDistinctDailyGoal", () => {
  it("is false when the goal is just the active-day minimum", () => {
    // Rendering "1 of 1 min daily goal" is noise — the tenant set no goal.
    expect(hasDistinctDailyGoal({ dailyGoalMinutes: 1 })).toBe(false);
  });

  it("is true when a tenant has configured a real goal", () => {
    expect(hasDistinctDailyGoal({ dailyGoalMinutes: 15 })).toBe(true);
  });
});
