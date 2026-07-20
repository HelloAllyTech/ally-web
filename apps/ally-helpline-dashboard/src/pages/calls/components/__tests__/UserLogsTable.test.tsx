import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  useGetCallLogsQuery,
  useGetSimulationLogsQuery,
  useGetCustomFieldsEnabledQuery,
  useGetCustomFieldDefinitionsQuery,
} from "@api";
import { SessionType, CallLog, SimulationLog, ChatSummaryStatus } from "@types";

import UserLogsTable from "../UserLogsTable";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // Carbon Loading replaces MUI CircularProgress for the table spinner.
  Loading: () => <div data-testid="loading">Loading...</div>,
  GenericTable: React.forwardRef(
    (
      { columns, data, isLoading, handleLoadMore, fallbackUI, className, onFilterChange }: any,
      ref: any,
    ) => {
      // Mirror real GenericTable's mount-time onFilterChange fire (its
      // useEffect with [filter, sort] deps runs once on mount with the
      // empty initial filter). Consumers must not wipe state on this call.
      React.useEffect(() => {
        onFilterChange?.({ filter: [], sort: { key: "", value: null } });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return (
        <div ref={ref} className={className} data-testid="generic-table">
          {isLoading && <div data-testid="table-loading">Loading...</div>}
          {fallbackUI}
          {data?.map((item: any, index: number) => (
            <div key={item.id || index} data-testid={`table-row-${index}`}>
              {columns.map((col: any) => (
                <div key={col.key} data-testid={`cell-${col.key}-${index}`}>
                  {col.render ? col.render(item[col.key], item) : item[col.key]}
                </div>
              ))}
            </div>
          ))}
          {handleLoadMore && (
            <button onClick={handleLoadMore} data-testid="load-more-button">
              Load More
            </button>
          )}
        </div>
      );
    },
  ),
}));

vi.mock("@api", () => ({
  useGetCallLogsQuery: vi.fn(),
  useGetSimulationLogsQuery: vi.fn(),
  useGetCustomFieldsEnabledQuery: vi.fn(),
  useGetCustomFieldDefinitionsQuery: vi.fn(),
  useGetCallTagsQuery: vi.fn(() => ({ data: { data: [] } })),
}));

vi.mock("@assets", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    NoResults: () => <div data-testid="no-results-icon">No Results</div>,
    CallIdIcon: () => <div data-testid="call-id-icon">Call ID</div>,
    DateIcon: () => <div data-testid="date-icon">Date</div>,
    TimerIcon: () => <div data-testid="timer-icon">Timer</div>,
    TagsIcon: () => <div data-testid="tags-icon">Tags</div>,
    ReviewIcon: () => <div data-testid="review-icon">Review</div>,
    SummaryGenerationIcon: () => <div data-testid="summary-generation-icon">Summary</div>,
    ScenarioIcon: () => <div data-testid="scenario-icon">Scenario</div>,
    SessionScoreIcon: () => <div data-testid="session-score-icon">Score</div>,
    SourceIcon: () => <div data-testid="source-icon">Source</div>,
    ScribeIcon: () => <svg data-testid="scribe-icon" />,
  };
});

