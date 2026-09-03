import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useGetBugHunterMetricsQuery = vi.fn();

vi.mock("@api", () => ({
  useGetBugHunterMetricsQuery: (args: unknown) => useGetBugHunterMetricsQuery(args),
}));

vi.mock("@assets", () => ({ TooltipIcon: () => <span data-testid="tooltip-icon" /> }));

// See BugFindingsTable's note: @constants reads `cellTypes` off this barrel at
// module-eval time, so it is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // Renders the label so the "what does this number mean" copy is assertable —
  // on this panel the tooltips are load-bearing, since every figure has to
  // state its own denominator somewhere.
  Tooltip: ({ label, children }: any) => (
    <span>
      <span data-testid="tooltip">{label}</span>
      {children}
    </span>
  ),
}));

import { BugHunterFunnel, BugHunterMetrics } from "@types";

import { AccuracyPanel } from "../AccuracyPanel";

const funnel = (over: Partial<BugHunterFunnel> = {}): BugHunterFunnel => ({
  key: "all",
  filed: 0,
  dismissed: 0,
  rejected: 0,
  approved: 0,
  merged: 0,
  released: 0,
  failed: 0,
  open: 0,
  finderErrors: 0,
  reasonNotRecorded: 0,
  accuracy: null,
  lowConfidence: 0,
  unscored: 0,
  ...over,
});

const metrics = (over: Partial<BugHunterMetrics> = {}): BugHunterMetrics => ({
  windowDays: 30,
  since: new Date("2026-08-03").toISOString(),
  totalFiled: 0,
  overall: funnel(),
  bySource: [],
  byRepo: [],
  declines: [],
  latency: {
    filedToDecided: { medianHours: null, p90Hours: null, sampled: 0 },
    filedToMerged: { medianHours: null, p90Hours: null, sampled: 0 },
    mergedToReleased: { medianHours: null, p90Hours: null, sampled: 0 },
  },
  regressions: { filed: 0, fixesThatFailed: 0, rate: null },
  cost: {
    totalUsd: 0,
    runs: 0,
    fixSessionRuns: 0,
    fixSessionUsd: 0,
    perMergedFixUsd: null,
  },
  ...over,
});

const mount = (data: BugHunterMetrics | undefined, state: Partial<{ isLoading: boolean; isError: boolean }> = {}) => {
  useGetBugHunterMetricsQuery.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  });
  return render(<AccuracyPanel />);
};

/**
 * The failure mode this panel is designed against is not being WRONG — it is
 * being thin and reading as reassuring. Most of these cases are about the
 * numbers it refuses to print.
 */
describe("AccuracyPanel", () => {
  beforeEach(() => {
    useGetBugHunterMetricsQuery.mockReset();
  });

  it("says there is not enough to go on rather than printing 0%", () => {
    // The single most misleading number this could show. A young install has
    // findings and no decisions; "0%" would be read as the agent being wrong
    // every time, which is the opposite of what a null rate means.
    mount(metrics({ overall: funnel({ filed: 12, open: 12, accuracy: null }) }));

    expect(screen.getByText("Not enough decisions yet")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("prints the rate once decisions exist, with the counts behind it", () => {
    mount(
      metrics({
        overall: funnel({
          filed: 20,
          rejected: 10,
          approved: 10,
          finderErrors: 1,
          accuracy: 0.95,
        }),
      }),
    );

    expect(screen.getByText("95%")).toBeInTheDocument();
    // The denominator is stated, not implied.
    expect(screen.getByText("1 of 20 I got wrong")).toBeInTheDocument();
  });

  it("names the decisions it could not use instead of quietly folding them in", () => {
    // Rows declined before the reason column existed carry no evidence either
    // way. A metric that assumed the missing half was the flattering half
    // would be worse than the gap.
    mount(
      metrics({
        overall: funnel({
          filed: 10,
          rejected: 7,
          reasonNotRecorded: 5,
          finderErrors: 1,
          accuracy: 0.5,
        }),
      }),
    );

    expect(
      screen.getByText(/5 older decision\(s\) have no reason stored/),
    ).toBeInTheDocument();
  });

  it("shows an empty state before anything has been filed", () => {
    mount(metrics({ overall: funnel({ filed: 0 }) }));

    expect(screen.getByText("Nothing to measure yet")).toBeInTheDocument();
  });

  it("reports a stage nothing has passed through as nothing yet, not as zero hours", () => {
    mount(
      metrics({
        overall: funnel({ filed: 5, open: 5 }),
        latency: {
          filedToDecided: { medianHours: 3, p90Hours: 9, sampled: 4 },
          filedToMerged: { medianHours: null, p90Hours: null, sampled: 0 },
          mergedToReleased: { medianHours: null, p90Hours: null, sampled: 0 },
        },
      }),
    );

    expect(screen.getAllByText("nothing yet").length).toBe(2);
    expect(screen.getByText(/3h median · 9h at worst/)).toBeInTheDocument();
  });

  it("reads a long latency in days rather than a number you have to divide", () => {
    mount(
      metrics({
        overall: funnel({ filed: 5 }),
        latency: {
          filedToDecided: { medianHours: 60, p90Hours: 200, sampled: 9 },
          filedToMerged: { medianHours: null, p90Hours: null, sampled: 0 },
          mergedToReleased: { medianHours: null, p90Hours: null, sampled: 0 },
        },
      }),
    );

    expect(screen.getByText(/3d median · 8d at worst/)).toBeInTheDocument();
  });

  it("withholds cost per fix and the regression rate until something has landed", () => {
    mount(
      metrics({
        overall: funnel({ filed: 6, open: 6 }),
        cost: {
          totalUsd: 40,
          runs: 9,
          fixSessionRuns: 3,
          fixSessionUsd: 40,
          perMergedFixUsd: null,
        },
        regressions: { filed: 1, fixesThatFailed: 0, rate: null },
      }),
    );

    // Both tiles present, both refusing to divide by nothing.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("separates declines that were my fault from declines that were your call", () => {
    mount(
      metrics({
        overall: funnel({ filed: 9, rejected: 9, approved: 0, finderErrors: 2, accuracy: 0.78 }),
        declines: [
          { reason: "wont_fix" as never, count: 7, finderError: false },
          { reason: "not_a_bug" as never, count: 2, finderError: true },
        ],
      }),
    );

    expect(screen.getByText("Real, but not worth fixing")).toBeInTheDocument();
    expect(screen.getByText("It isn't a bug")).toBeInTheDocument();
  });

  it("labels a repo-less group rather than showing a blank row", () => {
    // A human-reported bug has no repo until something triages it, and those
    // are exactly the rows worth seeing grouped.
    mount(
      metrics({
        overall: funnel({ filed: 3 }),
        byRepo: [funnel({ key: null, filed: 3 }), funnel({ key: "ally-be", filed: 8 })],
      }),
    );

    expect(screen.getByText("Not yet assigned")).toBeInTheDocument();
  });

  it("asks the backend for the window the reader picked", () => {
    mount(metrics({ overall: funnel({ filed: 4 }) }));

    fireEvent.click(screen.getByText("90 days"));

    expect(useGetBugHunterMetricsQuery).toHaveBeenLastCalledWith({ days: 90 });
  });

  it("offers a retry rather than an empty panel when the fetch fails", () => {
    // The recurring defect this module's own audit flagged: a failed fetch
    // that renders as a legitimate empty state.
    mount(undefined, { isError: true });

    expect(screen.getByText("Couldn't load the accuracy figures.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing to measure yet")).not.toBeInTheDocument();
  });
});
