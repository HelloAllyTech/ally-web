import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PracticeStreakSummary } from "@types";

import { usePostSessionStreak } from "../usePostSessionStreak";

const { mockUseGetPracticeStreakSummaryQuery } = vi.hoisted(() => ({
  mockUseGetPracticeStreakSummaryQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPracticeStreakSummaryQuery: mockUseGetPracticeStreakSummaryQuery,
}));

const summary = (overrides: Partial<PracticeStreakSummary> = {}): PracticeStreakSummary => ({
  businessTimezone: "Asia/Kolkata",
  today: "2026-08-09",
  practicedToday: true,
  streakSecuredToday: true,
  minutesToday: 8,
  dailyGoalMinutes: 1,
  minutesToGoal: 0,
  atRisk: false,
  currentStreak: 5,
  longestStreak: 12,
  streakStartDate: "2026-08-05",
  lastActiveDate: "2026-08-09",
  previousRun: null,
  nextMilestone: null,
  streakEventToday: "EXTENDED",
  ...overrides,
});

describe("usePostSessionStreak", () => {
  beforeEach(() => {
    mockUseGetPracticeStreakSummaryQuery.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns nothing while disabled", () => {
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({ data: summary() });

    const { result } = renderHook(() => usePostSessionStreak(false));

    expect(result.current.streak).toBeNull();
  });

  it("skips the query entirely while disabled", () => {
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({ data: undefined });

    renderHook(() => usePostSessionStreak(false));

    expect(mockUseGetPracticeStreakSummaryQuery).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: true }),
    );
  });

  it("stays silent while the streak write is still in flight", () => {
    // The write happens off an async event, so an immediate read can beat it.
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ streakEventToday: "PENDING", streakSecuredToday: false }),
    });

    const { result } = renderHook(() => usePostSessionStreak(true));

    expect(result.current.streak).toBeNull();
  });

  it("resolves once the payload reports the session was credited", () => {
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ streakEventToday: "EXTENDED" }),
    });

    const { result } = renderHook(() => usePostSessionStreak(true));

    expect(result.current.streak?.currentStreak).toBe(5);
  });

  it("keeps polling while the payload is about a previous business day", () => {
    // 19:00 UTC is 00:30 IST the next day — a cached payload stamped with the
    // old day would otherwise be trusted and show the wrong state.
    vi.setSystemTime(new Date("2026-08-09T19:00:00Z"));
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ today: "2026-08-09", streakEventToday: "EXTENDED" }),
    });

    const { result } = renderHook(() => usePostSessionStreak(true));

    expect(result.current.streak).toBeNull();
  });

  it("gives up silently rather than guessing when the write never lands", () => {
    // RTK returns a referentially stable object when a poll yields identical
    // data, so the deadline must be wall-clock — counting responses would never
    // advance here and the hook would poll forever.
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ streakEventToday: "PENDING" }),
    });

    const { result, rerender } = renderHook(() => usePostSessionStreak(true));

    expect(
      mockUseGetPracticeStreakSummaryQuery.mock.calls.at(-1)?.[1]?.pollingInterval,
    ).toBe(3500);

    act(() => {
      vi.advanceTimersByTime(3500 * 5 + 1);
    });
    rerender();

    expect(result.current.streak).toBeNull();
    expect(
      mockUseGetPracticeStreakSummaryQuery.mock.calls.at(-1)?.[1]?.pollingInterval,
    ).toBe(0);
  });

  it("latches, so a later refetch cannot change the number under the user", () => {
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ currentStreak: 5, streakEventToday: "EXTENDED" }),
    });

    const { result, rerender } = renderHook(() => usePostSessionStreak(true));
    expect(result.current.streak?.currentStreak).toBe(5);

    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ currentStreak: 9, streakEventToday: "EXTENDED" }),
    });
    rerender();

    expect(result.current.streak?.currentStreak).toBe(5);
  });

  it("stops polling once resolved", () => {
    mockUseGetPracticeStreakSummaryQuery.mockReturnValue({
      data: summary({ streakEventToday: "STARTED", currentStreak: 1 }),
    });

    const { rerender } = renderHook(() => usePostSessionStreak(true));
    rerender();

    const lastCall = mockUseGetPracticeStreakSummaryQuery.mock.calls.at(-1);
    expect(lastCall?.[1]?.pollingInterval).toBe(0);
  });
});