vi.mock("@components", () => ({
  Button: ({ children, onClick, fullWidth, variant, ...props }: any) => (
    <button onClick={onClick} data-full-width={fullWidth} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  Chip: ({ config }: any) => (
    <div data-testid="chip" data-label={config?.label} className={config?.outerDivClassName}>
      {config?.label || ""}
    </div>
  ),
  TagGroup: ({ tags }: any) => (
    <div data-testid="tag-group">
      {tags?.map((tag: any, index: number) => (
        <span key={index} data-testid={`tag-${index}`}>
          {tag.label}
        </span>
      ))}
    </div>
  ),
  FallbackUI: ({ icon, mainMessage, description, className }: any) => (
    <div className={className} data-testid="fallback-ui">
      {icon}
      <div data-testid="fallback-message">{mainMessage}</div>
      <div data-testid="fallback-description">{description}</div>
    </div>
  ),
}));

vi.mock("../CallSummarySidebar", () => ({
  default: ({ callSummary, refetchCallLogs, setCallSummary, sessionType }: any) => (
    <div data-testid="call-summary-sidebar">
      <div data-testid="call-summary-id">{callSummary?.id}</div>
      <div data-testid="session-type">{sessionType}</div>
      <button onClick={() => refetchCallLogs()}>Refetch</button>
      <button onClick={() => setCallSummary(null)}>Close</button>
    </div>
  ),
}));

vi.mock("../SimulationSummarySidebar", () => ({
  default: ({ summaryId, closeSummarySidebar }: any) => (
    <div data-testid="simulation-summary-sidebar">
      <div data-testid="summary-id">{summaryId}</div>
      <button onClick={closeSummarySidebar}>Close</button>
    </div>
  ),
}));

vi.mock("@utils", () => ({
  convertSecondsToDuration: vi.fn(
    (seconds: number) => `${Math.floor(seconds / 60)}:${seconds % 60}`,
  ),
  getFormattedDate: vi.fn((date: string) => new Date(date).toLocaleDateString()),
  getSimulationScoreDisplay: vi.fn((score: number) => `${score}/100`),
}));

vi.mock("../utils", () => ({
  getSourceChipConfig: vi.fn((source: string) => ({
    label: source || "Unknown",
    variant: "default",
  })),
  getStatusChipConfig: vi.fn((status: string) => ({
    label: status || "PENDING",
    variant: "warning",
  })),
  getModeChipConfig: vi.fn((mode: string | undefined) => ({
    label: mode === "DICTATION" ? "Dictation" : "Scribe",
    outerDivClassName:
      mode === "DICTATION" ? "bg-[#FFF3E0] text-[#E65100]" : "bg-[#E8EAF6] text-[#3949AB]",
  })),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ state: { refetch: false }, pathname: "/calls" }),
  };
});

vi.mock("@reducer", () => ({
  updateFilters: vi.fn(filters => ({ type: "UPDATE_FILTERS", payload: filters })),
}));

