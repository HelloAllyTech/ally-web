import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBugFindings = vi.fn();

vi.mock("@api", () => ({
  useGetBugFindingsQuery: (...args: unknown[]) => getBugFindings(...args),
  useApproveBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useRejectBugFindingMutation: () => [vi.fn(), { isLoading: false }],
  useStartBugFixSessionMutation: () => [vi.fn(), { isLoading: false }],
  useGetBugHuntRunQuery: () => ({ data: undefined }),
}));

vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ title }: any) => <div role="dialog" aria-label={title} />,
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
  logger: { error: vi.fn() },
}));

vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@components/error-boundary", () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock("../BugFindingDrawer", () => ({
  BugFindingDrawer: ({ id }: { id: string }) => <div data-testid="drawer">{id}</div>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Search: ({ id, labelText, value, onChange, placeholder }: any) => (
    <input
      id={id}
      aria-label={labelText}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  // `aria-sort` is the point of several assertions below, so it has to survive
  // the stand-in.
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

import {
  BugFinding,
  BugFindingSeverity,
  BugFindingSource,
  BugFindingStage,
  BugFindingStatus,
} from "@types";

import { BugFindingsTable } from "../BugFindingsTable";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

const finding = (overrides: Partial<BugFinding> & { id: string }): BugFinding =>
  ({
    runId: null,
    repo: "ally-be",
    source: BugFindingSource.CODE_REVIEW,
    title: `Bug ${overrides.id}`,
    description: "…",
    file: null,
    evidence: null,
    severity: null,
    proven: false,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: BugFindingStatus.NEW,
    stage: BugFindingStage.NEW,
    stageIsAuto: true,
    stageOverriddenByName: null,
    stageOverriddenAt: null,
    report: null,
    prUrl: null,
    createdAt: ago(1),
    updatedAt: ago(1),
    ...overrides,
  }) as unknown as BugFinding;

const mount = (
  items: BugFinding[],
  { url = "/", queryState = {} }: { url?: string; queryState?: Record<string, unknown> } = {},
) => {
  getBugFindings.mockReturnValue({
    data: { items, count: items.length },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...queryState,
  });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BugFindingsTable onShowShortcuts={vi.fn()} canTriage />
    </MemoryRouter>,
  );
};

/** Row titles in the order they are rendered — what every sort assertion reads. */
const titles = () =>
  screen
    .getAllByRole("button", { name: /^Open bug: / })
    .map(button => button.textContent ?? "");

const openFilters = () => {
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  return screen.getByRole("dialog", { name: "Filter bugs" });
};

/**
 * The sorting and filtering the table gained in the "narrow 54 bugs to the 8
 * you meant" rebuild: every column sortable, every facet multi-select, both
 * carried in the URL, plus the age/duplicate filters and the paging controls.
 *
 * The pre-existing suites still own what they always did — `…triage` the row
 * actions and the bucket chips, `…keyboard` the cursor, `…runScope` the sweep
 * scope. This file is only the new surface.
 */
