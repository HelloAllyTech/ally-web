import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useGetBugHunterOperationsMetricsQuery = vi.fn();

vi.mock("@api", () => ({
  useGetBugHunterOperationsMetricsQuery: (args: unknown) =>
    useGetBugHunterOperationsMetricsQuery(args),
}));

vi.mock("@assets", () => ({ TooltipIcon: () => <span data-testid="tooltip-icon" /> }));

// See BugFindingsTable's note: @constants reads `cellTypes` off this barrel at
// module-eval time, so it is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ label, children }: any) => (
    <span>
      <span data-testid="tooltip">{label}</span>
      {children}
    </span>
  ),
}));

import { BugFindingSource, BugHuntTrigger, BugHunterOperationsMetrics } from "@types";

import { OperationsPanel } from "../OperationsPanel";

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

const day = (
  date: string,
  over: Partial<BugHunterOperationsMetrics["days"][number]> = {},
): BugHunterOperationsMetrics["days"][number] => ({
  date,
  filed: 0,
  accepted: 0,
  declined: 0,
  undecided: 0,
  bySource: {},
  byDifficulty: { easy: outcomes(), hard: outcomes(), reported: outcomes() },
  breadth: null,
  tokens: {
    [BugHuntTrigger.SCHEDULED]: tokens(),
    [BugHuntTrigger.MANUAL]: tokens(),
    [BugHuntTrigger.FIX_SESSION]: tokens(),
  },
  ...over,
});

const metrics = (over: Partial<BugHunterOperationsMetrics> = {}): BugHunterOperationsMetrics => ({
  windowDays: 30,
  since: "2026-08-29T00:00:00.000Z",
  days: [day("2026-09-26"), day("2026-09-27"), day("2026-09-28")],
  bySource: [],
  byDifficulty: [
    { difficulty: "easy", ...outcomes() },
    { difficulty: "hard", ...outcomes() },
    { difficulty: "reported", ...outcomes() },
  ],
  breadth: null,
  byReporter: [
    { reporter: "agent", filed: 0, accepted: 0, declined: 0 },
    { reporter: "staff", filed: 0, accepted: 0, declined: 0 },
    { reporter: "consumer", filed: 0, accepted: 0, declined: 0 },
  ],
  tokensByModel: [],
  totals: {
    filed: 0,
    accepted: 0,
    declined: 0,
    undecided: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    runs: 0,
  },
  ...over,
});

const busy = (): BugHunterOperationsMetrics =>
  metrics({
    days: [
      day("2026-09-26"),
      day("2026-09-27", {
        filed: 6,
        accepted: 3,
        declined: 2,
        undecided: 1,
        bySource: { [BugFindingSource.CODE_REVIEW]: 5, [BugFindingSource.TEST_FAILURE]: 1 },
        byDifficulty: {
          easy: outcomes(1, 1, 0, 0),
          hard: outcomes(5, 2, 2, 1),
          reported: outcomes(),
        },
        breadth: { runs: 2, linesInScope: 4200, filesInScope: 31, commits: 6, deepRuns: 0 },
        tokens: {
          [BugHuntTrigger.SCHEDULED]: tokens(1_000_000, 200_000, 2, 3.5),
          [BugHuntTrigger.MANUAL]: tokens(),
          [BugHuntTrigger.FIX_SESSION]: tokens(300_000, 50_000, 1, 1.25),
        },
      }),
      day("2026-09-28", {
        filed: 2,
        undecided: 2,
        bySource: { [BugFindingSource.CODE_REVIEW]: 2 },
      }),
    ],
    bySource: [
      { source: BugFindingSource.CODE_REVIEW, filed: 7, accepted: 2, declined: 2, undecided: 3 },
      { source: BugFindingSource.TEST_FAILURE, filed: 1, accepted: 1, declined: 0, undecided: 0 },
    ],
    byDifficulty: [
      { difficulty: "easy", ...outcomes(1, 1, 0, 0) },
      { difficulty: "hard", ...outcomes(7, 2, 2, 3) },
      { difficulty: "reported", ...outcomes() },
    ],
    breadth: { runs: 2, linesInScope: 4200, filesInScope: 31, commits: 6, deepRuns: 0 },
    byReporter: [
      { reporter: "agent", filed: 7, accepted: 3, declined: 2 },
      { reporter: "staff", filed: 1, accepted: 0, declined: 0 },
      { reporter: "consumer", filed: 0, accepted: 0, declined: 0 },
    ],
    tokensByModel: [
      {
        model: "claude-opus-5",
        provider: "anthropic",
        runs: 1,
        inputTokens: 900_000,
        outputTokens: 100_000,
        cacheReadTokens: 0,
      },
      {
        model: "claude-sonnet-5",
        provider: "anthropic",
        runs: 3,
        inputTokens: 400_000,
        outputTokens: 150_000,
        cacheReadTokens: 200_000,
      },
    ],
    totals: {
      filed: 8,
      accepted: 3,
      declined: 2,
      undecided: 3,
      inputTokens: 1_300_000,
      outputTokens: 250_000,
      costUsd: 4.75,
      runs: 3,
    },
  });

