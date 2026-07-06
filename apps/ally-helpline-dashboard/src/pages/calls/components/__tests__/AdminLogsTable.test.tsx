import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetAdminSimulationLogsQuery,
  useGetCustomFieldDefinitionsQuery,
  useGetCustomFieldsEnabledQuery,
} from "@api";
import { SessionType, CallLog, SimulationLog, ChatSummaryStatus } from "@types";

import AdminLogsTable from "../AdminLogsTable";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // Carbon Loading replaces MUI CircularProgress for the table spinner.
  Loading: () => <div data-testid="loading">Loading...</div>,
  Tooltip: ({ children }: any) => <>{children}</>,
  GenericTable: React.forwardRef(
    ({ columns, data, isLoading, handleLoadMore, fallbackUI, className }: any, ref: any) => (
      <div ref={ref} className={className} data-testid="generic-table">
        {isLoading && <div data-testid="table-loading">Loading...</div>}
        {fallbackUI}
        <div data-testid="table-header">
          {columns.map((col: any) => (
            <div key={col.key} data-testid={`header-${col.key}`}>
              {col.headerNode ?? col.header}
            </div>
          ))}
        </div>
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
    ),
  ),
}));

vi.mock("@api", () => ({
  useGetAdminCallLogsQuery: vi.fn(),
  useGetAdminSimulationLogsQuery: vi.fn(),
  useGetCounsellorsQuery: vi.fn(),
  useGetCallTagsQuery: vi.fn(),
  useGetCustomFieldDefinitionsQuery: vi.fn(),
  useGetCustomFieldsEnabledQuery: vi.fn(),
}));

