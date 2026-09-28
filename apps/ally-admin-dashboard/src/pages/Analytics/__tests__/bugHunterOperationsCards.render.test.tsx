import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// See testingCharts.render.test.tsx: d3 captures requestAnimationFrame at
// import time, and its transitions reach into SVG geometry jsdom lacks.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const useGetBugHunterOperationsMetricsQuery = vi.fn();
vi.mock("@api", () => ({
  useGetBugHunterOperationsMetricsQuery: (args: unknown) =>
    useGetBugHunterOperationsMetricsQuery(args),
}));
vi.mock("@components", () => ({ cellTypes: {} }));

import { BugFindingSource, BugHuntTrigger, BugHunterOperationsMetrics } from "@types";

import { BugHunterOperationsCards } from "../BugHunterOperationsCards";

const tokens = (input = 0, output = 0, runs = 0, costUsd = 0) => ({
  runs,
  inputTokens: input,
  outputTokens: output,
  costUsd,
});
const outcomes = (filed = 0, accepted = 0, declined = 0, undecided = 0) => ({
  filed,
  accepted,
  declined,
  undecided,
});

const fixture: BugHunterOperationsMetrics = {
  windowDays: 30,
  since: "2026-08-29T00:00:00.000Z",
  days: [
    {
      date: "2026-09-27",
      ...outcomes(6, 3, 2, 1),
      bySource: { [BugFindingSource.CODE_REVIEW]: 5, [BugFindingSource.TEST_FAILURE]: 1 },
      byDifficulty: { easy: outcomes(1, 1, 0, 0), hard: outcomes(5, 2, 2, 1), reported: outcomes() },
      breadth: { runs: 2, linesInScope: 4200, filesInScope: 31, commits: 6, deepRuns: 0 },
      tokens: {
        [BugHuntTrigger.SCHEDULED]: tokens(1_000_000, 200_000, 2, 3.5),
        [BugHuntTrigger.MANUAL]: tokens(),
        [BugHuntTrigger.FIX_SESSION]: tokens(300_000, 50_000, 1, 1.25),
      },
    },
  ],
  bySource: [
    { source: BugFindingSource.CODE_REVIEW, ...outcomes(5, 2, 2, 1) },
    { source: BugFindingSource.TEST_FAILURE, ...outcomes(1, 1, 0, 0) },
  ],
  byDifficulty: [
    { difficulty: "easy", ...outcomes(1, 1, 0, 0) },
    { difficulty: "hard", ...outcomes(5, 2, 2, 1) },
    { difficulty: "reported", ...outcomes() },
  ],
  breadth: { runs: 2, linesInScope: 4200, filesInScope: 31, commits: 6, deepRuns: 0 },
  byReporter: [
    { reporter: "agent", filed: 6, accepted: 3, declined: 2 },
    { reporter: "staff", filed: 0, accepted: 0, declined: 0 },
    { reporter: "consumer", filed: 0, accepted: 0, declined: 0 },
  ],
  tokensByModel: [
    { model: "claude-sonnet-5", provider: "anthropic", runs: 3, inputTokens: 1_300_000, outputTokens: 250_000, cacheReadTokens: 400_000 },
  ],
  totals: { ...outcomes(6, 3, 2, 1), inputTokens: 1_300_000, outputTokens: 250_000, costUsd: 4.75, runs: 3 },
};

const filters = { query: { range: "30d" as const }, language: "", onSelectLanguage: () => undefined };

/**
 * Mounts all seven cards with Carbon for real, data shaped as the server
 * returns it. The typechecker cannot see inside a Carbon options object, so a
 * chart can typecheck and still throw on render — this is the check for that.
 */
describe("BugHunterOperationsCards", () => {
  it("renders all seven cards from server-shaped data and asks for the mapped day window", () => {
    useGetBugHunterOperationsMetricsQuery.mockReturnValue({
      data: fixture,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<BugHunterOperationsCards {...filters} />);

    expect(useGetBugHunterOperationsMetricsQuery).toHaveBeenCalledWith({ days: 30 });
    for (const title of [
      "Bugs filed per day",
      "Bugs filed per day, by source",
      "How hard they were to spot",
      "Who raises bugs",
      "Tokens spent per day, by trigger",
      "Code shown to the sweeps per day",
      "Tokens by model",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    // The takeaways carry the acceptance share beside the count.
    expect(screen.getByText("6 filed · 60% of the 5 ruled on were accepted")).toBeInTheDocument();
    expect(screen.getByText(/4,200 lines shown across 2 sweeps · about 286 tokens per line/)).toBeInTheDocument();
  });

  it("shows the empty states rather than blank plots when nothing has run", () => {
    useGetBugHunterOperationsMetricsQuery.mockReturnValue({
      data: { ...fixture, days: [], bySource: [], breadth: null, tokensByModel: [], totals: { ...outcomes(), inputTokens: 0, outputTokens: 0, costUsd: 0, runs: 0 } },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<BugHunterOperationsCards {...filters} />);
    expect(screen.getAllByText("No bugs filed in this window yet.").length).toBeGreaterThan(0);
    expect(screen.getByText(/No sweep in this window has reported how much code/)).toBeInTheDocument();
    expect(screen.getByText(/No per-model usage reported yet/)).toBeInTheDocument();
  });
});
