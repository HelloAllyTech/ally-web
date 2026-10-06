import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

import type { StickinessResponse } from "@types";

import type { PracticeQualityResponse } from "../../practiceQualityChart";

const practiceQualityMock = vi.fn();

const idleQuery = () => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
});

// Full replacement: the section reads three hooks off the barrel — its own
// endpoint, the language list, and the saved per-chart controls.
vi.mock("@api", () => ({
  useGetPracticeQualityQuery: (args: unknown, opts: unknown) => practiceQualityMock(args, opts),
  useGetScenarioLanguagesQuery: () => ({
    ...idleQuery(),
    data: [
      { value: "en-IN", label: "English (India)" },
      { value: "hi-IN", label: "Hindi" },
    ],
  }),
  useGetChartPreferencesQuery: () => ({ ...idleQuery(), data: { preferences: [] } }),
  useSaveChartPreferencesMutation: () => [vi.fn(), idleQuery()],
}));

import { PracticeQualitySection } from "../../PracticeQualitySection";
import { PracticeSpacingCard } from "../../PracticeSpacingCard";

const response: PracticeQualityResponse = {
  window: {
    from: "2026-01-01",
    to: "2026-10-05",
    label: "All time",
    days: 278,
    bucket: "month",
    allTime: true,
    inProgressBucket: "2026-10-01",
    computedAt: "2026-10-05T10:00:00.000Z",
  },
  language: null,
  minSampleSize: 20,
  practiceThresholds: { minLearnerTurns: 3, minDurationMinutes: 2, minLearnerChars: 300 },
  points: [
    {
      bucket: "2026-09-01",
      sessions: 120,
      talkShareSessions: 118,
      talkShareMedianPct: 41.5,
      talkShareP25Pct: 30.2,
      talkShareP75Pct: 52,
      learnerTurnsMedian: 7,
      practiceSessions: 80,
      practicePct: 66.7,
      shortTurnSessions: 22,
      shortTurnsPct: 18.3,
    },
    {
      bucket: "2026-10-01",
      sessions: 12,
      talkShareSessions: 12,
      talkShareMedianPct: null,
      talkShareP25Pct: null,
      talkShareP75Pct: null,
      learnerTurnsMedian: null,
      practiceSessions: 8,
      practicePct: null,
      shortTurnSessions: 2,
      shortTurnsPct: null,
    },
  ],
  summary: {
    sessions: 132,
    talkShareSessions: 130,
    talkShareMedianPct: 42.1,
    talkShareP25Pct: 31,
    talkShareP75Pct: 53.4,
    learnerTurnsMedian: 7.5,
    practiceSessions: 88,
    practicePct: 66.7,
    shortTurnSessions: 24,
    notPracticeShortTurnsPct: 18.2,
  },
  provenance: { derivation: "R7", note: "Compare within one language." },
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2026-10-05T10:00:00.000Z",
};

const lastArgs = () => practiceQualityMock.mock.calls.at(-1)?.[0];

