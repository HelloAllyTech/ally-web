import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Navigate spy shared across the suite.
const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

// Control the data/filter state the page renders from.
vi.mock("../useRoleplaySessionLogs", () => ({
  useRoleplaySessionLogs: vi.fn(),
}));

// The V2V launcher modal pulls in @api / shared components; stub it out so this
// page test stays isolated (the modal is exercised separately).
vi.mock("../V2VTestModal", () => ({
  V2VTestModal: () => null,
}));

// The page also queries the scenario languages list directly for the language
// filter; stub it so the real @api slice (and its @constants dependency) isn't
// pulled into this isolated page test.
vi.mock("@api", () => ({
  useGetScenarioLanguagesQuery: () => ({ data: [] }),
}));

vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  EmptyState: ({ title, subtitle }: any) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  ),
}));

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

vi.mock("@constants", () => ({
  ROUTES: {
    ROLEPLAY_SESSION_LOGS: "/roleplay-session-logs",
    ROLEPLAY_SESSION_LOG_DETAIL: (id: string) => `/roleplay-session-logs/${id}`,
  },
}));

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

import { useRoleplaySessionLogs } from "../useRoleplaySessionLogs";
import { RoleplaySessionLogs } from "../RoleplaySessionLogs";

const baseRow = {
  id: "sess-1",
  counselorId: 42,
  counselorName: "Alice Smith",
  counselorEmail: "alice@org.com",
  tenantId: "t-1",
  orgName: "Org One",
  scenarioId: 7,
  scenarioTitle: "Crisis call",
  status: "ENDED" as const,
  startedAt: "2026-06-01T10:00:00Z",
  endedAt: "2026-06-01T10:05:00Z",
  durationSeconds: 300,
  score: 88.5,
  platform: "web",
  language: "English",
  createdAt: "2026-06-01T10:00:00Z",
};

const makeState = (overrides: Record<string, unknown> = {}) => ({
  rows: [baseRow],
  total: 1,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  searchInput: "",
  setSearchInput: vi.fn(),
  status: "" as const,
  onStatusChange: vi.fn(),
  sessionType: "all" as const,
  onSessionTypeChange: vi.fn(),
  language: "",
  onLanguageChange: vi.fn(),
  dateFrom: "",
  onDateFromChange: vi.fn(),
  dateTo: "",
  onDateToChange: vi.fn(),
  hasActiveFilters: false,
  clearFilters: vi.fn(),
  canPrev: false,
  canNext: false,
  goPrev: vi.fn(),
  goNext: vi.fn(),
  rangeStart: 1,
  rangeEnd: 1,
  ...overrides,
});

describe("RoleplaySessionLogs page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading and the preview-exclusion note", () => {
    (useRoleplaySessionLogs as any).mockReturnValue(makeState());
    render(<RoleplaySessionLogs />);

    expect(screen.getByText("Roleplay Session Logs")).toBeInTheDocument();
    expect(screen.getByText(/preview\/test runs are excluded/i)).toBeInTheDocument();
  });

  it("renders a row per session with user, org and scenario", () => {
    (useRoleplaySessionLogs as any).mockReturnValue(makeState());
    render(<RoleplaySessionLogs />);

    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@org.com")).toBeInTheDocument();
    expect(screen.getByText("Org One")).toBeInTheDocument();
    expect(screen.getByText("Crisis call")).toBeInTheDocument();
    // "Ended" appears both as the status-filter option and the row pill.
    expect(screen.getAllByText("Ended").length).toBeGreaterThan(0);
  });

  it("navigates to the detail route when a row is clicked", () => {
    (useRoleplaySessionLogs as any).mockReturnValue(makeState());
    render(<RoleplaySessionLogs />);

    fireEvent.click(screen.getByText("Alice Smith"));
    expect(navigateMock).toHaveBeenCalledWith("/roleplay-session-logs/sess-1");
  });

  it("shows an empty state when there are no rows", () => {
    (useRoleplaySessionLogs as any).mockReturnValue(makeState({ rows: [], total: 0 }));
    render(<RoleplaySessionLogs />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows a loading state while fetching the first page", () => {
    (useRoleplaySessionLogs as any).mockReturnValue(makeState({ isLoading: true, rows: [] }));
    render(<RoleplaySessionLogs />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
