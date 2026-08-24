import { fireEvent, render, screen } from "@testing-library/react";
import { FC } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BugHuntRunStatus, BugHuntTrigger } from "@types";

import { RunHistoryTable } from "../RunHistoryTable";

const getRuns = vi.fn();
const getRun = vi.fn();

vi.mock("@api", () => ({
  useGetBugHuntRunsQuery: (...args: unknown[]) => getRuns(...args),
  useGetBugHuntRunQuery: (id: string) => getRun(id),
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
}));

/**
 * A router, because the "Found" count writes `?run=` through
 * `useBugHunterUrlState` now. Real rather than mocked: the assertion worth
 * making is that clicking the count lands the param in the URL, and a stubbed
 * hook would only assert that a spy was called.
 */
const renderTable = (ui = <RunHistoryTable />, entry = "/bug-hunter") =>
  render(<MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>);

/**
 * Renders the router's query string, so a click's effect on the URL is
 * assertable.
 *
 * `MemoryRouter` keeps its own history rather than touching `window.location`,
 * so there is no address bar to read — and asserting a spy was called would
 * only prove the handler ran, not that the param it wrote is the one the bugs
 * table reads.
 */
const SearchProbe: FC = () => <span data-testid="search">{useLocation().search}</span>;
vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));

// @constants reads `cellTypes` off the @components barrel at module-eval time,
// which drags the real store in. Same stub, same reason, as the other tests here.
vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children }: any) => <th>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick, className }: any) => (
    <tr onClick={onClick} className={className}>
      {children}
    </tr>
  ),
  TableCell: ({ children, colSpan }: any) => <td colSpan={colSpan}>{children}</td>,
}));

const run = (id: string, repo: string) => ({
  id,
  repo,
  trigger: BugHuntTrigger.MANUAL,
  status: BugHuntRunStatus.COMPLETED,
  foundCount: 0,
  autoMergedCount: 0,
  prOpenedCount: 0,
  dismissedCount: 0,
  totalTokenCostUsd: "0.0000",
  cliReportedCostUsd: null,
  totalInputTokens: null,
  totalOutputTokens: null,
  createdAt: "13 Aug 2026",
});

/** The row index of a cell's owning <tr>, for asserting where a row landed. */
const rowIndexOf = (text: string | RegExp) => {
  const rows = [...document.querySelectorAll("tbody tr")];
  return rows.findIndex(r =>
    typeof text === "string" ? r.textContent?.includes(text) : text.test(r.textContent ?? ""),
  );
};

describe("RunHistoryTable — expanded run detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRun.mockImplementation((id: string) => ({
      data: {
        id,
        events: [
          { id: `${id}-event`, stage: "merged", summary: `detail of ${id}`, createdAt: "x" },
        ],
      },
      isLoading: false,
      isError: false,
    }));
  });

  const mockRuns = (runs: ReturnType<typeof run>[]) =>
    getRuns.mockReturnValue({
      data: { items: runs, count: runs.length },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

  it("opens the detail directly beneath the run it belongs to", () => {
    mockRuns([run("run-a", "ally-be"), run("run-b", "ally-web")]);
    const { rerender } = renderTable();

    fireEvent.click(screen.getByText("ally-web"));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );

    expect(rowIndexOf("detail of run-b")).toBe(rowIndexOf("ally-web") + 1);
  });

  /**
   * The table polls every 10s, so the list can grow under an open row. Every
   * cell is a pure function of its run, so this much held even unkeyed — it is
   * here as the behavioural guarantee, not as the guard on the key. What the key
   * actually buys is the test below it.
   */
  it("keeps the detail with its own run when a new run arrives at the top", () => {
    mockRuns([run("run-a", "ally-be"), run("run-b", "ally-web")]);
    const { rerender } = renderTable();

    fireEvent.click(screen.getByText("ally-web"));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );
    expect(screen.getByText(/detail of run-b/)).toBeInTheDocument();

    // A poll lands with a newer run prepended.
    mockRuns([run("run-c", "ally-ai"), run("run-a", "ally-be"), run("run-b", "ally-web")]);
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );

    // Still run-b's detail, still directly under run-b — not under the newcomer.
    expect(screen.getByText(/detail of run-b/)).toBeInTheDocument();
    expect(rowIndexOf("detail of run-b")).toBe(rowIndexOf("ally-web") + 1);
    expect(rowIndexOf("ally-ai")).toBe(0);
    expect(screen.queryByText(/detail of run-c/)).not.toBeInTheDocument();
  });

  /**
   * The real cost of the keyless fragment, and so the real guard on the fix.
   * When a run arrives at the top, every row below it shifts position. Keyed by
   * id, React moves the existing rows — the expanded detail keeps its DOM node,
   * and with it its mounted component: no torn-down request subscription, no
   * loading flash on every poll. Unkeyed, React matched by position instead and
   * rebuilt that row from scratch, which is invisible in the rendered values and
   * exactly why this went unnoticed as console noise.
   */
  it("moves the expanded detail row rather than rebuilding it", () => {
    mockRuns([run("run-a", "ally-be"), run("run-b", "ally-web")]);
    const { rerender } = renderTable();

    fireEvent.click(screen.getByText("ally-web"));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );
    const detailNodeBefore = screen.getByText(/detail of run-b/).closest("tr");

    mockRuns([run("run-c", "ally-ai"), run("run-a", "ally-be"), run("run-b", "ally-web")]);
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );
    const detailNodeAfter = screen.getByText(/detail of run-b/).closest("tr");

    // The very same element, one position further down — moved, not remade.
    expect(detailNodeAfter).toBe(detailNodeBefore);
  });

  // No test asserts the absence of React's key warning: React dedupes it per
  // component type, so the first render in this file consumes it and any later
  // assertion passes whether or not the key is there. The guard is the test
  // above, which fails on the reconciliation itself.

  it("shows a dash for runs closed before token counts were tracked, and a formatted count otherwise", () => {
    mockRuns([
      run("run-a", "ally-be"),
      { ...run("run-b", "ally-web"), totalInputTokens: 92100, totalOutputTokens: 36300 },
    ]);
    renderTable();

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("92,100 in / 36,300 out")).toBeInTheDocument();
  });

  it("collapses on a second click", () => {
    mockRuns([run("run-a", "ally-be")]);
    const { rerender } = renderTable();

    fireEvent.click(screen.getByText("ally-be"));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );
    expect(screen.getByText(/detail of run-a/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("ally-be"));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/detail of run-a/)).not.toBeInTheDocument();
  });
});