describe("PracticeQualitySection (AAQ-208/209)", () => {
  beforeEach(() => {
    practiceQualityMock.mockReset().mockReturnValue({ ...idleQuery(), data: response });
  });

  it("asks for the saved window, the page's org and every language by default", () => {
    render(<PracticeQualitySection tenantId="t-1" />);

    expect(lastArgs()).toEqual({ range: "all", bucket: "month", tenantId: "t-1" });
  });

  it("narrows to one language from the card's own picker", async () => {
    render(<PracticeQualitySection />);

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
    await userEvent.click(screen.getByRole("option", { name: "Hindi" }));

    expect(lastArgs()).toEqual({ range: "all", bucket: "month", language: "hi-IN" });
  });

  it("states both takeaways and the practice rule from the response", () => {
    render(<PracticeQualitySection />);

    // Card and (closed) detail modal both carry each title.
    expect(screen.getAllByText("Learner talk share per session").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sessions that count as practice").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/In the typical session the learner did 42\.1% of the talking/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("18.2% of sessions had fewer than 3 learner turns — not practice"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /at least 3 learner turns, 2 minutes net of pauses and 300 characters of the learner's own speech/,
      ),
    ).toBeInTheDocument();
    // The script caveat sits on the face of the talk-share card.
    expect(screen.getByText(/Characters per word differ by script/)).toBeInTheDocument();
  });

  it("shows the not-deployed error with a retry when the endpoint fails", () => {
    practiceQualityMock.mockReturnValue({ ...idleQuery(), isError: true });
    render(<PracticeQualitySection />);

    expect(
      screen.getAllByText(/practice-quality endpoint did not respond — it may not be deployed yet/),
    ).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
  });

  it("shows the thin state, not a share, below the sample floor", () => {
    practiceQualityMock.mockReturnValue({
      ...idleQuery(),
      data: {
        ...response,
        points: [],
        summary: {
          ...response.summary,
          sessions: 9,
          talkShareSessions: 9,
          talkShareMedianPct: null,
          practicePct: null,
          notPracticeShortTurnsPct: null,
        },
      },
    });
    render(<PracticeQualitySection />);

    expect(screen.getAllByText("Not enough data to show a trend")).toHaveLength(2);
    expect(
      screen.getByText("Too few sessions to state a share (n = 9 · need 20)"),
    ).toBeInTheDocument();
  });
});

const stickiness = (spacing?: StickinessResponse["spacing"]): StickinessResponse => ({
  qualifyingMinutes: 5,
  steps: [],
  beyondLastStep: 0,
  medianActiveDays: 3,
  minPopulation: 5,
  spacing,
  scoping: { tenantId: null, unscopedSections: [] },
  computedAt: "2026-10-05T10:00:00.000Z",
});

const spacingBlock: NonNullable<StickinessResponse["spacing"]> = {
  window: "all",
  bands: [
    {
      band: "0-1",
      label: "0–1 days",
      minDays: 0,
      maxDays: 1,
      gaps: 120,
      sharePct: 40,
      learners: 50,
    },
    {
      band: "2-6",
      label: "2–6 days",
      minDays: 2,
      maxDays: 6,
      gaps: 90,
      sharePct: 30,
      learners: 40,
    },
    {
      band: "30+",
      label: "30+ days",
      minDays: 30,
      maxDays: null,
      gaps: 90,
      sharePct: 30,
      learners: 20,
    },
  ],
  totalGaps: 300,
  minGapSample: 20,
  learnersWithSessions: 140,
  activeLearners: 90,
  targetDays: 7,
  learnersWithinTarget: 55,
  withinTargetPct: 61.1,
  medianGapDays: 4,
  minLearners: 5,
  provenance: { derivation: "d", note: "n" },
};

describe("PracticeSpacingCard (AAQ-224)", () => {
  it("states the weekly share, all time, with the rhythm-not-effect caveat", () => {
    render(
      <PracticeSpacingCard
        stickiness={stickiness(spacingBlock)}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Practice spacing").length).toBeGreaterThan(0);
    expect(
      screen.getByText("61.1% of active learners practise at least weekly (median gap ≤ 7 days)"),
    ).toBeInTheDocument();
    const caption = screen.getByText(/0–1 days is massed practice/);
    expect(caption).toHaveTextContent(/^All time\./);
    expect(caption).toHaveTextContent("does not show that spacing helps");
  });

  it("says the backend has not caught up when the response has no spacing block", () => {
    render(
      <PracticeSpacingCard
        stickiness={stickiness()}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/returned no spacing figures/)).toBeInTheDocument();
  });

  it("shows the empty state when no learner has a second session", () => {
    render(
      <PracticeSpacingCard
        stickiness={stickiness({
          ...spacingBlock,
          totalGaps: 0,
          activeLearners: 0,
          withinTargetPct: null,
          bands: spacingBlock.bands.map(b => ({ ...b, gaps: 0, sharePct: null, learners: 0 })),
        })}
        loading={false}
        error={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("No learner has two countable sessions yet")).toBeInTheDocument();
  });
});
