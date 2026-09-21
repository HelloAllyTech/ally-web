import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The roadmap's Bugs tab, rendering the REAL `BugFindingsTable` underneath it.
 *
 * Mounting the real table is the point of this suite. A test that stubbed it
 * would assert that `BugsTab` passes `canTriage={false}` and prove nothing about
 * what that flag actually removes from the screen — which is the whole feature.
 * So `@api`, `@assets` and the shared UI kit are mocked (per the recipe the
 * sibling BugHunter suites use) and everything from `BugsTab` down is real.
 */

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

vi.mock("@components/error-boundary", () => ({
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock("@components", () => ({
  cellTypes: {},
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
  logger: { error: vi.fn() },
}));

vi.mock("../../BugHunter/BugFindingDrawer", () => ({
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
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

import { BugFinding, BugFindingSource, BugFindingStatus } from "@types";

import { BugsTab } from "../BugsTab";

/**
 * PENDING_APPROVAL on purpose: it is the one status where `canAct` says yes to
 * all three of approve, reject and "put me on it", so a row built from it is
 * the strongest possible case that the buttons are absent because the tab is
 * read-only and not because the bug was ineligible anyway.
 */
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
    status: BugFindingStatus.PENDING_APPROVAL,
    prUrl: null,
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  }) as unknown as BugFinding;

const mount = (items: BugFinding[]) => {
  getBugFindings.mockReturnValue({
    data: { items, count: items.length },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={["/product-roadmap?tab=bugs"]}>
      <BugsTab />
    </MemoryRouter>,
  );
};

describe("ProductRoadmap — Bugs tab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the same rows Bug Hunter's table shows", () => {
    mount([finding({ id: "a" }), finding({ id: "b" })]);

    expect(screen.getByText("Bug a")).toBeInTheDocument();
    expect(screen.getByText("Bug b")).toBeInTheDocument();
  });

  it("reads the same shared cache entry, so the mirror cannot drift from the source", () => {
    mount([finding({ id: "a" })]);

    // Byte-identical to what BugHunter.tsx, the profile card and the queue ask
    // for. Anything else here would fork the RTK Query entry and let the two
    // tabs show different bugs.
    expect(getBugFindings).toHaveBeenCalledWith(
      { status: "all", limit: 100 },
      { pollingInterval: 15_000 },
    );
  });

  it("offers no triage decisions, on a bug that would accept all three", () => {
    mount([finding({ id: "a" })]);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Put me on it" })).not.toBeInTheDocument();
  });

  it("drops the selection and decision columns rather than leaving them empty", () => {
    mount([finding({ id: "a" })]);

    // Not "the checkbox is hidden" — the column is gone. An empty gutter and an
    // empty right-hand column are the dead columns this table collapses
    // everywhere else.
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Decide")).not.toBeInTheDocument();
  });

  it("says it is read-only and points at where the decisions are made", () => {
    mount([finding({ id: "a" })]);

    const link = screen.getByRole("link", { name: "Bug Hunter" });
    expect(link).toHaveAttribute("href", "/bug-hunter");
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });
});