/**
 * The "Found" count as the route into the bugs behind it.
 *
 * The defect this closes: a sweep reported ten found and the bugs table, sorted
 * newest-first, showed none of them — because most of what a sweep touches is
 * human-reported bugs it re-reads, whose rows were created weeks earlier. The
 * count was right and unreachable, which reads as the count being wrong.
 */
describe("RunHistoryTable — the Found count links to that sweep's bugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRun.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  });

  const mockRuns = (runs: ReturnType<typeof run>[]) =>
    getRuns.mockReturnValue({
      data: { items: runs, count: runs.length },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

  const found = (id: string, repo: string, foundCount: number) => ({
    ...run(id, repo),
    foundCount,
  });

  it("writes ?run=<id>, which is what scopes the bugs table", () => {
    mockRuns([found("run-a", "ally-ai-learn", 10)]);
    renderTable(
      <>
        <RunHistoryTable />
        <SearchProbe />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Show the 10 bugs/ }));

    expect(screen.getByTestId("search").textContent).toBe("?run=run-a");
  });

  it("clears the other filters, so the count means what the log says it means", () => {
    mockRuns([found("run-a", "ally-be", 3)]);
    renderTable(
      <>
        <RunHistoryTable />
        <SearchProbe />
      </>,
      "/bug-hunter?sev=high&bucket=closed",
    );

    fireEvent.click(screen.getByRole("button", { name: /Show the 3 bugs/ }));

    // Intersecting "the 3 that sweep found" with a severity filter left over
    // from earlier shows one row while the log still says three.
    expect(screen.getByTestId("search").textContent).toBe("?run=run-a");
  });

  it("does not expand the run's event timeline as a side effect", () => {
    mockRuns([found("run-a", "ally-be", 4)]);
    getRun.mockReturnValue({
      data: { id: "run-a", events: [{ id: "e", stage: "merged", summary: "detail of run-a", createdAt: "x" }] },
      isLoading: false,
      isError: false,
    });
    const { rerender } = renderTable();

    fireEvent.click(screen.getByRole("button", { name: /Show the 4 bugs/ }));
    rerender(
      <MemoryRouter>
        <RunHistoryTable />
      </MemoryRouter>,
    );

    // The row's own onClick toggles the timeline. Scoping the table and
    // scrolling away from a detail row that just opened is one gesture doing two
    // things, so the cell stops the click.
    expect(screen.queryByText(/detail of run-a/)).not.toBeInTheDocument();
  });

  it("leaves a zero count as plain text, with nothing to click", () => {
    mockRuns([found("run-a", "ally-be", 0)]);
    renderTable();

    // A link to an empty table teaches a reader that these links are unreliable.
    expect(screen.queryByRole("button", { name: /Show the 0 bugs/ })).not.toBeInTheDocument();
    expect(screen.getByText("ally-be")).toBeInTheDocument();
  });
});
