import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useGetVoiceLatencyByScenarioQueryMock = vi.fn();

vi.mock("@api", () => ({
  useGetVoiceLatencyByScenarioQuery: (...args: unknown[]) =>
    useGetVoiceLatencyByScenarioQueryMock(...args),
}));

vi.mock("@carbon/charts-react", () => ({
  SimpleBarChart: () => <div data-testid="bar-chart" />,
}));

// createMockComponents() also supplies `cellTypes` — @constants imports it
// from @components at module-load time (Guardrails.ts/SimulationCreator.ts),
// and @types/auth.ts (loaded transitively via ../../latencyChart, real here)
// pulls in @constants, so a bare { Button: ... } mock throws on collection.
vi.mock("@components", async () => {
  const { createMockComponents } = await import("../../../__tests__/setup");
  return createMockComponents();
});

vi.mock("@components/types", () => ({
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary", TEXT: "text" },
}));

// LatencySessionsPanel.tsx (real here — this file imports its exported
// `formatMs` helper) imports @utils for formatDate, which otherwise drags in
// the real Redux store and @api's baseAPI.
vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
}));

// Same isolation convention as LatencySessionsPanel.test.tsx — keep this test
// about data-wiring and interaction, not real chart-kit/carbon-charts machinery.
vi.mock("../../chartKit", () => ({
  ChartCard: ({ title, caption, loading, error, empty, emptyText, onRetry, children }: any) => (
    <section>
      <h2>{title}</h2>
      {caption && <p>{caption}</p>}
      {loading && <div data-testid="loading" />}
      {error && (
        <div>
          <span>Error</span>
          {onRetry && <button onClick={onRetry}>Retry</button>}
        </div>
      )}
      {!loading && !error && empty && <div>{emptyText ?? "No data for this range"}</div>}
      {!loading && !error && !empty && children}
    </section>
  ),
  buildSource: () => "source",
  hBarOpts: () => ({}),
  single: () => ({}),
}));

import { LatencyByScenarioPanel } from "../LatencyByScenarioPanel";

const baseRow = {
  scenarioId: 7,
  scenarioTitle: "Crisis call",
  occurredAt: "2026-08-20T09:15:00.000Z",
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

const makeResult = (overrides: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides,
});

describe("LatencyByScenarioPanel", () => {
  beforeEach(() => {
    useGetVoiceLatencyByScenarioQueryMock.mockReset().mockReturnValue(makeResult());
  });

  it("shows loading skeletons while the query is in flight", () => {
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(makeResult({ isLoading: true }));

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.getAllByTestId("loading").length).toBeGreaterThan(0);
  });

  it("shows a retry button when the query errors, and calls refetch", () => {
    const refetch = vi.fn();
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(makeResult({ isError: true, refetch }));

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    fireEvent.click(screen.getAllByText("Retry")[0]);
    expect(refetch).toHaveBeenCalled();
  });

  it("shows an empty state when there are no simulations in the window", () => {
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows: [], window: {}, truncated: false } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(
      screen.getByText("No pipeline turns in the current window (and language, if set)."),
    ).toBeInTheDocument();
  });

  it("renders a row per simulation with its per-stage columns", () => {
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows: [baseRow], window: {}, truncated: false } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.getByText("Crisis call")).toBeInTheDocument();
    expect(screen.getByText("2026-08-20T09:15:00.000Z")).toBeInTheDocument(); // occurredAt (mocked formatDate is identity)
    expect(screen.getByText("12.72 s")).toBeInTheDocument(); // avgResponseLatencyMs
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
  });

  it("shows an em-dash when a simulation has no latest-session timestamp", () => {
    // avgSttFinalizeMs overridden to a real value — baseRow's null there
    // already renders "—" via formatMs, which would otherwise collide with
    // the assertion below and make it ambiguous which cell it's checking.
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({
        data: {
          rows: [{ ...baseRow, occurredAt: null, avgSttFinalizeMs: 500 }],
          window: {},
          truncated: false,
        },
      }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("warns that the ranking is incomplete when the backend truncated it", () => {
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows: [baseRow], window: {}, truncated: true } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.getByText("Ranking truncated")).toBeInTheDocument();
  });

  it("does not show a truncation warning when the backend returned the full ranking", () => {
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows: [baseRow], window: {}, truncated: false } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.queryByText("Ranking truncated")).not.toBeInTheDocument();
  });

  it("calls onSelectScenario with the row's scenarioId when 'View sessions' is clicked", () => {
    const onSelectScenario = vi.fn();
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows: [baseRow], window: {}, truncated: false } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={onSelectScenario} />);

    fireEvent.click(screen.getByText("View sessions"));
    expect(onSelectScenario).toHaveBeenCalledWith(7);
  });

  it("paginates client-side across simulations beyond one page", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      ...baseRow,
      scenarioId: i,
      scenarioTitle: `Scenario ${i}`,
    }));
    useGetVoiceLatencyByScenarioQueryMock.mockReturnValue(
      makeResult({ data: { rows, window: {}, truncated: false } }),
    );

    render(<LatencyByScenarioPanel query={{}} language="" onSelectScenario={vi.fn()} />);

    expect(screen.getByText("Showing 1–25 of 30")).toBeInTheDocument();
    expect(screen.getByText("Scenario 0")).toBeInTheDocument();
    expect(screen.queryByText("Scenario 25")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Next"));

    expect(screen.getByText("Showing 26–30 of 30")).toBeInTheDocument();
    expect(screen.getByText("Scenario 25")).toBeInTheDocument();
    expect(screen.queryByText("Scenario 0")).not.toBeInTheDocument();
  });
});
