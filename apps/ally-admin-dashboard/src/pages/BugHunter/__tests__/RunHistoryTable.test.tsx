import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BugHuntRunStatus, BugHuntTrigger } from "@types";

import { RunHistoryTable } from "../RunHistoryTable";

const getRuns = vi.fn();
const getRun = vi.fn();

vi.mock("@api", () => ({
  useGetBugHuntRunsQuery: (...args: unknown[]) => getRuns(...args),
  useGetBugHuntRunQuery: (id: string) => getRun(id),
}));

vi.mock("@hooks", () => ({
  useBugHuntStream: () => ({ events: [], status: null, isConnected: false }),
}));

vi.mock("@utils", () => ({ formatDate: (d: string) => d }));
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
    const { rerender } = render(<RunHistoryTable />);

    fireEvent.click(screen.getByText("ally-web"));
    rerender(<RunHistoryTable />);

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
    const { rerender } = render(<RunHistoryTable />);

    fireEvent.click(screen.getByText("ally-web"));
    rerender(<RunHistoryTable />);
    expect(screen.getByText(/detail of run-b/)).toBeInTheDocument();

    // A poll lands with a newer run prepended.
    mockRuns([run("run-c", "ally-ai"), run("run-a", "ally-be"), run("run-b", "ally-web")]);
    rerender(<RunHistoryTable />);

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
    const { rerender } = render(<RunHistoryTable />);

    fireEvent.click(screen.getByText("ally-web"));
    rerender(<RunHistoryTable />);
    const detailNodeBefore = screen.getByText(/detail of run-b/).closest("tr");

    mockRuns([run("run-c", "ally-ai"), run("run-a", "ally-be"), run("run-b", "ally-web")]);
    rerender(<RunHistoryTable />);
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
    render(<RunHistoryTable />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("92,100 in / 36,300 out")).toBeInTheDocument();
  });

  it("collapses on a second click", () => {
    mockRuns([run("run-a", "ally-be")]);
    const { rerender } = render(<RunHistoryTable />);

    fireEvent.click(screen.getByText("ally-be"));
    rerender(<RunHistoryTable />);
    expect(screen.getByText(/detail of run-a/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("ally-be"));
    rerender(<RunHistoryTable />);
    expect(screen.queryByText(/detail of run-a/)).not.toBeInTheDocument();
  });
});