vi.mock("../custom-fields/ManageCustomFieldsDialog", () => ({
  default: ({ open, onClose }: any) =>
    open ? (
      <div data-testid="manage-fields-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
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
    UserIcon: () => <div data-testid="user-icon">User</div>,
    SummaryGenerationIcon: () => <div data-testid="summary-generation-icon">Summary</div>,
    SessionScoreIcon: () => <div data-testid="session-score-icon">Score</div>,
    ScenarioIcon: () => <div data-testid="scenario-icon">Scenario</div>,
    SourceIcon: () => <div data-testid="source-icon">Source</div>,
    ScribeIcon: () => <svg data-testid="scribe-icon" />,
    Delete: () => <div data-testid="delete-icon">Delete</div>,
    ActionsIcon: () => <div data-testid="actions-icon">Actions</div>,
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
  PermissionGuard: ({ children, requiredPermissions }: any) => (
    <div data-testid="permission-guard" data-permissions={JSON.stringify(requiredPermissions)}>
      {children}
    </div>
  ),
}));

vi.mock("../CallSummarySidebar", () => ({
  default: ({ callSummary, refetchCallLogs, setCallSummary }: any) => (
    <div data-testid="call-summary-sidebar">
      <div data-testid="call-summary-id">{callSummary?.id}</div>
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

vi.mock("../DeleteCallLogConfirmationDialog", () => ({
  default: ({ chatId, closeDialog }: any) => (
    <div data-testid="delete-dialog">
      <div data-testid="delete-chat-id">{chatId}</div>
      <button onClick={() => closeDialog(false)}>Cancel Delete</button>
      <button onClick={() => closeDialog(true)}>Confirm Delete</button>
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
  return { ...actual, useLocation: () => ({ state: { refetch: false }, pathname: "/calls" }) };
});

vi.mock("@reducer", () => ({
  updateFilters: vi.fn(filters => ({ type: "UPDATE_FILTERS", payload: filters })),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("../constants", () => ({
  CALL_LOGS_PAGINATION_LIMIT: 25,
  defaultTags: ["Tag1", "Tag2"],
  tagColors: { 1: "#FF0000", 2: "#FFA500", 3: "#FFFF00", 4: "#90EE90", 5: "#008000" },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const createMockStore = (
  callsState: any = { filters: { offset: 0 } },
  userState: any = { user: { id: 1, role: "COUNSELLOR" } },
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

const DICTATION_CALL_LOG: CallLog = {
  ...SCRIBE_CALL_LOG,
  id: 2,
  details: {
    ...SCRIBE_CALL_LOG.details,
    callInfo: { summaryName: "Dictation Call", provider: "AUDIO_UPLOAD", mode: "DICTATION" },
  },
} as CallLog;

const AUDIO_UPLOAD_CALL_LOG: CallLog = {
  ...SCRIBE_CALL_LOG,
  id: 3,
  details: {
    ...SCRIBE_CALL_LOG.details,
    callInfo: { summaryName: "Uploaded Call", provider: "AUDIO_UPLOAD", mode: "SCRIBE" },
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
  userState: any = { user: { id: 1, role: "COUNSELLOR" } },
) => {
  const store = createMockStore(callsState, userState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <AdminLogsTable sessionType={sessionType} refreshKey={refreshKey} />
      </BrowserRouter>
    </Provider>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminLogsTable", () => {
  const mockUseGetAdminCallLogsQuery = useGetAdminCallLogsQuery as ReturnType<typeof vi.fn>;
  const mockUseGetAdminSimulationLogsQuery = useGetAdminSimulationLogsQuery as ReturnType<
    typeof vi.fn
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAdminCallLogsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
      error: null,
    });

    mockUseGetAdminSimulationLogsQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.mocked(useGetCounsellorsQuery).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "John Doe" },
          { id: 2, name: "Jane Smith" },
        ],
      },
      isLoading: false,
    } as any);

    vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({
      data: false,
      isLoading: false,
    } as any);

    vi.mocked(useGetCustomFieldDefinitionsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    vi.mocked(useGetCallTagsQuery).mockReturnValue({
      data: { data: ["Depression", "Anxiety"] },
      isLoading: false,
    } as any);
  });

  // -------------------------------------------------------------------------
  describe("Loading states", () => {
    it("shows spinner while call logs are loading", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("shows spinner while simulation logs are loading", () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("loading")).toBeInTheDocument();
    });

    it("does not show the spinner once call logs have loaded", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
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
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
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
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });
    });

    it("renders the generic table container", async () => {
      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("admin-logs-table-container")).toBeInTheDocument();
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

    it("renders the counsellor name cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-counsellorName-0")).toBeInTheDocument();
        expect(screen.getByText("Test Counselor")).toBeInTheDocument();
      });
    });

    it("renders the tags cell with tag labels", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("tag-group")).toBeInTheDocument();
        expect(screen.getByText("Depression")).toBeInTheDocument();
        expect(screen.getByText("Anxiety")).toBeInTheDocument();
      });
    });

    it("renders the source chip cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-source-0")).toBeInTheDocument();
      });
    });

    it("renders the summary-status chip cell", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-summaryStatus-0")).toBeInTheDocument();
      });
    });

    it("renders the actions cell with the review button", async () => {
      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-actions-0")).toBeInTheDocument();
        expect(screen.getByTestId("admin-logs-review-button-1")).toBeInTheDocument();
      });
    });

    it("renders call log without details without crashing", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [{ ...SCRIBE_CALL_LOG, details: null }] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
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
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toBeInTheDocument();
      });
    });

    it("shows 'Scribe' chip when mode is SCRIBE", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        const modeCell = screen.getByTestId("cell-mode-0");
        expect(modeCell).toHaveTextContent("Scribe");
      });
    });

    it("shows 'Dictation' chip when mode is DICTATION", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [DICTATION_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        const modeCell = screen.getByTestId("cell-mode-0");
        expect(modeCell).toHaveTextContent("Dictation");
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

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [noModeLog] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        const modeCell = screen.getByTestId("cell-mode-0");
        expect(modeCell).toHaveTextContent("Scribe");
      });
    });

    it("renders distinct mode chips when multiple call logs have different modes", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG, DICTATION_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("cell-mode-0")).toHaveTextContent("Scribe");
        expect(screen.getByTestId("cell-mode-1")).toHaveTextContent("Dictation");
      });
    });

    it("does NOT render a mode cell for simulation logs", async () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
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
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("renders the generic table for simulation logs", async () => {
      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });

    it("renders session name and scenario title", async () => {
      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("Test Simulation")).toBeInTheDocument();
        expect(screen.getByText("Test Scenario")).toBeInTheDocument();
      });
    });

    it("renders the counsellor name for simulation logs", async () => {
      const adminSimLog = { ...SIMULATION_LOG, counselor: { name: "Admin Counselor" } };
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [adminSimLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      await waitFor(() => {
        expect(screen.getByText("Admin Counselor")).toBeInTheDocument();
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
  });

  // -------------------------------------------------------------------------
  describe("Delete functionality", () => {
    beforeEach(() => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [AUDIO_UPLOAD_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });
    });

    it("always renders the delete dialog (with null chatId by default)", () => {
      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });

    it("populates the delete-dialog chatId when the delete button is clicked", async () => {
      renderComponent(SessionType.CALL);

      const actionsCell = await screen.findByTestId("cell-actions-0");
      const deleteButton = actionsCell.querySelector(
        `[data-testid="admin-logs-delete-button-${AUDIO_UPLOAD_CALL_LOG.id}"]`,
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        await waitFor(() => {
          expect(screen.getByTestId("delete-chat-id")).toHaveTextContent(
            String(AUDIO_UPLOAD_CALL_LOG.id),
          );
        });
      }
    });

    it("clears the chatId (closes dialog) when cancel is clicked", async () => {
      renderComponent(SessionType.CALL);

      const actionsCell = await screen.findByTestId("cell-actions-0");
      const deleteButton = actionsCell.querySelector(
        `[data-testid="admin-logs-delete-button-${AUDIO_UPLOAD_CALL_LOG.id}"]`,
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        const cancelBtn = screen.getByText("Cancel Delete");
        fireEvent.click(cancelBtn);

        await waitFor(() => {
          expect(screen.getByTestId("delete-chat-id")).toBeEmptyDOMElement();
        });
      }
    });

    it("refetches call logs when deletion is confirmed", async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { data: [] } });
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [AUDIO_UPLOAD_CALL_LOG] },
        isLoading: false,
        refetch: mockRefetch,
        error: null,
      });

      renderComponent(SessionType.CALL);

      const actionsCell = await screen.findByTestId("cell-actions-0");
      const deleteButton = actionsCell.querySelector(
        `[data-testid="admin-logs-delete-button-${AUDIO_UPLOAD_CALL_LOG.id}"]`,
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        const confirmBtn = screen.getByText("Confirm Delete");
        fireEvent.click(confirmBtn);

        await waitFor(() => {
          expect(mockRefetch).toHaveBeenCalled();
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  describe("Summary sidebar", () => {
    it("opens call summary sidebar when review button is clicked", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      const reviewBtn = await screen.findByTestId(`admin-logs-review-button-${SCRIBE_CALL_LOG.id}`);
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("call-summary-id")).toHaveTextContent(String(SCRIBE_CALL_LOG.id));
      });
    });

    it("closes call summary sidebar when close button is clicked", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn().mockResolvedValue({ data: { data: [SCRIBE_CALL_LOG] } }),
        error: null,
      });

      renderComponent(SessionType.CALL);

      const reviewBtn = await screen.findByTestId(`admin-logs-review-button-${SCRIBE_CALL_LOG.id}`);
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByTestId("call-summary-sidebar")).not.toBeInTheDocument();
      });
    });

    it("opens simulation summary sidebar when review button is clicked", async () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      const reviewBtn = await screen.findByTestId(
        `admin-logs-simulation-review-button-${SIMULATION_LOG.id}`,
      );
      fireEvent.click(reviewBtn);

      await waitFor(() => {
        expect(screen.getByTestId("simulation-summary-sidebar")).toBeInTheDocument();
        expect(screen.getByTestId("summary-id")).toHaveTextContent(SIMULATION_LOG.id);
      });
    });

    it("closes simulation summary sidebar when close is clicked", async () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      const reviewBtn = await screen.findByTestId(
        `admin-logs-simulation-review-button-${SIMULATION_LOG.id}`,
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
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: {
          data: Array(25)
            .fill(SCRIBE_CALL_LOG)
            .map((l, i) => ({ ...l, id: i + 1 })),
        },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
      });
    });

    it("hides 'Load More' button when result count is less than the pagination limit", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG, { ...SCRIBE_CALL_LOG, id: 2 }] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      await waitFor(() => {
        expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
      });
    });

    it("increases the offset when 'Load More' is clicked", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: {
          data: Array(25)
            .fill(SCRIBE_CALL_LOG)
            .map((l, i) => ({ ...l, id: i + 1 })),
        },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      const { updateFilters } = await import("@reducer");
      renderComponent(SessionType.CALL);

      const loadMoreBtn = await screen.findByTestId("load-more-button");
      fireEvent.click(loadMoreBtn);

      await waitFor(() => {
        expect(updateFilters).toHaveBeenCalledWith(expect.objectContaining({ offset: 25 }));
      });
    });

    it("resets logs when session type switches", async () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      const { rerender } = renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.getByText("Test Call")).toBeInTheDocument();
      });

      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [SIMULATION_LOG] },
        isLoading: false,
        refetch: vi.fn(),
      });

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <AdminLogsTable sessionType={SessionType.SIMULATION} />
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
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
        error: null,
      });

      const { rerender } = renderComponent(SessionType.CALL);

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <AdminLogsTable sessionType={SessionType.CALL} refreshKey={1} />
          </BrowserRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });

    it("refetches simulation logs when refreshKey changes", async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: { data: [] } });
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
      });

      const { rerender } = renderComponent(SessionType.SIMULATION);

      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <AdminLogsTable sessionType={SessionType.SIMULATION} refreshKey={1} />
          </BrowserRouter>
        </Provider>,
      );

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  describe("Error handling", () => {
    it("shows toast error when call-log fetch fails with a message object", async () => {
      const { toast } = await import("sonner");

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
        error: { data: { message: "Fetch failed" } },
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Fetch failed"));
      });
    });

    it("shows toast error when call-log fetch fails with a serialised error string", async () => {
      const { toast } = await import("sonner");

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
        error: { error: "Network Error" },
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Network Error"));
      });
    });

    it("shows a generic toast error when the error shape is unknown", async () => {
      const { toast } = await import("sonner");

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
        error: { status: 500 },
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("does not show toast error when there is no error", async () => {
      const { toast } = await import("sonner");

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      });

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("API query parameters", () => {
    it("passes languageCode to useGetAdminSimulationLogsQuery", () => {
      renderComponent(SessionType.SIMULATION);
      expect(mockUseGetAdminSimulationLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ languageCode: expect.any(String) }),
        expect.any(Object),
      );
    });

    it("does NOT include languageCode in admin call-logs query", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetAdminCallLogsQuery).toHaveBeenCalledWith(
        expect.not.objectContaining({ languageCode: expect.any(String) }),
        expect.any(Object),
      );
    });

    it("includes archive: false in the call-logs query", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetAdminCallLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({ archive: false }),
        expect.any(Object),
      );
    });

    it("skips call-logs query when session type is SIMULATION", () => {
      renderComponent(SessionType.SIMULATION);
      expect(mockUseGetAdminCallLogsQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: true }),
      );
    });

    it("skips simulation-logs query when session type is CALL", () => {
      renderComponent(SessionType.CALL);
      expect(mockUseGetAdminSimulationLogsQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ skip: true }),
      );
    });
  });

  describe("Custom fields", () => {
    const mockCustomFieldDef = {
      id: "cf-uuid-1",
      name: "Priority",
      fieldType: "SINGLE_SELECT",
      options: [{ id: "opt-1", label: "High", order: 0 }],
      sectionKey: "intake",
      editPermission: "BOTH",
      fillMode: "MANUAL",
      displayOrder: 0,
      showInTable: true,
      isActive: true,
    };

    it("skips definitions query when custom fields feature is disabled", () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: false } as any);
      renderComponent(SessionType.CALL);
      expect(vi.mocked(useGetCustomFieldDefinitionsQuery)).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ skip: true }),
      );
    });

    it("fetches definitions when custom fields feature is enabled", () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: true } as any);
      renderComponent(SessionType.CALL);
      expect(vi.mocked(useGetCustomFieldDefinitionsQuery)).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ skip: false }),
      );
    });

    it("renders custom field column for showInTable=true definition", async () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: true } as any);
      vi.mocked(useGetCustomFieldDefinitionsQuery).mockReturnValue({
        data: [mockCustomFieldDef],
      } as any);
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.getByTestId("cell-cf_cf-uuid-1-0")).toBeInTheDocument();
      });
    });

    it("does not render custom field column for showInTable=false definition", async () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: true } as any);
      vi.mocked(useGetCustomFieldDefinitionsQuery).mockReturnValue({
        data: [{ ...mockCustomFieldDef, showInTable: false }],
      } as any);
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      await waitFor(() => {
        expect(screen.queryByTestId("cell-cf_cf-uuid-1-0")).not.toBeInTheDocument();
      });
    });

    it("shows '+' add-field button for admin with manage permission", async () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: true } as any);
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(
        SessionType.CALL,
        undefined,
        { filters: { offset: 0 } },
        { user: { id: 1 }, permissions: ["manage:custom-field:definitions"] },
      );

      await waitFor(() => {
        expect(screen.getByTestId("admin-logs-add-field-button")).toBeInTheDocument();
      });
    });

    it("hides '+' add-field button when custom fields feature is disabled", async () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: false } as any);
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(
        SessionType.CALL,
        undefined,
        { filters: { offset: 0 } },
        { user: { id: 1 }, permissions: ["manage:custom-field:definitions"] },
      );

      await waitFor(() => {
        expect(screen.queryByTestId("admin-logs-add-field-button")).not.toBeInTheDocument();
      });
    });

    it("opens ManageCustomFieldsDialog when '+' button is clicked", async () => {
      vi.mocked(useGetCustomFieldsEnabledQuery).mockReturnValue({ data: true } as any);
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [SCRIBE_CALL_LOG] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(
        SessionType.CALL,
        undefined,
        { filters: { offset: 0 } },
        { user: { id: 1 }, permissions: ["manage:custom-field:definitions"] },
      );

      await waitFor(() => screen.getByTestId("admin-logs-add-field-button"));
      fireEvent.click(screen.getByTestId("admin-logs-add-field-button"));

      await waitFor(() => {
        expect(screen.getByTestId("manage-fields-dialog")).toBeInTheDocument();
      });
    });
  });
});