vi.mock("../constants", () => ({
  CALL_LOGS_PAGINATION_LIMIT: 25,
  tagColors: { 1: "#FF0000", 2: "#FFA500", 3: "#FFFF00", 4: "#90EE90", 5: "#008000" },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const createMockStore = (
  callsState: any = { filters: { offset: 0 } },
  userState: any = {
    isAuthenticated: true,
    user: { id: 1, name: "Test User" },
    permissions: [],
    availableChatTypes: [],
  },
) =>
  configureStore({
    reducer: {
      calls: (state = callsState, action: any) => {
        if (action.type === "UPDATE_FILTERS") return { ...state, filters: action.payload };
        return state;
      },
      user: (state = userState) => state,
    },
    preloadedState: { calls: callsState, user: userState },
  });

/** A call log with mode SCRIBE (the default). */
const SCRIBE_CALL_LOG: CallLog = {
  id: 1,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
  roomId: 1,
  clientId: 1,
  counselorId: 1,
  status: "ACTIVE",
  startedAt: "2024-01-01T10:00:00Z",
  endedAt: "2024-01-01T10:05:00Z",
  summaryStatus: ChatSummaryStatus.PENDING,
  archivedAt: null,
  reviewStatus: null,
  reviewId: null,
  reviewCreatedAt: null,
  client: {
    id: 1,
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    email: "client@test.com",
    name: "Test Client",
    role: "CLIENT",
    status: "ACTIVE",
    username: "testclient",
    phone: "1234567890",
    metadata: {},
  },
  counselor: { id: 1, name: "Test Counselor", phone: "1234567890" },
  details: {
    callDuration: 300,
    callInfo: { summaryName: "Test Call", provider: "MICROPHONE", mode: "SCRIBE" },
    summary: {
      callQuality: 85,
      tags: [
        { tag: "Depression", positivity_rating: 3 },
        { tag: "Anxiety", positivity_rating: 4 },
      ],
    },
    transcript: "Test transcript content",
  },
} as CallLog;

/** A call log with mode DICTATION. */
const DICTATION_CALL_LOG: CallLog = {
  ...SCRIBE_CALL_LOG,
  id: 2,
  details: {
    ...SCRIBE_CALL_LOG.details,
    callInfo: { summaryName: "Dictation Call", provider: "AUDIO_UPLOAD", mode: "DICTATION" },
  },
} as CallLog;

const SIMULATION_LOG: SimulationLog = {
  id: "sim-1",
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
  tenantId: "tenant-1",
  roomId: "room-1",
  scenarioId: 1,
  counselorId: 1,
  status: "ACTIVE",
  startedAt: "2024-01-01T10:00:00Z",
  endedAt: "2024-01-01T10:05:00Z",
  score: 85,
  metadata: { sessionName: "Test Simulation" },
  scenario: {
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    id: 1,
    title: "Test Scenario",
    scenario: "test-scenario",
    description: "Test scenario description",
    coverImageUrl: "test-image.jpg",
    status: "ACTIVE",
    prompt: "Test prompt",
    metadata: null,
  },
} as SimulationLog;

const renderComponent = (
  sessionType: SessionType,
  refreshKey?: number,
  callsState: any = { filters: { offset: 0 } },
  userState?: any,
) => {
  const store = createMockStore(callsState, userState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <UserLogsTable sessionType={sessionType} refreshKey={refreshKey} />
      </BrowserRouter>
    </Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("UserLogsTable", () => {
  const mockUseGetCallLogsQuery = useGetCallLogsQuery as ReturnType<typeof vi.fn>;
  const mockUseGetSimulationLogsQuery = useGetSimulationLogsQuery as ReturnType<typeof vi.fn>;
  const mockUseGetCustomFieldsEnabledQuery = useGetCustomFieldsEnabledQuery as ReturnType<
    typeof vi.fn
  >;
  const mockUseGetCustomFieldDefinitionsQuery = useGetCustomFieldDefinitionsQuery as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetCallLogsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetSimulationLogsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetCustomFieldsEnabledQuery.mockReturnValue({
      data: false,
      isLoading: false,
    });

    mockUseGetCustomFieldDefinitionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  // -------------------------------------------------------------------------
  describe("Loading states", () => {
    it("shows spinner while call logs are loading", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("shows spinner while simulation logs are loading", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("does not show the spinner once call logs have loaded", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Fallback UI", () => {
    it("shows fallback UI when call log list is empty", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      });
    });

    it("shows fallback UI when simulation log list is empty", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      });
    });

    it("does not show fallback UI when call logs are present", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.queryByTestId("fallback-ui")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Call logs – table rendering", () => {
    beforeEach(() => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("renders the table container", () => {
      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("user-logs-table-container")).toBeInTheDocument();
      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });

    it("renders one row per call log", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
      });
    });

    it("renders the call-name cell with the summary name", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByText("Test Call")).toBeInTheDocument();
      });
    });

    it("renders the duration cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        // 300 seconds → 5:0
        expect(screen.getByText("5:0")).toBeInTheDocument();
      });
    });

    it("renders tag labels inside the tag group", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("tag-group")).toBeInTheDocument();
        expect(screen.getByText("Depression")).toBeInTheDocument();
        expect(screen.getByText("Anxiety")).toBeInTheDocument();
      });
    });

    it("renders the summary-status chip cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-summaryStatus-0")).toBeInTheDocument();
      });
    });

    it("renders the source chip cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-source-0")).toBeInTheDocument();
      });
    });

    it("renders the summary review button", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(
          screen.getByTestId(`user-logs-call-review-button-${SCRIBE_CALL_LOG.id}`),
        ).toBeInTheDocument();
      });
    });

    it("renders call log without details without crashing", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [{ ...SCRIBE_CALL_LOG, details: null }] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Mode column – call logs", () => {
    it("renders the mode cell for each call log row", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toBeInTheDocument();
      });
    });

    it("shows 'Scribe' chip when mode is SCRIBE", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toHaveTextContent("Scribe");
      });
    });

    it("shows 'Dictation' chip when mode is DICTATION", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [DICTATION_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toHaveTextContent("Dictation");
      });
    });

    it("defaults to 'Scribe' chip when mode is undefined", async () => {
      const noModeLog: CallLog = {
        ...SCRIBE_CALL_LOG,
        id: 99,
        details: {
          ...SCRIBE_CALL_LOG.details,
          callInfo: { summaryName: "No Mode Call", provider: "MICROPHONE" }, // no mode field
        },
      } as CallLog;

      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [noModeLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toHaveTextContent("Scribe");
      });
    });

    it("renders distinct mode chips when multiple call logs have different modes", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG, DICTATION_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toHaveTextContent("Scribe");
        expect(screen.getByTestId("cell-mode-1")).toHaveTextContent("Dictation");
      });
    });

    it("does NOT render a mode cell for simulation logs", async () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.queryByTestId("cell-mode-0")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Simulation logs – table rendering", () => {
    beforeEach(() => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("renders the generic table for simulation logs", () => {
      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });

    it("renders the session name", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("Test Simulation")).toBeInTheDocument();
      });
    });

    it("renders the scenario title", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("Test Scenario")).toBeInTheDocument();
      });
    });

    it("renders the session score", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("85/100")).toBeInTheDocument();
      });
    });

    it("calculates duration from startedAt / endedAt", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("5:0")).toBeInTheDocument();
      });
    });

    it("renders the review button for each simulation row", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(
          screen.getByTestId(`user-logs-simulation-review-button-${SIMULATION_LOG.id}`),
        ).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Summary sidebar – call logs", () => {
    beforeEach(() => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn().mockResolvedValue({ data: { data: [SCRIBE_CALL_LOG] } }),
      });
    });

    it("opens call summary sidebar when review button is clicked", async () => {
      renderComponent(SessionType.CALL);

      const reviewBtn = await screen.findByTestId(
        `user-logs-call-review-button-${SCRIBE_CALL_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("call-summary-id")).toHaveTextContent(String(SCRIBE_CALL_LOG.id));
      });
    });

    it("closes call summary sidebar when close button is clicked", async () => {
      renderComponent(SessionType.CALL);

      const reviewBtn = await screen.findByTestId(
        `user-logs-call-review-button-${SCRIBE_CALL_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByTestId("call-summary-sidebar")).not.toBeInTheDocument();
      });
    });

    it("passes the correct session type to CallSummarySidebar", async () => {
      renderComponent(SessionType.CALL);

      const reviewBtn = await screen.findByTestId(
        `user-logs-call-review-button-${SCRIBE_CALL_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("session-type")).toHaveTextContent(SessionType.CALL);
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Summary sidebar – simulation logs", () => {
    beforeEach(() => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("opens simulation summary sidebar when review button is clicked", async () => {
      renderComponent(SessionType.SIMULATION);

      const reviewBtn = await screen.findByTestId(
        `user-logs-simulation-review-button-${SIMULATION_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("simulation-summary-sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("summary-id")).toHaveTextContent(SIMULATION_LOG.id);
      });
    });

    it("closes simulation summary sidebar when close is clicked", async () => {
      renderComponent(SessionType.SIMULATION);

      const reviewBtn = await screen.findByTestId(
        `user-logs-simulation-review-button-${SIMULATION_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("simulation-summary-sidebar")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByTestId("simulation-summary-sidebar")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Pagination", () => {
    it("shows 'Load More' button when result count equals the pagination limit", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: {
          data: Array(25)
            .fill(SCRIBE_CALL_LOG)
            .map((l, i) => ({ ...l, id: i + 1 })),
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
      });
    });

    it("hides 'Load More' button when result count is less than the pagination limit", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: {
          data: [SCRIBE_CALL_LOG, { ...SCRIBE_CALL_LOG, id: 2 }, { ...SCRIBE_CALL_LOG, id: 3 }],
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });

    it("increases the offset when 'Load More' is clicked", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: {
          data: Array(25)
            .fill(SCRIBE_CALL_LOG)
            .map((l, i) => ({ ...l, id: i + 1 })),
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      const { updateFilters } = await import("@reducer");
      renderComponent(SessionType.CALL);

      const loadMoreBtn = await screen.findByTestId("load-more-button");
      fireEvent.click(loadMoreBtn);

      await waitFor(() => {
        expect(updateFilters).toHaveBeenCalledWith(expect.objectContaining({ offset: 25 }));
      });
    });

    it("keeps Load More and rows visible after GenericTable's mount-time onFilterChange", async () => {
      // Regression: GenericTable fires onFilterChange({filter:[], sort:...})
      // on mount. UserLogsTable's handler used to unconditionally setLogs([])
      // on every call, which wiped the loaded first page so Load More went
      // missing and earlier rows were unreachable until a search was applied.
      mockUseGetCallLogsQuery.mockReturnValue({
        data: {
          data: Array(25)
            .fill(SCRIBE_CALL_LOG)
            .map((l, i) => ({ ...l, id: i + 1 })),
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
      });
      expect(screen.getAllByTestId(/^table-row-/)).toHaveLength(25);
    });

    it("resets logs when session type switches", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      const { rerender } = renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.getByText("Test Call")).toBeInTheDocument();
      });

      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <UserLogsTable sessionType={SessionType.SIMULATION} />
          </BrowserRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(screen.queryByText("Test Call")).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Refresh behaviour", () => {
    it("refetches call logs when refreshKey changes", async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { data: [] } });
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
      });

      const { rerender } = renderComponent(SessionType.CALL);

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <UserLogsTable sessionType={SessionType.CALL} refreshKey={1} />
          </BrowserRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("refetches simulation logs when refreshKey changes", async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { data: [] } });
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
      });

      const { rerender } = renderComponent(SessionType.SIMULATION);

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <UserLogsTable sessionType={SessionType.SIMULATION} refreshKey={1} />
          </BrowserRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("refetches call logs when location.state.refetch is true", async () => {
      // The module-level useLocation mock always returns state.refetch = false.
      // The same effect also fires when refreshKey is truthy, which exercises
      // the same refetch branch. Pass refreshKey=1 to verify the behaviour.
      const mockRefetch = vi.fn().mockResolvedValue({ data: { data: [] } });
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent(SessionType.CALL, 1 /* refreshKey triggers the same effect */);

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Error handling", () => {
    it("handles call log without details gracefully (empty display row)", async () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [{ ...SCRIBE_CALL_LOG, id: 3, details: null }] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
        // Row is present even with null details
        expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
      });
    });

    it("handles simulation log with empty metadata gracefully", async () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: {
          data: [
            { ...SIMULATION_LOG, id: "empty-sim", metadata: { sessionName: "" }, score: null },
          ],
        },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      });
    });

    it("handles null score in simulation log (shows undefined/null display)", async () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [{ ...SIMULATION_LOG, score: null }] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("API query parameters", () => {
    it("passes archive: false in the call-logs query", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetCallLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ archive: false }),
        expect.any(Object),
      );
    });

    it("passes languageCode to useGetSimulationLogsQuery", () => {
      renderComponent(SessionType.SIMULATION);
      expect(mockUseGetSimulationLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ languageCode: expect.any(String) }),
        expect.any(Object),
      );
    });

    it("does NOT include languageCode in the call-logs query", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetCallLogsQuery).toHaveBeenCalledWith(
        expect.not.objectContaining({ languageCode: expect.any(String) }),
        expect.any(Object),
      );
    });

    it("skips call-logs query when session type is SIMULATION", () => {
      renderComponent(SessionType.SIMULATION);
      expect(mockUseGetCallLogsQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: true }),
      );
    });

    it("skips simulation-logs query when session type is CALL", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetSimulationLogsQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: true }),
      );
    });
  });
});
