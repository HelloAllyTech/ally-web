import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  RoadmapOpportunitiesResponse,
  RoadmapOpportunity,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

// The board is a table shell around several heavy children. Stub the ones that pull @api / the
// store in, so this stays a test of the pagination footer rather than of the whole page.
vi.mock("../useAllocateCoins", () => ({
  useAllocateCoins: () => vi.fn(),
}));

vi.mock("../CoinAllocator", () => ({
  CoinAllocator: () => null,
}));

vi.mock("../RoadmapAdvancedFilters", () => ({
  RoadmapAdvancedFilters: () => null,
}));

vi.mock("@icons", () => ({
  SortAscending: () => null,
  SortDescending: () => null,
  Close: () => null,
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  EmptyState: ({ title, subtitle, actionLabel }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
      {actionLabel ? <button>{actionLabel}</button> : null}
    </div>
  ),
  ListToolbar: () => null,
  // The facet popover. Its own wiring is covered by RoadmapFilterBar.test.tsx and
  // filterSelection.test.ts; here it only has to resolve to a component, since the filter bar
  // renders it unconditionally and lets it decide whether it is open.
  FilterDropdown: () => null,
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, onClick }: any) => <td onClick={onClick}>{children}</td>,
  TableContainer: ({ children }: any) => <div>{children}</div>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children, onClick }: any) => <tr onClick={onClick}>{children}</tr>,
  SkeletonText: () => <div data-testid="skeleton" />,
}));

import { OpportunitiesBoard } from "../OpportunitiesBoard";
import { EMPTY_ADVANCED_FILTERS } from "../utils/filters";

const PAGE_SIZE = 50;

const row = (n: number, source: RoadmapOpportunitySource = RoadmapOpportunitySource.STAFF): RoadmapOpportunity => ({
  id: `opp-${n}`,
  description: `Opportunity ${n}`,
  type: RoadmapOpportunityType.IDEA,
  stage: RoadmapOpportunityStage.NEW,
  productGoal: "Engagement & Usability",
  owner: null,
  prd: null,
  claudePrompt: null,
  releasedAt: null,
  priorityScore: n,
  myCoins: 0,
  commentCount: 0,
  source,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  creator: null,
});

const response = (
  items: number,
  count: number,
  sources?: RoadmapOpportunitySource[],
): RoadmapOpportunitiesResponse => ({
  items: Array.from({ length: items }, (_, i) => row(i + 1, sources?.[i])),
  count,
  maxScore: 12,
  periodKey: "2026-08",
});

const renderBoard = (overrides: Partial<React.ComponentProps<typeof OpportunitiesBoard>> = {}) => {
  const onOffsetChange = vi.fn();
  render(
    <OpportunitiesBoard
      listArgs={{ limit: PAGE_SIZE, offset: 0 }}
      data={response(PAGE_SIZE, 184)}
      isLoading={false}
      isFetching={false}
      goals={[]}
      search=""
      onSearchChange={vi.fn()}
      typeFilter={[]}
      onTypeFilterChange={vi.fn()}
      stageFilter={[]}
      onStageFilterChange={vi.fn()}
      sourceFilter={[]}
      onSourceFilterChange={vi.fn()}
      goalFilter={[]}
      onGoalFilterChange={vi.fn()}
      ownerFilter={[]}
      onOwnerFilterChange={vi.fn()}
      advanced={{ ...EMPTY_ADVANCED_FILTERS }}
      onAdvancedChange={vi.fn()}
      onManageGoals={vi.fn()}
      sortBy="priority"
      order="DESC"
      onToggleSort={vi.fn()}
      canVote
      canManage={false}
      onOpenOpportunity={vi.fn()}
      onAddClick={vi.fn()}
      selectedIds={new Set()}
      onToggleSelected={vi.fn()}
      onSplit={vi.fn()}
      offset={0}
      pageSize={PAGE_SIZE}
      onOffsetChange={onOffsetChange}
      {...overrides}
    />,
  );
  return { onOffsetChange };
};

describe("OpportunitiesBoard pagination", () => {
  it("reports the visible range, not just the page size", () => {
    renderBoard();
    // The bug this replaces: the footer read "50 of 184" with no way to reach the other 134.
    expect(screen.getByText(/Showing 1–50 of 184 opportunities/)).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();
  });

  it("advances by a page and cannot go back from the first one", () => {
    const { onOffsetChange } = renderBoard();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onOffsetChange).toHaveBeenCalledWith(50);
  });

  it("stops at the last page", () => {
    const { onOffsetChange } = renderBoard({
      offset: 150,
      data: response(34, 184),
      listArgs: { limit: PAGE_SIZE, offset: 150 },
    });
    expect(screen.getByText(/Showing 151–184 of 184 opportunities/)).toBeInTheDocument();
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onOffsetChange).toHaveBeenCalledWith(100);
  });

  it("hides the controls when everything fits on one page", () => {
    renderBoard({ data: response(12, 12) });
    expect(screen.getByText(/Showing 1–12 of 12 opportunities/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  it("keeps a way back when the list shrinks under an offset past the end", () => {
    // A realtime delete or a merge can leave the current page empty. That must read as a paging
    // problem with Previous still live — not as "file the first opportunity".
    const { onOffsetChange } = renderBoard({ offset: 150, data: response(0, 20) });
    expect(screen.getByText("Nothing on this page")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New opportunity" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onOffsetChange).toHaveBeenCalledWith(100);
  });

  it("still offers the first-opportunity action on a genuinely empty board", () => {
    renderBoard({ data: response(0, 0) });
    expect(screen.getByText("No opportunities yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New opportunity" })).toBeInTheDocument();
  });
});

describe("OpportunitiesBoard row content", () => {
  it("badges a consumer-filed row but not a staff-filed one", () => {
    renderBoard({
      data: response(2, 2, [RoadmapOpportunitySource.CONSUMER, RoadmapOpportunitySource.STAFF]),
    });

    // Exactly one badge in the table — the consumer row's, not the staff row's (the common case
    // stays unbadged). Scoped to the table so that if a Source chip is ever rendered above it,
    // its "Consumer" label isn't counted.
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Consumer")).toHaveLength(1);
  });

  it("reads the goal on the row's meta line, with no column of its own", () => {
    // The goal moved out of a w-40 column because long names ("Roleplay Actor Build Time") wrapped
    // to two lines and set the height of every row. It has to stay visible on the row — a filter
    // people sort and scan by cannot retreat into the drawer.
    renderBoard({ data: response(1, 1) });

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Opportunity" }),
    ).toBeInTheDocument();
    expect(within(table).queryByRole("columnheader", { name: "Goal" })).not.toBeInTheDocument();
    expect(within(table).getByText(/Engagement & Usability/)).toBeInTheDocument();
  });
});
