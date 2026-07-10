import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PracticeStreakGroupBy } from "@types";

import PracticeStreakHeatmap from "../PracticeStreakHeatmap";

const { mockUseGetPracticeStreakQuery } = vi.hoisted(() => ({
  mockUseGetPracticeStreakQuery: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetPracticeStreakQuery: mockUseGetPracticeStreakQuery,
}));

const successResult = {
  data: {
    groupBy: PracticeStreakGroupBy.DAY,
    cells: [
      { periodStart: "2026-07-08", periodEnd: "2026-07-08", minutes: 12.4 },
      { periodStart: "2026-07-09", periodEnd: "2026-07-09", minutes: 0 },
      { periodStart: "2026-07-10", periodEnd: "2026-07-10", minutes: 40 },
    ],
    totalMinutes: 52.4,
    currentStreak: 3,
    longestStreak: 9,
  },
  isLoading: false,
  isFetching: false,
  isError: false,
};

describe("PracticeStreakHeatmap", () => {
  beforeEach(() => {
    mockUseGetPracticeStreakQuery.mockReset();
    mockUseGetPracticeStreakQuery.mockReturnValue(successResult);
  });

  it("renders the title, streak stats and a cell per bucket", () => {
    render(<PracticeStreakHeatmap />);

    expect(screen.getByText("Practice streak")).toBeInTheDocument();
    // current + longest streak values
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    // rounded minutes rendered in cells (12.4 -> 12, 40 -> 40, 0 -> 0)
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    // total minutes formatted via i18n "{{count}} min"
    expect(screen.getByText("52 min")).toBeInTheDocument();
  });

  it("defaults to the Day grouping and requests it from the API", () => {
    render(<PracticeStreakHeatmap />);

    expect(mockUseGetPracticeStreakQuery).toHaveBeenCalledWith({
      groupBy: PracticeStreakGroupBy.DAY,
    });

    const dayButton = screen.getByText("Day").closest("button");
    expect(dayButton).toHaveAttribute("aria-checked", "true");
  });

  it("switches the grouping when Week is selected", () => {
    render(<PracticeStreakHeatmap />);

    fireEvent.click(screen.getByText("Week"));

    // latest call reflects the new grouping
    expect(mockUseGetPracticeStreakQuery).toHaveBeenLastCalledWith({
      groupBy: PracticeStreakGroupBy.WEEK,
    });
    expect(screen.getByText("Week").closest("button")).toHaveAttribute("aria-checked", "true");
  });

  it("shows an empty state when there are no cells", () => {
    mockUseGetPracticeStreakQuery.mockReturnValue({
      data: {
        groupBy: PracticeStreakGroupBy.DAY,
        cells: [],
        totalMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });

    render(<PracticeStreakHeatmap />);

    expect(
      screen.getByText("No practice sessions yet. Start a role play to build your streak!"),
    ).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    mockUseGetPracticeStreakQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
    });

    render(<PracticeStreakHeatmap />);

    expect(
      screen.getByText("Couldn't load your practice streak. Please try again."),
    ).toBeInTheDocument();
  });
});
