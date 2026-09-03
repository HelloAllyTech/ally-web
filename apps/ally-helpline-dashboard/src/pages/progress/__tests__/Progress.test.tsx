import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseGetProgressQuery,
  mockUseGetCurrentUserQuery,
  mockUseProgressSummary,
  mockUsePracticeStreakSummary,
  mockUseUser,
  mockNavigate,
} = vi.hoisted(() => ({
  mockUseGetProgressQuery: vi.fn(),
  mockUseGetCurrentUserQuery: vi.fn(),
  mockUseProgressSummary: vi.fn(),
  mockUsePracticeStreakSummary: vi.fn(),
  mockUseUser: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetProgressQuery: (...args: any[]) => mockUseGetProgressQuery(...args),
  useGetCurrentUserQuery: (...args: any[]) => mockUseGetCurrentUserQuery(...args),
}));

vi.mock("@hooks", () => ({
  useProgressSummary: () => mockUseProgressSummary(),
  usePracticeStreakSummary: () => mockUsePracticeStreakSummary(),
  useUser: () => mockUseUser(),
}));

vi.mock("@components", () => ({
  FallbackUI: ({ mainMessage, button }: any) => (
    <div data-testid="fallback-ui">
      <span>{mainMessage}</span>
      <button onClick={button?.onClick}>{button?.text}</button>
    </div>
  ),
  LevelIndicator: ({ level }: any) => <div data-testid="level-indicator">{level}</div>,
  PracticeStreakHeatmap: () => <div data-testid="practice-streak-heatmap" />,
}));

// Exhaustive on purpose. A vi.mock factory replaces the whole module, and importing
// anything from @constants transitively pulls in routes.ts (nav icons) and common.ts
// (carousel images) — an asset missing here resolves to undefined and React throws.
vi.mock("@assets", () => ({
  NoResults: () => <svg data-testid="no-results" />,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  StatsIcon: () => <svg />,
  ScribeIcon: () => <svg />,
  ScenarioIcon: () => <svg />,
  LearnIcon: () => <svg />,
  Leaderboard: () => <svg />,
  ReviewNavIcon: () => <svg />,
  Badge: () => <svg />,
  ManageAccount: () => <svg />,
  CharacterLibraryIcon: () => <svg />,
  ProgressLadderIcon: () => <svg />,
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: any) => <div data-testid="redirect" data-to={to} />,
}));

import { Progress } from "../Progress";

const PROGRESS = {
  level: 3,
  totalXp: 425,
  xpIntoLevel: 165,
  xpToNextLevel: 91,
  nextLevelXp: 516,
  progress: 0.64,
  isMaxLevel: false,
  lifetimePracticeMinutes: 412,
  sessionsCompleted: 15,
  trackItemsCompleted: 11,
  ladder: [],
  lastLevelUpAt: null,
};

describe("Progress page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({ permissions: ["view:community:leaderboard"] });
    mockUseProgressSummary.mockReturnValue({ canViewProgress: true, isGateLoading: false });
    mockUsePracticeStreakSummary.mockReturnValue({ summary: { currentStreak: 6 } });
    mockUseGetCurrentUserQuery.mockReturnValue({ data: undefined });
    mockUseGetProgressQuery.mockReturnValue({
      data: PROGRESS,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("shows the level, what is left to the next one, and the lifetime total", () => {
    render(<Progress />);

    expect(screen.getByTestId("progress-hero")).toHaveTextContent("Level 3");
    expect(screen.getByTestId("progress-next-level")).toHaveTextContent("91 XP to level 4");
    expect(screen.getByTestId("progress-hero")).toHaveTextContent("425 XP earned in total");
  });

  it("leads with cumulative totals that cannot go down", () => {
    render(<Progress />);

    expect(screen.getByTestId("progress-stat-minutes")).toHaveTextContent("412");
    expect(screen.getByTestId("progress-stat-sessions")).toHaveTextContent("15");
    expect(screen.getByTestId("progress-stat-track-items")).toHaveTextContent("11");
    expect(screen.getByTestId("progress-stat-streak")).toHaveTextContent("6");
  });

  it("replaces the next-level target with a finished message at the top of the ladder", () => {
    mockUseGetProgressQuery.mockReturnValue({
      data: { ...PROGRESS, level: 10, isMaxLevel: true, xpToNextLevel: null, nextLevelXp: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<Progress />);

    expect(screen.getByTestId("progress-next-level")).toHaveTextContent(
      "You've reached the top level",
    );
    expect(screen.getByTestId("progress-next-level")).not.toHaveTextContent("null");
  });

  it("redirects rather than rendering a shell when the org does not have the feature", () => {
    mockUseProgressSummary.mockReturnValue({ canViewProgress: false, isGateLoading: false });

    render(<Progress />);

    expect(screen.getByTestId("redirect")).toHaveAttribute("data-to", "/");
    expect(screen.queryByTestId("progress-hero")).toBeNull();
  });

  it("waits for the gate before redirecting, so a slow toggle read cannot bounce a real user", () => {
    mockUseProgressSummary.mockReturnValue({ canViewProgress: false, isGateLoading: true });

    render(<Progress />);

    expect(screen.queryByTestId("redirect")).toBeNull();
    expect(screen.getByTestId("progress-skeleton")).toBeInTheDocument();
  });

  it("shows the error state instead of an empty dashboard when the load fails", () => {
    const refetch = vi.fn();
    mockUseGetProgressQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<Progress />);

    expect(screen.getByTestId("fallback-ui")).toHaveTextContent("Couldn't load your progress");
    expect(screen.queryByTestId("progress-hero")).toBeNull();
  });

  it("hides the rank line when the org has switched ranking off", () => {
    // `rank` absent is how ally-be signals hideRankInCommunity.
    mockUseGetCurrentUserQuery.mockReturnValue({ data: { rank: undefined, name: "Learner" } });

    render(<Progress />);

    expect(screen.queryByTestId("progress-rank-peek")).toBeNull();
  });

  it("shows the rank line when a rank is available", () => {
    mockUseGetCurrentUserQuery.mockReturnValue({ data: { rank: 4, name: "Learner" } });

    render(<Progress />);

    expect(screen.getByTestId("progress-rank-peek")).toHaveTextContent(
      "You're #4 in your organisation this week",
    );
  });

  it("makes no rank request at all for a user who cannot see the leaderboard", () => {
    mockUseUser.mockReturnValue({ permissions: [] });

    render(<Progress />);

    expect(mockUseGetCurrentUserQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });
});
