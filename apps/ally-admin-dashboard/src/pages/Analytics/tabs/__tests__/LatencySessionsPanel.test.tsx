import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Control the data/filter state the panel renders from.
vi.mock("../useLatencySessions", () => ({
  useLatencySessions: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetSimulationsQuery: () => ({
    data: { data: [{ id: 7, title: "Crisis call" }] },
  }),
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

// Isolate this panel test from the real chart-kit (carbon-charts) machinery —
// same convention as mocking V2VTestModal out of the RoleplaySessionLogs test.
vi.mock("../../chartKit", () => ({
  ChartCard: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

import { useLatencySessions } from "../useLatencySessions";
import { LatencySessionsPanel } from "../LatencySessionsPanel";

const baseRow = {
  scenarioSessionId: "sess-1234567890",
  occurredAt: "2026-06-01T10:00:00Z",
  turnCount: 12,
  avgResponseLatencyMs: 12723,
  p50ResponseLatencyMs: 10037,
  p95ResponseLatencyMs: 26305,
  avgEouDelayMs: 1333,
  avgSttFinalizeMs: null,
  avgLlmTtftMs: 9680,
  avgTtsTtfbMs: 1881,
  avgOrchestrationMs: 31,
  avgLlmResponseMs: 1200,
  avgBranchingMs: 0,
  avgKnowledgeRetrievalMs: 2413,
  avgProcessEventsMs: 2554,
  avgBehaviorsMs: 1534,
  interruptedTurns: 1,
  llmTimedOutTurns: 0,
};

const makeState = (overrides: Record<string, unknown> = {}) => ({
  scenarioId: undefined,
  setScenarioId: vi.fn(),
  rows: [],
  total: 0,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  summary: undefined,
  isSummaryLoading: false,
  isSummaryError: false,
  canPrev: false,
  canNext: false,
  goPrev: vi.fn(),
  goNext: vi.fn(),
  rangeStart: 0,
  rangeEnd: 0,
  ...overrides,
});

describe("LatencySessionsPanel", () => {
  beforeEach(() => {
    vi.mocked(useLatencySessions).mockReset();
  });

  it("shows a pick-a-simulation empty state before any simulation is chosen", () => {
    vi.mocked(useLatencySessions).mockReturnValue(makeState() as any);

    render(<LatencySessionsPanel query={{}} language="" />);

    expect(screen.getByText("Pick a simulation")).toBeInTheDocument();
  });

  it("shows a no-sessions empty state once a simulation is chosen but nothing matches", () => {
    vi.mocked(useLatencySessions).mockReturnValue(
      makeState({ scenarioId: 7, rows: [], total: 0 }) as any,
    );

    render(<LatencySessionsPanel query={{}} language="" />);

    expect(screen.getByText("No sessions found")).toBeInTheDocument();
  });

  it("renders session rows and the pagination footer", () => {
    vi.mocked(useLatencySessions).mockReturnValue(
      makeState({
        scenarioId: 7,
        rows: [baseRow],
        total: 30,
        rangeStart: 1,
        rangeEnd: 25,
        canNext: true,
      }) as any,
    );

    render(<LatencySessionsPanel query={{}} language="" />);

    expect(screen.getByText("sess-123")).toBeInTheDocument(); // truncated id (first 8 chars)
    expect(screen.getByText("12")).toBeInTheDocument(); // turnCount
    expect(screen.getByText("Showing 1–25 of 30")).toBeInTheDocument();
    expect(screen.getByText("Next")).not.toBeDisabled();
    expect(screen.getByText("Previous")).toBeDisabled();
  });

  it("calls goNext/goPrev from the pagination footer", () => {
    const goNext = vi.fn();
    const goPrev = vi.fn();
    vi.mocked(useLatencySessions).mockReturnValue(
      makeState({
        scenarioId: 7,
        rows: [baseRow],
        total: 30,
        rangeStart: 1,
        rangeEnd: 25,
        canNext: true,
        canPrev: true,
        goNext,
        goPrev,
      }) as any,
    );

    render(<LatencySessionsPanel query={{}} language="" />);

    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Previous"));

    expect(goNext).toHaveBeenCalledTimes(1);
    expect(goPrev).toHaveBeenCalledTimes(1);
  });

  it("shows a retry button when the sessions query errors", () => {
    const refetch = vi.fn();
    vi.mocked(useLatencySessions).mockReturnValue(
      makeState({ scenarioId: 7, isError: true, refetch }) as any,
    );

    render(<LatencySessionsPanel query={{}} language="" />);

    fireEvent.click(screen.getByText("Retry"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders the summary KPI tiles when a summary is available", () => {
    vi.mocked(useLatencySessions).mockReturnValue(
      makeState({
        scenarioId: 7,
        rows: [],
        total: 0,
        summary: {
          sessionCount: 1,
          turnCount: 12,
          ...baseRow,
        },
      }) as any,
    );

    render(<LatencySessionsPanel query={{}} language="" />);

    expect(screen.getByText("Response (avg)")).toBeInTheDocument();
    expect(screen.getByText("12.72 s")).toBeInTheDocument();
  });
});
