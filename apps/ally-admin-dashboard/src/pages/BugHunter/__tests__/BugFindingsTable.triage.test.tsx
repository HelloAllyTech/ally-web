import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBugFindings = vi.fn();
const approveFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const rejectFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const startFixSession = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));

vi.mock("@api", () => ({
  useGetBugFindingsQuery: (...args: unknown[]) => getBugFindings(...args),
  useApproveBugFindingMutation: () => [approveFinding, { isLoading: false }],
  useRejectBugFindingMutation: () => [rejectFinding, { isLoading: false }],
  useStartBugFixSessionMutation: () => [startFixSession, { isLoading: false }],
  // Only consulted for the run-scope banner's wording, and skipped entirely
  // while no `?run=` is set — but the hook is still called on every render, so
  // the mock has to exist or the table throws before it draws a row.
  useGetBugHuntRunQuery: () => ({ data: undefined }),
}));

vi.mock("@assets", () => ({ TooltipIcon: () => <svg data-testid="tooltip-icon" /> }));

// The table can now act on a bug without opening the drawer — row buttons, the
// keyboard, and the bulk bar all go through these.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@components/action-confirmation-popup", () => ({
  ActionConfirmationPopup: ({ title, primaryButton, secondaryButton }: any) => (
    <div role="dialog" aria-label={title}>
      <p>{title}</p>
      <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
      {secondaryButton && (
        <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
      )}
    </div>
  ),
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
  logger: { error: vi.fn() },
}));

vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("@components/error-boundary", () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

// Benign here, unlike the sibling suite that deliberately throws from it — this
// file is about the table's own triage controls, not the boundary around it.
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
  Select: ({ id, children, value, onChange, labelText }: any) => (
    <select id={id} aria-label={labelText} value={value} onChange={onChange}>
      {children}
    </select>
  ),
  SelectItem: ({ value, text }: any) => <option value={value}>{text}</option>,
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
  Table: ({ children }: any) => <table>{children}</table>,
  TableHead: ({ children }: any) => <thead>{children}</thead>,
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  // Forwards everything: tabIndex, role, aria-label and onKeyDown are the
  // difference between a row a keyboard user can open and one they cannot.
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

import { BugFinding, BugFindingSeverity, BugFindingSource, BugFindingStatus } from "@types";

import { BugFindingsTable } from "../BugFindingsTable";

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
    prUrl: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

/**
 * `url` seeds the query string, which is where the table's filters live now —
 * so a test that needs to start on a bucket says so in the address rather than
 * driving a parent's `useState`.
 */
const mount = (items: BugFinding[], count?: number, url = "/") => {
  getBugFindings.mockReturnValue({
    data: { items, count: count ?? items.length },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[url]}>
      <BugFindingsTable onShowShortcuts={vi.fn()} canTriage />
    </MemoryRouter>,
  );
};

describe("BugFindingsTable — triage controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shares one request with the rest of the page rather than querying per filter", () => {
    mount([finding({ id: "a" })]);

    // The card, the queue and this table all ask for exactly this, so RTK Query
    // serves them from one cache entry. Pushing filters into the query would
    // fork that entry per filter combination.
    expect(getBugFindings).toHaveBeenCalledWith(
      { status: "all", limit: 100 },
      { pollingInterval: 15_000 },
    );
  });

  it("filters the rows by free text", () => {
    mount([
      finding({ id: "a", title: "Terms link is not formatted correctly" }),
      finding({ id: "b", title: "Database query failed" }),
    ]);

    fireEvent.change(screen.getByLabelText("Search bugs"), { target: { value: "terms" } });

    expect(screen.getByText("Terms link is not formatted correctly")).toBeInTheDocument();
    expect(screen.queryByText("Database query failed")).not.toBeInTheDocument();
  });

  it("filters by repo, offering only repos that are actually present", () => {
    mount([
      finding({ id: "a", repo: "ally-be" }),
      finding({ id: "b", repo: "ally-web" }),
    ]);

    const repoFilter = screen.getByLabelText("Repo");
    expect(repoFilter).toContainHTML('<option value="ally-web">ally-web</option>');
    expect(repoFilter).not.toContainHTML("ally-mobile");

    fireEvent.change(repoFilter, { target: { value: "ally-web" } });
    expect(screen.getByText("Bug b")).toBeInTheDocument();
    expect(screen.queryByText("Bug a")).not.toBeInTheDocument();
  });

  it("honours the lifecycle bucket the address bar has set", () => {
    mount(
      [
        finding({ id: "waiting", status: BugFindingStatus.PENDING_APPROVAL }),
        finding({ id: "busy", status: BugFindingStatus.FIXING }),
      ],
      undefined,
      "/?bucket=needs_you",
    );

    expect(screen.getByText("Bug waiting")).toBeInTheDocument();
    expect(screen.queryByText("Bug busy")).not.toBeInTheDocument();
  });

  /**
   * The one outright accessibility defect in the old feature. Rows were
   * `<tr onClick>` with no tabIndex, no role and no key handler, and opening a
   * bug is the only way to act on one — so a keyboard user could not use this
   * page at all.
   */
  it("gives each row a real, named control rather than a bare clickable <tr>", () => {
    mount([finding({ id: "a", title: "Reachable by keyboard" })]);

    // A native <button> in the title cell, not role="button" on the <tr>:
    // Carbon's TableRow destructures `aria-label` out of its props, so a name
    // set there never reaches the DOM — live testing found twenty *unnamed*
    // buttons. The name states the affordance and contains the visible text,
    // which is what WCAG 2.5.3 asks for.
    const opener = screen.getByRole("button", { name: "Open bug: Reachable by keyboard" });
    expect(opener.tagName).toBe("BUTTON");
    expect(opener).toHaveTextContent("Reachable by keyboard");

    fireEvent.click(opener);
    expect(screen.getByTestId("drawer")).toHaveTextContent("a");
  });

  it("keeps the table semantics intact — no role on the row itself", () => {
    mount([finding({ id: "a" })]);

    // role="button" on a <tr> stops a screen reader treating the table as a
    // table, which costs more than the click target it buys.
    expect(document.querySelectorAll('tr[role="button"]')).toHaveLength(0);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("reports its sort state to a screen reader, not just with a caret", () => {
    mount([finding({ id: "a" })]);

    const age = screen.getByText("Age").closest("th");
    expect(age).toHaveAttribute("aria-sort", "descending");

    fireEvent.click(screen.getByText("Age"));
    expect(screen.getByText("Age").closest("th")).toHaveAttribute("aria-sort", "ascending");
  });

  it("sorts severity worst-first the moment that column is chosen", () => {
    mount([
      finding({ id: "low", severity: BugFindingSeverity.LOW }),
      finding({ id: "high", severity: BugFindingSeverity.HIGH }),
    ]);

    fireEvent.click(screen.getByText("Severity"));
    const openers = screen.getAllByRole("button", { name: /^Open bug:/ });
    expect(openers[0]).toHaveAccessibleName("Open bug: Bug high");
  });

  it("flags a duplicate pair and keeps both rows", () => {
    mount([
      finding({ id: "a", title: "Database query failed", status: BugFindingStatus.NEW }),
      finding({ id: "b", title: "Database query failed", status: BugFindingStatus.NEW }),
    ]);

    // Both rows survive: each is independently approvable, and merging them
    // would leave the second live after someone dealt with the first.
    expect(screen.getAllByText("Database query failed")).toHaveLength(2);
    expect(screen.getAllByText("×2")).toHaveLength(2);
  });

  it("distinguishes a filtered-to-nothing table from an empty one", () => {
    mount([finding({ id: "a", title: "Terms link" })]);

    fireEvent.change(screen.getByLabelText("Search bugs"), { target: { value: "zzzz" } });

    // Telling someone "Once I'm on duty, anything I find shows up here" when
    // they have typed a typo is the page blaming its own state for the reader's.
    expect(screen.getByText("Nothing here matches those filters")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("clears every filter at once, including the bucket the page owns", () => {
    getBugFindings.mockReturnValue({
      data: { items: [finding({ id: "a", title: "Terms link" })], count: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    // Started on a bucket via the query string rather than through a stateful
    // parent — the bucket is URL state now, so "clear" has to clear the URL and
    // a real router is what proves it did.
    render(
      <MemoryRouter initialEntries={["/?bucket=needs_you"]}>
        <BugFindingsTable onShowShortcuts={vi.fn()} canTriage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Search bugs"), { target: { value: "zzzz" } });
    expect(screen.queryByText("Terms link")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Clear filters")[0]);
    expect(screen.getByText("Terms link")).toBeInTheDocument();
  });

  it("still shows the real empty state when there is genuinely nothing", () => {
    mount([]);
    expect(screen.getByTestId("empty-state")).toHaveTextContent("No bugs yet");
  });

  it("paginates, and counts matches across all pages rather than the visible one", () => {
    mount(Array.from({ length: 25 }, (_, i) => finding({ id: `f-${i}` })));

    expect(screen.getByText("Showing 20 of 25 bugs")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Showing 5 of 25 bugs")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("does not say '1 of 1 bugs' when a single row matches", () => {
    mount([finding({ id: "a", title: "Only one" })]);
    expect(screen.getByText("Showing 1 bug")).toBeInTheDocument();
  });

  it("says so when the filters only searched part of the table", () => {
    mount([finding({ id: "a" })], 40);

    // Replaces the workload strip's footnote apologising for its denominator —
    // said here, where the filters are, and only when it is actually true.
    expect(
      screen.getByText(/These filters search my 1 most recent bugs, of 40 I've tracked in total/),
    ).toBeInTheDocument();
  });

  it("does not claim a window when it has the whole table", () => {
    mount([finding({ id: "a" })], 1);
    expect(screen.queryByText(/most recent bugs, of/)).not.toBeInTheDocument();
  });

  it("shows a skeleton while loading rather than a bare ellipsis", () => {
    getBugFindings.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });
    const { container } = render(
      <MemoryRouter>
        <BugFindingsTable onShowShortcuts={vi.fn()} canTriage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
