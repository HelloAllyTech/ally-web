import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { BugFindingsTable } from "../BugFindingsTable";

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

// The barrel is stubbed for the same reason as the other BugHunter tests —
// @constants reads `cellTypes` off it at module-eval time, dragging the real
// store in. The boundary is NOT stubbed with it: the component under test
// imports it from @components/error-boundary directly, so the real one runs,
// which is the whole point of this file.
vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Search: ({ id, labelText, value, onChange, placeholder }: any) => (
    <input id={id} aria-label={labelText} placeholder={placeholder} value={value} onChange={onChange} />
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
  // `aria-sort` lands on the real header cell, so the stub has to keep it for
  // the sorting assertions below to mean anything.
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  // Forwards everything: tabIndex, role, aria-label and onKeyDown are the
  // difference between a row a keyboard user can open and one they cannot, and
  // a mock that swallowed them would let that regress silently.
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

// Real motion timing isn't what this suite is about; a pass-through keeps the
// chip counts assertable while preserving the remount-on-change behaviour.
vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

// The drawer is the thing under suspicion here, so it is replaced by one that
// throws exactly as the real one did against a backend missing `steps`.
vi.mock("../BugFindingDrawer", () => ({
  BugFindingDrawer: () => {
    throw new Error("Cannot read properties of undefined (reading 'some')");
  },
}));

const findings = [
  {
    id: "finding-1",
    runId: null,
    repo: "ally-be",
    source: "reported_bug",
    title: "Terms link is not formatted correctly",
    description: "…",
    file: null,
    evidence: null,
    severity: null,
    proven: false,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: "new",
    prUrl: null,
    escalationQuestion: null,
    escalationAnswer: null,
    escalationAnsweredBy: null,
    escalationAnsweredAt: null,
    decidedBy: null,
    decidedAt: null,
    sessionRunUrl: null,
    releaseTag: null,
    releaseRunUrl: null,
    releasedBy: null,
    releasedAt: null,
    createdAt: "2026-08-17",
    updatedAt: "2026-08-17",
  },
  {
    id: "finding-2",
    runId: null,
    repo: "ally-web",
    source: "code_review",
    title: "Second bug, reachable while the first one is broken",
    description: "…",
    file: null,
    evidence: null,
    severity: null,
    proven: false,
    touchesGuardedPath: false,
    reportedBugId: null,
    status: "new",
    prUrl: null,
    escalationQuestion: null,
    escalationAnswer: null,
    escalationAnsweredBy: null,
    escalationAnsweredAt: null,
    decidedBy: null,
    decidedAt: null,
    sessionRunUrl: null,
    releaseTag: null,
    releaseRunUrl: null,
    releasedBy: null,
    releasedAt: null,
    createdAt: "2026-08-17",
    updatedAt: "2026-08-17",
  },
];

/**
 * A drawer that throws used to take the whole console with it: clicking any row
 * of this table left a blank white page. The table keeps its own boundary — the
 * page-level one would catch the throw, but it would also remove the table, and
 * the table is how you reach a different bug.
 */
/** The table's view state lives in the query string now, so it needs a router. */
const renderTable = () =>
  render(
    <MemoryRouter>
      <BugFindingsTable onShowShortcuts={vi.fn()} canTriage />
    </MemoryRouter>,
  );

describe("BugFindingsTable — a drawer that throws", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  afterAll(() => consoleError.mockRestore());

  beforeEach(() => {
    vi.clearAllMocks();
    getBugFindings.mockReturnValue({
      data: { items: findings, count: findings.length },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("keeps the bugs table on screen and reports the failure in place", () => {
    renderTable();
    fireEvent.click(screen.getByText("Terms link is not formatted correctly"));

    // The table survived — both rows are still there to click.
    expect(screen.getByText("Terms link is not formatted correctly")).toBeInTheDocument();
    expect(
      screen.getByText("Second bug, reachable while the first one is broken"),
    ).toBeInTheDocument();

    // And the drawer's failure is stated where the drawer would have been.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/this panel stopped working/i)).toBeInTheDocument();
    expect(screen.getByText(/reading 'some'/)).toBeInTheDocument();
    // A crashed drawer can't offer its own close, so the boundary does.
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("dismisses back to the plain table", () => {
    renderTable();
    fireEvent.click(screen.getByText("Terms link is not formatted correctly"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("starts clean on a different bug rather than inheriting the last one's error", () => {
    renderTable();
    fireEvent.click(screen.getByText("Terms link is not formatted correctly"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Same throwing drawer, so it errors again — but from a fresh attempt on
    // the new bug, not a stale panel left over from the previous row.
    fireEvent.click(screen.getByText("Second bug, reachable while the first one is broken"));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
