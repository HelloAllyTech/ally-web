import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
/**
 * The failure-tag aggregate is the one thing on the scoreboard that points
 * effort at a cause. The backend has always returned it and nothing rendered
 * it, so these pin that it appears, that the biggest cause is first, and that
 * an empty window shows nothing rather than an empty heading.
 */

vi.mock("@utils", () => ({}));
vi.mock("@components", () => ({ cellTypes: {} }));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Carbon's chart package is heavy and irrelevant here.
vi.mock("@carbon/charts-react", () => ({ LineChart: () => <div /> }));
vi.mock("../../Analytics/chartKit", () => ({
  ChartCard: ({ children }: any) => <div>{children}</div>,
  ScrollableChart: ({ children }: any) => <div>{children}</div>,
  KpiTile: ({ label, value }: any) => (
    <div>
      {label}: {value}
    </div>
  ),
  buildSource: () => ({}),
  lineOpts: () => ({}),
  single: () => ({}),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  CarbonDropdown: ({ titleText }: any) => <div>{titleText}</div>,
  InlineNotification: ({ title }: any) => <div>{title}</div>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  Tag: ({ children }: any) => <span>{children}</span>,
}));

let scoreboardResult: any;
vi.mock("@api", () => ({
  useGetBuilderScoreboardQuery: () => scoreboardResult,
}));

/* eslint-disable import/first, import/order -- must follow the vi.mock calls,
   which vitest hoists to the top of the file. */
import { BuilderScoreboard } from "../BuilderScoreboard";

const baseData = (failureTags: { tag: string; count: number }[]) => ({
  builds: [
    {
      sessionId: "s1",
      title: "A build",
      repos: ["ally-be"],
      createdAt: new Date().toISOString(),
      outcome: "merged",
      durationHours: 2,
      machineMinutes: 40,
      humanWaitMinutes: 80,
      costUsd: 12.5,
      runCount: 1,
      fixRunCount: 0,
      reviewCommentCount: 1,
      ciFailureCount: 0,
      timeToMergeHours: 6,
      failureTags: [],
    },
  ],
  trends: [],
  totals: {
    builds: 1,
    merged: 1,
    mergeRate: 1,
    totalCostUsd: 12.5,
    medianCostUsd: 12.5,
  },
  failureTags,
});

describe("BuilderScoreboard failure tags", () => {
  beforeEach(() => {
    scoreboardResult = {
      data: baseData([
        { tag: "test_failure", count: 2 },
        { tag: "review_correctness", count: 7 },
        { tag: "review_scope_creep", count: 4 },
      ]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("shows every tag in the window", () => {
    render(<BuilderScoreboard />);
    expect(screen.getByText("Where the losses come from")).toBeInTheDocument();
    expect(screen.getByText("review_correctness")).toBeInTheDocument();
    expect(screen.getByText("test_failure")).toBeInTheDocument();
    expect(screen.getByText("review_scope_creep")).toBeInTheDocument();
  });

  it("puts the biggest cause first", () => {
    render(<BuilderScoreboard />);
    const section = screen
      .getByText("Where the losses come from")
      .closest("section");

    // Each chip is an outer span wrapping a name span and a count span, so the
    // outer one's textContent is "name7". Filtering to text with an underscore
    // and no digits leaves exactly the names, in render order.
    const names = Array.from(section?.querySelectorAll("span") ?? [])
      .map(node => node.textContent ?? "")
      .filter(text => text.includes("_") && !/\d/.test(text));

    expect(names).toEqual([
      "review_correctness",
      "review_scope_creep",
      "test_failure",
    ]);
  });

  it("renders nothing when the window has no failures", () => {
    scoreboardResult = {
      data: baseData([]),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
    render(<BuilderScoreboard />);
    // An empty heading over an empty row of chips is worse than no section.
    expect(screen.queryByText("Where the losses come from")).not.toBeInTheDocument();
  });
});
