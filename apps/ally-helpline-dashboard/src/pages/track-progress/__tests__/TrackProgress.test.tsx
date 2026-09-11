import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TrackProgressDashboard } from "@types";

import { TrackProgress } from "../TrackProgress";

const mockUseGetLearnTrackProgressQuery = vi.fn();
const mockNavigate = vi.fn();
const mockGetNextItem = vi.fn(() => ({
  unwrap: vi.fn().mockResolvedValue({ trackCompleted: false, nextItem: { id: "item-2" } }),
}));

vi.mock("@api", () => ({
  useGetLearnTrackProgressQuery: (args: any) => mockUseGetLearnTrackProgressQuery(args),
  useLazyGetNextTrackItemQuery: () => [mockGetNextItem],
}));

vi.mock("react-router-dom", () => ({
  useParams: () => ({ trackId: "track-1" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      const parts = Object.entries(options)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
      return `${key}(${parts})`;
    },
  }),
}));

vi.mock("@assets", async importOriginal => ({
  ...(await importOriginal<typeof import("@assets")>()),
  ArrowRight: () => <span data-testid="arrow-right" />,
}));

vi.mock("@components", () => ({
  CustomCircularProgress: () => <div data-testid="circular-progress" />,
}));

const baseDashboard: TrackProgressDashboard = {
  trackId: "track-1",
  title: "De-escalation Basics",
  trackEnrollmentId: "enr-1",
  totalItems: 4,
  completedItems: 2,
  completionPct: 50,
  startedAt: "2026-08-01T00:00:00.000Z",
  completedAt: null,
  lastActivityAt: "2026-08-05T00:00:00.000Z",
  sections: [
    { id: "sec-1", title: "Section 1", order: 1, completedItems: 2, totalItems: 4 },
  ],
  evaluatedRoleplaySessionCount: 0,
  averageCompositeScore: null,
  skillCategories: [],
  roleplaySessions: [],
};

describe("TrackProgress", () => {
  it("shows a loading state while the dashboard is fetching", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { container } = render(<TrackProgress />);

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows a not-found state when the dashboard errors (e.g. not enrolled)", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<TrackProgress />);

    expect(screen.getByText("tracks2.progressDashboard.notFound")).toBeInTheDocument();
  });

  it("shows the feedback empty state when no roleplay session has been evaluated yet", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: baseDashboard,
      isLoading: false,
      isError: false,
    });

    render(<TrackProgress />);

    expect(screen.getByText("tracks2.progressDashboard.feedbackEmpty")).toBeInTheDocument();
    expect(screen.queryByText("tracks2.progressDashboard.sessionsHeading")).not.toBeInTheDocument();
  });

  it("renders demonstrated, needs_practice and insufficient_data categories distinctly", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 2,
        skillCategories: [
          {
            category: "Listening Engagement",
            averagePercentage: 90,
            sampleSize: 2,
            classification: "demonstrated",
          },
          {
            category: "Emotional Attunement",
            averagePercentage: 40,
            sampleSize: 2,
            classification: "needs_practice",
          },
          {
            category: "Supportive Engagement",
            averagePercentage: 85,
            sampleSize: 1,
            classification: "insufficient_data",
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<TrackProgress />);

    expect(screen.getByText("Listening Engagement")).toBeInTheDocument();
    expect(
      screen.getByText("tracks2.progressDashboard.classification.demonstrated"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("tracks2.progressDashboard.classification.needs_practice"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("tracks2.progressDashboard.classification.insufficient_data"),
    ).toBeInTheDocument();
  });

  it("links a practice session row out to the existing simulation-summary page", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 1,
        roleplaySessions: [
          {
            trackItemId: "item-1",
            trackItemTitle: "Practice: an upset client",
            scenarioSessionId: "sess-1",
            compositeScore: 80,
            occurredAt: "2026-08-02T00:00:00.000Z",
            evaluationMarkdown: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<TrackProgress />);

    screen.getByText("Practice: an upset client").closest("button")?.click();
    expect(mockNavigate).toHaveBeenCalledWith("/simulation-summary/sess-1");
  });

  it("draws a score trend only once there are at least 2 evaluated sessions", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 1,
        skillCategories: [
          { category: "Listening Engagement", averagePercentage: 80, sampleSize: 1, classification: "insufficient_data" },
        ],
        roleplaySessions: [
          {
            trackItemId: "item-1",
            trackItemTitle: "Session 1",
            scenarioSessionId: "sess-1",
            compositeScore: 60,
            occurredAt: "2026-08-01T00:00:00.000Z",
            evaluationMarkdown: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const { container, rerender } = render(<TrackProgress />);
    expect(container.querySelector('svg[role="img"]')).not.toBeInTheDocument();

    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 2,
        skillCategories: [
          { category: "Listening Engagement", averagePercentage: 80, sampleSize: 2, classification: "demonstrated" },
        ],
        roleplaySessions: [
          {
            trackItemId: "item-1",
            trackItemTitle: "Session 1",
            scenarioSessionId: "sess-1",
            compositeScore: 60,
            occurredAt: "2026-08-01T00:00:00.000Z",
            evaluationMarkdown: null,
          },
          {
            trackItemId: "item-1",
            trackItemTitle: "Session 2",
            scenarioSessionId: "sess-2",
            compositeScore: 80,
            occurredAt: "2026-08-02T00:00:00.000Z",
            evaluationMarkdown: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
    rerender(<TrackProgress />);

    expect(container.querySelector('svg[role="img"]')).toBeInTheDocument();
  });

  it("shows a preview of the latest session's feedback linking out to the full page", () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 1,
        roleplaySessions: [
          {
            trackItemId: "item-1",
            trackItemTitle: "Session 1",
            scenarioSessionId: "sess-1",
            compositeScore: 60,
            occurredAt: "2026-08-01T00:00:00.000Z",
            evaluationMarkdown: "## What worked\nGreat rapport building throughout the call.",
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<TrackProgress />);

    expect(screen.getByText(/Great rapport building/)).toBeInTheDocument();
    screen.getByText("tracks2.progressDashboard.readFullFeedback").click();
    expect(mockNavigate).toHaveBeenCalledWith("/simulation-summary/sess-1");
  });

  it("nudges toward the weakest needs_practice category and continues into the next item on click", async () => {
    mockUseGetLearnTrackProgressQuery.mockReturnValue({
      data: {
        ...baseDashboard,
        evaluatedRoleplaySessionCount: 2,
        skillCategories: [
          { category: "Listening Engagement", averagePercentage: 90, sampleSize: 2, classification: "demonstrated" },
          { category: "Emotional Attunement", averagePercentage: 40, sampleSize: 2, classification: "needs_practice" },
        ],
      },
      isLoading: false,
      isError: false,
    });

    render(<TrackProgress />);

    const nudge = screen.getByText("tracks2.progressDashboard.practiceNudge(category:Emotional Attunement)");
    expect(nudge).toBeInTheDocument();

    screen.getByText("common.continue").click();

    expect(mockGetNextItem).toHaveBeenCalledWith({ trackId: "track-1" });
  });
});
