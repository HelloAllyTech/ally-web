import { fireEvent, render, screen } from "@testing-library/react";
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
  TableHeader: ({ children, ...rest }: any) => <th {...rest}>{children}</th>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
  TableCell: ({ children, ...rest }: any) => <td {...rest}>{children}</td>,
}));

vi.mock("framer-motion", () => ({
  motion: { span: ({ children, ...props }: any) => <span {...props}>{children}</span> },
  useReducedMotion: () => false,
}));

import { BugFinding, BugFindingSource, BugFindingStage, BugFindingStatus } from "@types";

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

const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    finding({ id: String(index).padStart(3, "0"), createdAt: ago(index + 1) }),
  );

const mount = (items: BugFinding[], count: number, url = "/") => {
  getBugFindings.mockReturnValue({
    data: { items, count },
    isLoading: false,
    isFetching: false,
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
 * The server's `count` can exceed the loaded window (`GET /findings` only
 * ever returns a fixed `limit`), which the table already stated in words via
 * `windowNotice`. This is the control that lets a reader actually close that
 * gap instead of only being told about it.
 */
describe("BugFindingsTable — load more", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers a Load more button once the server reports more than the loaded window", () => {
    mount(many(100), 250);

    expect(screen.getByText(/of 250 I've tracked in total/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load 100 more" })).toBeInTheDocument();
  });

  it("asks the query for a bigger window when clicked", () => {
    mount(many(100), 250);

    fireEvent.click(screen.getByRole("button", { name: "Load 100 more" }));

    const lastCall = getBugFindings.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ status: "all", limit: 200 });
  });

  it("names only the bugs actually left once fewer than a full increment remain", () => {
    mount(many(100), 130);
    expect(screen.getByRole("button", { name: "Load 30 more" })).toBeInTheDocument();
  });

  it("does not offer it once every bug has loaded", () => {
    mount(many(50), 50);

    expect(screen.queryByText(/I've tracked in total/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Load .* more$/ })).not.toBeInTheDocument();
  });
});
