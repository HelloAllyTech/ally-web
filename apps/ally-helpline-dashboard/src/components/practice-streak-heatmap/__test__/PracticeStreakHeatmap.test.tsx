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

  it("renders the compact header: current streak, longest, total and the goal ring", () => {
    render(<PracticeStreakHeatmap />);

    const region = screen.getByRole("region", { name: "Practice streak" });

    // Hero current-streak number.
    expect(screen.getByText("3")).toBeInTheDocument();
    // Longest + total live in the sub-line.
    expect(region).toHaveTextContent("Longest 9 days");
    expect(region).toHaveTextContent("Total 52 min");
    // Ring shows the most recent period's rounded minutes (last cell = 40) against
    // the Day goal caption ("of {{count}} min today", goal = 15).
    expect(screen.getByRole("img", { name: "40 of 15 min today" })).toBeInTheDocument();
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

    expect(mockUseGetPracticeStreakQuery).toHaveBeenLastCalledWith({
      groupBy: PracticeStreakGroupBy.WEEK,
    });
    expect(screen.getByText("Week").closest("button")).toHaveAttribute("aria-checked", "true");
  });

  it("keeps the full timeline collapsed until the header is clicked", () => {
    render(<PracticeStreakHeatmap />);

    const header = screen.getByRole("button", { expanded: false });
    // The full, scrollable timeline is hidden (aria-hidden) while collapsed.
    expect(
      screen.queryByRole("list", { name: "Practice minutes heatmap" }),
    ).not.toBeInTheDocument();

    fireEvent.click(header);

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list", { name: "Practice minutes heatmap" })).toBeInTheDocument();
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