describe("BugFindingsTable — sorting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sorts by status in lifecycle order rather than alphabetically", () => {
    mount([
      finding({ id: "shipped", status: BugFindingStatus.RELEASED }),
      finding({ id: "blocked", status: BugFindingStatus.NEEDS_INPUT }),
      finding({ id: "queued", status: BugFindingStatus.APPROVED }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /^Status/ }));

    // "Needs input" before "Approved" before "Released" — the chip row's order,
    // not the alphabet's, which would have put Approved first.
    expect(titles()).toEqual(["Bug blocked", "Bug queued", "Bug shipped"]);
  });

  it("sorts by repo, and keeps repo-less bugs at the bottom in both directions", () => {
    mount([
      finding({ id: "none", repo: null }),
      finding({ id: "web", repo: "ally-web" }),
      finding({ id: "be", repo: "ally-be" }),
    ]);

    const repoHeader = () => screen.getByRole("button", { name: /^Repo/ });

    fireEvent.click(repoHeader());
    expect(titles()).toEqual(["Bug be", "Bug web", "Bug none"]);

    // Flipped, "no repo" is still last — it is absent data, not a value that
    // sorts before "ally-be".
    fireEvent.click(repoHeader());
    expect(titles()).toEqual(["Bug web", "Bug be", "Bug none"]);
  });

  it("sorts by roadmap stage along the ladder", () => {
    mount([
      finding({ id: "released", stage: BugFindingStage.RELEASED }),
      finding({ id: "new", stage: BugFindingStage.NEW }),
      finding({ id: "dev", stage: BugFindingStage.UNDER_DEVELOPMENT }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /^Stage/ }));
    expect(titles()).toEqual(["Bug new", "Bug dev", "Bug released"]);
  });

  it("reports the sort to a screen reader, not just with a caret", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);

    fireEvent.click(screen.getByRole("button", { name: /^Bug\b/ }));
    const header = screen.getByRole("columnheader", { name: /^Bug/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(screen.getByRole("button", { name: /^Bug\b/ }));
    expect(screen.getByRole("columnheader", { name: /^Bug/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  /**
   * The reason sort moved out of `useState`: "the oldest bugs nobody has
   * touched" is a sort plus a filter, and a link that carried only the filter
   * handed the recipient the same rows in a different order, silently.
   */
  it("reads the sort out of the address bar, so a sorted view is linkable", () => {
    mount(
      [
        finding({ id: "b", title: "Bravo" }),
        finding({ id: "a", title: "Alpha" }),
      ],
      { url: "/?sort=title&dir=asc" },
    );
    expect(titles()).toEqual(["Alpha", "Bravo"]);
  });
});

describe("BugFindingsTable — the filter panel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters by status, which the bucket chips are too coarse to do", () => {
    // The real-world case: everything lands in one bucket, so the chips
    // separate nothing and the status facet is the only way in.
    mount([
      finding({ id: "new", status: BugFindingStatus.NEW }),
      finding({ id: "approved", status: BugFindingStatus.APPROVED }),
    ]);

    fireEvent.click(within(openFilters()).getByLabelText(/^Approved/));

    expect(screen.getByText("Bug approved")).toBeInTheDocument();
    expect(screen.queryByText("Bug new")).not.toBeInTheDocument();
  });

  it("filters by age using the same boundary the Age column tints at", () => {
    mount([
      finding({ id: "fresh", createdAt: ago(2) }),
      finding({ id: "old", createdAt: ago(20) }),
    ]);

    fireEvent.click(within(openFilters()).getByLabelText(/Over a week old/));

    expect(screen.getByText("Bug old")).toBeInTheDocument();
    expect(screen.queryByText("Bug fresh")).not.toBeInTheDocument();
  });

  it("gathers the duplicates, which the ×2 badge could only point at one at a time", () => {
    mount([
      finding({ id: "dup-1", title: "Same bug" }),
      finding({ id: "dup-2", title: "Same bug" }),
      finding({ id: "unique", title: "Different bug" }),
    ]);

    fireEvent.click(within(openFilters()).getByLabelText(/Duplicates only/));

    expect(screen.getAllByText("Same bug")).toHaveLength(2);
    expect(screen.queryByText("Different bug")).not.toBeInTheDocument();
  });

  it("does not offer a duplicates toggle when the window holds no duplicates", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);
    expect(within(openFilters()).queryByLabelText(/Duplicates only/)).not.toBeInTheDocument();
  });

  it("counts the active facets on the button, so a shut panel is never a silent filter", () => {
    mount([
      finding({ id: "a", severity: BugFindingSeverity.HIGH }),
      finding({ id: "b", severity: BugFindingSeverity.LOW }),
    ]);

    const panel = openFilters();
    fireEvent.click(within(panel).getByLabelText(/^High/));
    fireEvent.click(within(panel).getByLabelText(/Over a week old/));

    expect(screen.getByRole("button", { name: /Filters\s*2/ })).toBeInTheDocument();
  });

  /**
   * The panel can be shut while a filter is on, so the reset must not live
   * inside it — and it has to appear for the two controls that are outside the
   * panel too, or a lone search term narrows the table with nothing to press.
   */
  it("offers one reset whenever anything is narrowing the table", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search bugs"), { target: { value: "Bug a" } });
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Bug b")).toBeInTheDocument();
  });

  it("searches the description and the reporter, not only the title", () => {
    mount([
      finding({ id: "a", description: "the retry loop never terminates" }),
      finding({ id: "b", description: "unrelated" }),
    ]);

    fireEvent.change(screen.getByLabelText("Search bugs"), {
      target: { value: "retry loop" },
    });

    expect(screen.getByText("Bug a")).toBeInTheDocument();
    expect(screen.queryByText("Bug b")).not.toBeInTheDocument();
  });
});

