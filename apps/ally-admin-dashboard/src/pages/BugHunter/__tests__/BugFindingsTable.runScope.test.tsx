import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getBugFindings = vi.fn();
const approveFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const rejectFinding = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const startFixSession = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
const getBugHuntRun = vi.fn(() => ({ data: undefined }));

vi.mock("@api", () => ({
  useGetBugFindingsQuery: (...args: unknown[]) => getBugFindings(...args),
  useApproveBugFindingMutation: () => [approveFinding, { isLoading: false }],
  useRejectBugFindingMutation: () => [rejectFinding, { isLoading: false }],
  useStartBugFixSessionMutation: () => [startFixSession, { isLoading: false }],
  // The scoped sweep, for the banner's own words. Recorded rather than fixed,
  // because whether it is *skipped* while unscoped is one of the assertions.
  useGetBugHuntRunQuery: (...args: unknown[]) => getBugHuntRun(...args),
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

/**
 * Scoping the table to one sweep, and telling Age apart from Updated.
 *
 * ## The defect behind all of it
 *
 * The shift log said a sweep found ten bugs and the table, sorted newest-first,
 * showed two — so the table looked broken. It was not. `foundCount` counts
 * every finding a run *touched*, and most of what a nightly sweep touches is
 * human-reported bugs it re-reads: rows created the day somebody filed them,
 * weeks before the sweep stamped its id onto them. Ten were found, eight of
 * them were old rows, and nothing on the page could say so.
 *
 * Two fixes, tested here. The scope answers "which ten?"; the Updated column
 * stops a re-read bug from looking untouched since the day it was filed.
 */
describe("BugFindingsTable — one sweep's bugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBugHuntRun.mockReturnValue({ data: undefined });
  });

  it("asks the server for the run's findings rather than filtering the window", () => {
    mount([finding({ id: "a", runId: "run-a" })], 1, "/?run=run-a");

    // The whole point. A run's findings are scattered arbitrarily far down a
    // table ordered by discovery date, so filtering the newest-100 window in
    // the browser would have found the handful that happened to be recent and
    // then reported that as the total.
    expect(getBugFindings).toHaveBeenCalledWith(
      { status: "all", limit: 100, runId: "run-a" },
      { pollingInterval: 15_000 },
    );
  });

  it("names the sweep it is scoped to, and offers the way out", () => {
    getBugHuntRun.mockReturnValue({
      data: { id: "run-a", repo: "ally-ai-learn", createdAt: "22 Aug 2026, 02:12" },
    });
    mount([finding({ id: "a", runId: "run-a" })], 1, "/?run=run-a");

    // The clock time, not just the day: a nightly sweep and the manual one
    // someone kicked off after a release share a date, and the banner has to
    // say which of the two these counts describe.
    expect(
      screen.getByText(
        /Showing only the bugs my ally-ai-learn sweep at 22 Aug 2026, 02:12 touched/,
      ),
    ).toBeInTheDocument();
    // Stated, not implied: a reader who has not seen this line reads
    // "Everything 1" as "one bug exists".
    expect(screen.getByText(/Some of these bugs are older than the sweep/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show all bugs" })).toBeInTheDocument();
  });

  it("still names the scope while the run's own details are loading", () => {
    mount([finding({ id: "a", runId: "run-a" })], 1, "/?run=run-a");

    // The banner cannot wait for the run: the counts below it are already
    // scoped, so a render with no banner is a render that lies.
    expect(screen.getByText(/Showing only the bugs one sweep touched/)).toBeInTheDocument();
  });

  it("says nothing about scope, and asks for no run, when there is none", () => {
    mount([finding({ id: "a" })]);

    expect(screen.queryByRole("button", { name: "Show all bugs" })).not.toBeInTheDocument();
    // Skipped, so an admin who never clicks a count in the shift log pays no
    // request for a banner that never renders.
    expect(getBugHuntRun).toHaveBeenCalledWith("", { skip: true });
  });

  it("drops the scope back to every bug", () => {
    getBugHuntRun.mockReturnValue({
      data: { id: "run-a", repo: "ally-be", createdAt: "22 Aug 2026" },
    });
    mount([finding({ id: "a", runId: "run-a" })], 1, "/?run=run-a");

    fireEvent.click(screen.getByRole("button", { name: "Show all bugs" }));

    expect(screen.queryByRole("button", { name: "Show all bugs" })).not.toBeInTheDocument();
  });
});

describe("BugFindingsTable — Age and Updated are different questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBugHuntRun.mockReturnValue({ data: undefined });
  });

  it("shows Updated once something in view has moved since it was found", () => {
    mount([
      finding({
        id: "a",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
    ]);

    expect(screen.getByRole("button", { name: /Updated/ })).toBeInTheDocument();
  });

  it("collapses Updated when it would only repeat Age", () => {
    mount([
      finding({
        id: "a",
        createdAt: "2026-08-17T00:00:00.000Z",
        // Seconds later, within the same sweep: inserted, then PATCHed to
        // pending_approval. A strict `>` would call this "updated" and the
        // column would be a second copy of Age on the whole table — a worse
        // dead column than an em-dash, because a reader has to compare the two
        // before concluding they say the same thing.
        updatedAt: "2026-08-17T00:00:12.000Z",
      }),
    ]);

    expect(screen.queryByRole("button", { name: /Updated/ })).not.toBeInTheDocument();
  });

  it("sorts by Updated independently of Age", () => {
    mount([
      // Filed in July, re-read by last night's sweep — the case the whole
      // change exists for. Oldest by Age, newest by Updated.
      finding({
        id: "old-report",
        title: "Filed in July, looked at last night",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-08-22T00:00:00.000Z",
      }),
      finding({
        id: "fresh-find",
        title: "Found last week and untouched since",
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T00:00:00.000Z",
      }),
    ]);

    const titles = () =>
      [...document.querySelectorAll("tbody tr")].map(row => row.textContent ?? "");

    // Default sort is discovery, newest first.
    expect(titles()[0]).toContain("Found last week and untouched since");

    // One click on Updated sorts descending — the re-read July bug comes top,
    // which is the row an admin was looking for and could not find.
    fireEvent.click(screen.getByRole("button", { name: /Updated/ }));
    expect(titles()[0]).toContain("Filed in July, looked at last night");
  });
});
