import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PracticeStreakGroupBy, PracticeStreakResponse } from "@types";

import PracticeStreakHeatmap from "../PracticeStreakHeatmap";

const { mockUseGetPracticeStreakQuery, mockRefetch } = vi.hoisted(() => ({
  mockUseGetPracticeStreakQuery: vi.fn(),
  mockRefetch: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPracticeStreakQuery: mockUseGetPracticeStreakQuery,
  useGetPracticeStreakSummaryQuery: vi.fn(),
}));

const CELLS = [
  { periodStart: "2026-08-07", periodEnd: "2026-08-07", minutes: 12.4 },
  { periodStart: "2026-08-08", periodEnd: "2026-08-08", minutes: 0 },
  { periodStart: "2026-08-09", periodEnd: "2026-08-09", minutes: 40 },
];

const response = (overrides: Partial<PracticeStreakResponse> = {}): PracticeStreakResponse => ({
  groupBy: PracticeStreakGroupBy.DAY,
  cells: CELLS,
  totalMinutes: 52.4,
  businessTimezone: "Asia/Kolkata",
  today: "2026-08-09",
  practicedToday: true,
  streakSecuredToday: true,
  minutesToday: 40,
  dailyGoalMinutes: 1,
  minutesToGoal: 0,
  atRisk: false,
  currentStreak: 3,
  longestStreak: 9,
  streakStartDate: "2026-08-07",
  lastActiveDate: "2026-08-09",
  previousRun: null,
  nextMilestone: {
    days: 7,
    badgeId: "badge-week-one",
    badgeName: "Week One",
    badgeImageUrl: null,
    daysRemaining: 4,
    alreadyEarned: false,
  },
  streakEventToday: "EXTENDED",
  ...overrides,
});

const queryResult = (data: PracticeStreakResponse | undefined, extra = {}) => ({
  data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: mockRefetch,
  ...extra,
});