describe("BugFindingsTable — collapsing columns", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * Stage used to render as a chip stacked under the status badge, which on a
   * window of new bugs printed "New" directly above "New".
   */
  it("hides the stage column when every bug in the window is at one stage", () => {
    mount([
      finding({ id: "a", stage: BugFindingStage.NEW }),
      finding({ id: "b", stage: BugFindingStage.NEW }),
    ]);
    expect(screen.queryByRole("columnheader", { name: /^Stage/ })).not.toBeInTheDocument();
  });

  it("shows the stage column once the window holds more than one", () => {
    mount([
      finding({ id: "a", stage: BugFindingStage.NEW }),
      finding({ id: "b", stage: BugFindingStage.RELEASED }),
    ]);
    expect(screen.getByRole("columnheader", { name: /^Stage/ })).toBeInTheDocument();
  });
});

describe("BugFindingsTable — paging and selection", () => {
  beforeEach(() => vi.clearAllMocks());

  const many = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      finding({ id: String(index).padStart(3, "0"), createdAt: ago(index + 1) }),
    );

  it("pages at 20 by default", () => {
    mount(many(45));
    expect(titles()).toHaveLength(20);
  });

  it("honours a bigger page size from the address bar", () => {
    cleanup();
    mount(many(45), { url: "/?size=50" });
    expect(titles()).toHaveLength(45);
  });

  it("changing the page size re-pages without losing the filters", () => {
    mount(many(45), { url: "/?q=Bug" });
    expect(titles()).toHaveLength(20);

    fireEvent.change(screen.getByRole("combobox", { name: "Rows" }), { target: { value: "50" } });
    expect(titles()).toHaveLength(45);
    expect(screen.getByLabelText("Search bugs")).toHaveValue("Bug");
  });

  /**
   * The header checkbox stays page-scoped on purpose — a checkbox in a column
   * header means "this column". Reaching past the page is a separate, named
   * action that states the number it is about to take.
   */
  it("offers select-all-matching only once a selection could reach past the page", () => {
    mount(many(45));
    // Nothing ticked yet, so there is nothing to extend.
    expect(screen.queryByRole("button", { name: /Select all 45/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select every bug on this page"));
    fireEvent.click(screen.getByRole("button", { name: "Select all 45 matching bugs" }));

    // The prompt is gone once everything matching is ticked — which is how the
    // table says the selection now covers all 45 rather than the 20 on screen.
    expect(screen.queryByRole("button", { name: /Select all 45/ })).not.toBeInTheDocument();
  });

  it("does not offer it when the results already fit on one page", () => {
    mount(many(5));
    fireEvent.click(screen.getByLabelText("Select every bug on this page"));
    expect(screen.queryByRole("button", { name: /Select all/ })).not.toBeInTheDocument();
  });
});

describe("BugFindingsTable — a failed poll", () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * This list polls every fifteen seconds, and `isError` used to win over
   * `data` — so one timed-out poll replaced the whole table with a line of
   * error text and the next poll brought it back. Caught on the live page.
   */
  it("keeps the rows it already had, under a warning, when a poll fails", () => {
    mount([finding({ id: "a" })], { queryState: { isError: true } });

    expect(screen.getByText("Bug a")).toBeInTheDocument();
    expect(screen.getByText(/didn't get through/)).toBeInTheDocument();
    // Not the hard failure copy, which belongs to a table that has nothing.
    expect(screen.queryByText("Couldn't load the bugs table.")).not.toBeInTheDocument();
  });

  it("still fails loudly when there is nothing to fall back on", () => {
    mount([], { queryState: { isError: true } });

    expect(screen.getByText("Couldn't load the bugs table.")).toBeInTheDocument();
    expect(screen.queryByText(/didn't get through/)).not.toBeInTheDocument();
  });
});
