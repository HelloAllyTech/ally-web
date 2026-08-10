import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Control the data/filter state the page renders from.
vi.mock("../useAwsLogs", () => ({
  useAwsLogs: vi.fn(),
  AWS_LOG_SERVICES: [
    { id: "ally-be", label: "ally-be" },
    { id: "ally-ai", label: "ally-ai" },
    { id: "ally-ai-learn", label: "ally-ai-learn" },
  ],
  AWS_LOG_LEVELS: ["ERROR", "WARN", "INFO", "DEBUG"],
  RANGE_PRESETS: [
    { id: "15m", label: "Last 15 minutes" },
    { id: "1h", label: "Last 1 hour" },
    { id: "24h", label: "Last 24 hours" },
    { id: "7d", label: "Last 7 days" },
    { id: "custom", label: "Custom range" },
  ],
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

vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

import { useAwsLogs } from "../useAwsLogs";
import { Logs } from "../Logs";

const baseEvent = {
  eventId: "evt-1",
  timestamp: new Date("2026-08-10T10:00:00Z").getTime(),
  message: "ERROR something broke",
  logStreamName: "stream-a",
};

const makeState = (overrides: Record<string, unknown> = {}) => ({
  events: [baseEvent],
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  streams: [],
  service: "ally-be" as const,
  onServiceChange: vi.fn(),
  rangePreset: "1h" as const,
  onRangePresetChange: vi.fn(),
  customFrom: undefined,
  customTo: undefined,
  onCustomRangeChange: vi.fn(),
  level: "" as const,
  onLevelChange: vi.fn(),
  logStreamName: "",
  onLogStreamNameChange: vi.fn(),
  searchInput: "",
  setSearchInput: vi.fn(),
  live: false,
  toggleLive: vi.fn(),
  hasActiveFilters: false,
  clearFilters: vi.fn(),
  canPrev: false,
  canNext: false,
  goPrev: vi.fn(),
  goNext: vi.fn(),
  ...overrides,
});

describe("Logs page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    (useAwsLogs as any).mockReturnValue(makeState());
    render(<Logs />);

    expect(screen.getByText("Logs")).toBeInTheDocument();
  });

  it("renders a row per log event with stream and message", () => {
    (useAwsLogs as any).mockReturnValue(makeState());
    render(<Logs />);

    expect(screen.getByText("stream-a")).toBeInTheDocument();
    expect(screen.getByText("ERROR something broke")).toBeInTheDocument();
  });

  it("shows an empty state when there are no events", () => {
    (useAwsLogs as any).mockReturnValue(makeState({ events: [] }));
    render(<Logs />);

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows a loading state while fetching", () => {
    (useAwsLogs as any).mockReturnValue(makeState({ isLoading: true, events: [] }));
    render(<Logs />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows an error message when the query fails", () => {
    (useAwsLogs as any).mockReturnValue(makeState({ isError: true, events: [] }));
    render(<Logs />);

    expect(screen.getByText(/Failed to load logs/i)).toBeInTheDocument();
  });

  it("disables Previous/Next according to canPrev/canNext", () => {
    (useAwsLogs as any).mockReturnValue(makeState({ canPrev: false, canNext: true }));
    render(<Logs />);

    expect(screen.getByText("Previous")).toBeDisabled();
    expect(screen.getByText("Next")).not.toBeDisabled();
  });
});