describe("PracticeStreakHeatmap", () => {
  beforeEach(() => {
    mockUseGetPracticeStreakQuery.mockReset();
    mockRefetch.mockReset();
    mockUseGetPracticeStreakQuery.mockReturnValue(queryResult(response()));
    // Pin "now" inside the payload's business day so the staleness guard is
    // quiet unless a test deliberately moves it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("secured state", () => {
    it("leads with the streak in days and says today is counted", () => {
      render(<PracticeStreakHeatmap />);

      const region = screen.getByRole("region", { name: "Practice streak" });
      expect(region).toHaveTextContent("3-day streak");
      expect(region).toHaveTextContent("Today is counted");
      expect(screen.getByText("Counted today")).toBeInTheDocument();
    });

    it("points the ring at the next milestone in days, not minutes", () => {
      render(<PracticeStreakHeatmap />);

      // 3 of 7 days toward Week One — both numbers are days.
      expect(
        screen.getByRole("img", { name: "3-day streak, 4 days to 7" }),
      ).toBeInTheDocument();
    });

    it("names the next badge and how far away it is", () => {
      render(<PracticeStreakHeatmap />);

      expect(screen.getByRole("region", { name: "Practice streak" })).toHaveTextContent(
        "4 days to Week One",
      );
    });

    it("shows the personal best and lifetime minutes with explicit labels", () => {
      render(<PracticeStreakHeatmap />);

      const region = screen.getByRole("region", { name: "Practice streak" });
      expect(region).toHaveTextContent("Best 9 days");
      expect(region).toHaveTextContent("52 min practised in total");
    });

    it("offers no call to action when there is nothing to do", () => {
      render(<PracticeStreakHeatmap onStartPractice={vi.fn()} />);

      expect(screen.queryByRole("button", { name: "Keep it alive" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Start a role play" })).not.toBeInTheDocument();
    });
  });

  describe("at-risk state", () => {
    const atRisk = () =>
      response({
        streakSecuredToday: false,
        practicedToday: false,
        minutesToday: 0,
        atRisk: true,
        streakEventToday: "PENDING",
        lastActiveDate: "2026-08-08",
      });

    it("says the streak is at risk and quotes the real rule", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(queryResult(atRisk()));
      render(<PracticeStreakHeatmap />);

      const region = screen.getByRole("region", { name: "Practice streak" });
      expect(region).toHaveTextContent("3-day streak at risk");
      // The active-day minimum (1 minute), NOT the 15-minute goal the old bar
      // advertised next to a streak that never needed it.
      expect(region).toHaveTextContent("Practise 1 minute today to keep it");
      expect(screen.getByText("Not counted yet")).toBeInTheDocument();
    });

    it("offers a call to action that starts practice", () => {
      const onStartPractice = vi.fn();
      mockUseGetPracticeStreakQuery.mockReturnValue(queryResult(atRisk()));
      render(<PracticeStreakHeatmap onStartPractice={onStartPractice} />);

      fireEvent.click(screen.getByRole("button", { name: "Keep it alive" }));

      expect(onStartPractice).toHaveBeenCalledTimes(1);
    });

    it("hides the call to action when the host page supplies no handler", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(queryResult(atRisk()));
      render(<PracticeStreakHeatmap />);

      expect(screen.queryByRole("button", { name: "Keep it alive" })).not.toBeInTheDocument();
    });

    it("is at risk even when the user practised, if it was under the threshold", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(
        queryResult(
          response({
            practicedToday: true,
            streakSecuredToday: false,
            minutesToday: 0.5,
            atRisk: true,
            streakEventToday: "PENDING",
          }),
        ),
      );
      render(<PracticeStreakHeatmap />);

      expect(screen.getByRole("region", { name: "Practice streak" })).toHaveTextContent(
        "3-day streak at risk",
      );
    });
  });

  describe("recovery after a lost streak", () => {
    it("anchors to the personal best instead of showing a bare zero", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(
        queryResult(
          response({
            currentStreak: 0,
            longestStreak: 12,
            streakSecuredToday: false,
            practicedToday: false,
            minutesToday: 0,
            streakStartDate: null,
            lastActiveDate: "2026-08-05",
            previousRun: { days: 12, endedOn: "2026-08-05", daysSinceEnded: 4 },
            nextMilestone: null,
            streakEventToday: "PENDING",
          }),
        ),
      );
      render(<PracticeStreakHeatmap />);

      const region = screen.getByRole("region", { name: "Practice streak" });
      expect(region).toHaveTextContent("Start a new streak");
      expect(region).toHaveTextContent("Your best run was 12 days");
      // No punitive framing.
      expect(region).not.toHaveTextContent("lost");
    });
  });

  describe("never started", () => {
    it("invites a first streak and keeps the call to action", () => {
      const onStartPractice = vi.fn();
      mockUseGetPracticeStreakQuery.mockReturnValue(
        queryResult(
          response({
            cells: [],
            totalMinutes: 0,
            currentStreak: 0,
            longestStreak: 0,
            streakSecuredToday: false,
            practicedToday: false,
            minutesToday: 0,
            streakStartDate: null,
            lastActiveDate: null,
            previousRun: null,
            nextMilestone: null,
            streakEventToday: "PENDING",
          }),
        ),
      );
      render(<PracticeStreakHeatmap onStartPractice={onStartPractice} />);

      expect(screen.getByRole("region", { name: "Practice streak" })).toHaveTextContent(
        "Start your first streak",
      );
      expect(screen.getByRole("button", { name: "Start a role play" })).toBeInTheDocument();
    });
  });

  describe("daily goal", () => {
    it("hides the goal line when the tenant has not configured one", () => {
      render(<PracticeStreakHeatmap />);

      // dailyGoalMinutes === 1 means "no goal"; "1 of 1 min daily goal" is noise.
      expect(screen.queryByText(/daily goal/)).not.toBeInTheDocument();
    });

    it("shows the goal line when a tenant has configured a real goal", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(
        queryResult(response({ dailyGoalMinutes: 15, minutesToday: 4, minutesToGoal: 11 })),
      );
      render(<PracticeStreakHeatmap />);

      expect(screen.getByText("4 of 15 min daily goal")).toBeInTheDocument();
    });
  });

  describe("grouping", () => {
    it("defaults to Day and requests it from the API", () => {
      render(<PracticeStreakHeatmap />);

      expect(mockUseGetPracticeStreakQuery).toHaveBeenCalledWith(
        { groupBy: PracticeStreakGroupBy.DAY },
        expect.any(Object),
      );
    });

    it("keeps the grouping control with the timeline it controls", () => {
      render(<PracticeStreakHeatmap />);

      // Collapsed, the panel is aria-hidden, so the control is not exposed —
      // it configures the timeline, and offering it while the timeline is
      // hidden was what crowded the state copy out of the header.
      expect(screen.queryByRole("radio", { name: "Week" })).not.toBeInTheDocument();
    });

    it("switches the grouping when Week is selected", () => {
      render(<PracticeStreakHeatmap />);

      fireEvent.click(screen.getByRole("button", { name: "Show full practice history" }));
      // ToggleButtonGroup renders its options as role="radio", not button.
      fireEvent.click(screen.getByRole("radio", { name: "Week" }));

      expect(mockUseGetPracticeStreakQuery).toHaveBeenLastCalledWith(
        { groupBy: PracticeStreakGroupBy.WEEK },
        expect.any(Object),
      );
    });
  });

  describe("timeline", () => {
    it("keeps the full timeline collapsed until the header is clicked", () => {
      render(<PracticeStreakHeatmap />);

      expect(
        screen.queryByRole("list", { name: "Practice minutes heatmap" }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Show full practice history" }));

      expect(screen.getByRole("list", { name: "Practice minutes heatmap" })).toBeInTheDocument();
    });

    it("exposes the recent-practice strip to assistive tech", () => {
      render(<PracticeStreakHeatmap />);

      // Previously aria-hidden, so screen reader users got nothing at all.
      expect(
        screen.getByRole("img", { name: /Recent practice: practised on 2 of the last 3/ }),
      ).toBeInTheDocument();
    });

    it("makes each cell focusable and labelled instead of relying on hover", () => {
      render(<PracticeStreakHeatmap />);
      fireEvent.click(screen.getByRole("button", { name: "Show full practice history" }));

      const cells = screen.getAllByRole("listitem");
      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveAttribute("tabindex", "0");
      expect(cells[0]).toHaveAccessibleName(/Aug 7, 2026/);
    });
  });

  describe("failure and staleness", () => {
    it("offers a retry when the query fails", () => {
      mockUseGetPracticeStreakQuery.mockReturnValue(
        queryResult(undefined, { isError: true }),
      );
      render(<PracticeStreakHeatmap />);

      expect(screen.getByText("Couldn't load your practice streak.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(mockRefetch).toHaveBeenCalled();
    });

    it("refetches instead of rendering a payload from a previous business day", () => {
      // 19:00 UTC on Aug 9 is 00:30 IST on Aug 10 — the payload's "today" is now
      // yesterday, so its secured/at-risk flags describe the wrong day.
      vi.setSystemTime(new Date("2026-08-09T19:00:00Z"));
      mockUseGetPracticeStreakQuery.mockReturnValue(queryResult(response()));

      render(<PracticeStreakHeatmap />);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it("does not refetch while the payload is still current", () => {
      render(<PracticeStreakHeatmap />);

      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });
});