const mount = (
  data: BugHunterOperationsMetrics | undefined,
  state: Partial<{ isLoading: boolean; isError: boolean }> = {},
) => {
  useGetBugHunterOperationsMetricsQuery.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...state,
  });
  return render(<OperationsPanel />);
};

/**
 * The rule this panel lives by is that a volume figure is never drawn alone,
 * and the rule every chart lives by is that colour never carries a value on
 * its own. Most cases here check one of those two.
 */
describe("OperationsPanel", () => {
  beforeEach(() => {
    useGetBugHunterOperationsMetricsQuery.mockReset();
  });

  it("says nothing was filed rather than drawing an empty axis", () => {
    mount(metrics());
    expect(screen.getByText("Nothing filed in this window")).toBeInTheDocument();
    expect(screen.queryByText("New bugs I filed")).not.toBeInTheDocument();
  });

  it("draws the five sections and pairs the filed count with its accepted share", () => {
    mount(busy());

    expect(screen.getByText("New bugs I filed")).toBeInTheDocument();
    expect(screen.getByText("Where they came from")).toBeInTheDocument();
    expect(screen.getByText("Who raises them")).toBeInTheDocument();
    expect(screen.getByText("Tokens I spent, by day")).toBeInTheDocument();
    expect(screen.getByText("Tokens by model")).toBeInTheDocument();

    // 3 accepted of 5 ruled on — undecided is not in the denominator.
    expect(screen.getByText("60% of these were accepted")).toBeInTheDocument();
  });

  it("legends every stacked chart so identity never rests on colour", () => {
    mount(busy());
    const legends = screen.getAllByLabelText("Legend");
    // Filed-by-outcome, by-source, by-difficulty, tokens-by-trigger. The
    // breadth chart is one series and so, deliberately, has no legend box.
    expect(legends).toHaveLength(4);
    expect(within(legends[0]).getByText("Accepted")).toBeInTheDocument();
    expect(within(legends[1]).getByText("Code review")).toBeInTheDocument();
    expect(within(legends[1]).getByText("Failing test")).toBeInTheDocument();
    // A source that filed nothing in the window gets no series — and no legend entry.
    expect(within(legends[1]).queryByText("Production log")).not.toBeInTheDocument();
    expect(within(legends[2]).getByText("Hard to spot")).toBeInTheDocument();
    expect(within(legends[3]).getByText("Nightly")).toBeInTheDocument();
  });

  it("opens a table view with every day's numbers behind the chart", () => {
    mount(busy());
    const toggles = screen.getAllByRole("button", { name: "Show as table" });
    fireEvent.click(toggles[0]);

    const table = screen.getAllByRole("table")[0];
    const rows = within(table).getAllByRole("row");
    // Header + three days: quiet days are rows too.
    expect(rows).toHaveLength(4);
    expect(within(rows[2]).getByText("27 Sept")).toBeInTheDocument();
    // accepted, declined, undecided, total
    expect(within(rows[2]).getAllByRole("cell").map(cell => cell.textContent)).toEqual([
      "27 Sept",
      "3",
      "2",
      "1",
      "6",
    ]);
    expect(screen.getByRole("button", { name: "Hide table" })).toBeInTheDocument();
  });

  it("shows the accepted share per source, and a dash for a source nobody has ruled on", () => {
    mount(
      metrics({
        ...busy(),
        bySource: [
          { source: BugFindingSource.CODE_REVIEW, filed: 7, accepted: 2, declined: 2, undecided: 3 },
          { source: BugFindingSource.UX_SIGNAL, filed: 4, accepted: 0, declined: 0, undecided: 4 },
        ],
      }),
    );
    const sourceTable = screen
      .getAllByRole("table")
      .find(table => within(table).queryByText("Accepted share"));
    expect(sourceTable).toBeDefined();
    const rows = within(sourceTable!).getAllByRole("row");
    expect(within(rows[1]).getByText("50%")).toBeInTheDocument();
    expect(within(rows[2]).getByText("—")).toBeInTheDocument();
  });

  it("always lists all three reporters, so a zero for consumers is visible", () => {
    mount(busy());
    const list = screen.getByLabelText("Who raises them");
    expect(within(list).getByText("Me")).toBeInTheDocument();
    expect(within(list).getByText("Staff")).toBeInTheDocument();
    expect(within(list).getByText("Consumers")).toBeInTheDocument();
    expect(within(list).getByText("3 accepted · 2 declined")).toBeInTheDocument();
  });

  it("abbreviates tokens and states the window total with its cost", () => {
    mount(busy());
    expect(screen.getByText("1.6M tokens · $5 · 3 runs")).toBeInTheDocument();
    const models = screen.getByLabelText("Tokens by model");
    expect(within(models).getByText("claude-opus-5")).toBeInTheDocument();
    expect(within(models).getByText("900k in / 100k out · 1 runs")).toBeInTheDocument();
  });

  it("splits bugs by how hard they were to spot, with a share per bucket and a dash where nothing was ruled on", () => {
    mount(busy());
    expect(screen.getByText("How hard they were to spot")).toBeInTheDocument();
    const table = screen
      .getAllByRole("table")
      .find(candidate => within(candidate).queryByText("How it was found"));
    const rows = within(table!).getAllByRole("row");
    expect(within(rows[1]).getByText("Easy to spot")).toBeInTheDocument();
    expect(within(rows[1]).getByText("100%")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Hard to spot")).toBeInTheDocument();
    expect(within(rows[2]).getByText("50%")).toBeInTheDocument();
    // Reported: always listed, nothing ruled on → a dash, not 0%.
    expect(within(rows[3]).getByText("Reported by people")).toBeInTheDocument();
    expect(within(rows[3]).getByText("—")).toBeInTheDocument();
  });

  it("draws the code-scope breadth with tokens per line, and says when it was never recorded", () => {
    mount(busy());
    expect(screen.getByText("How much code I was shown, by day")).toBeInTheDocument();
    // 1.2M nightly-sweep tokens over 4,200 lines on the one measured day. The
    // fix session's 350k are left out: it was shown a bug, not a diff.
    expect(
      screen.getByText("4,200 lines shown across 2 sweeps · about 286 tokens per line"),
    ).toBeInTheDocument();

    mount(metrics({ ...busy(), breadth: null }));
    expect(screen.getByText(/None of these sweeps reported how much code/)).toBeInTheDocument();
  });

  it("says per-model usage has not arrived yet instead of drawing nothing", () => {
    mount(metrics({ ...busy(), tokensByModel: [] }));
    expect(screen.getByText(/No per-model usage reported yet/)).toBeInTheDocument();
  });

  it("re-queries when the window changes", () => {
    mount(busy());
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    expect(useGetBugHunterOperationsMetricsQuery).toHaveBeenLastCalledWith({ days: 90 });
  });

  it("offers a retry when the figures do not load", () => {
    mount(undefined, { isError: true });
    expect(screen.getByText("Couldn't load the day-by-day figures.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
