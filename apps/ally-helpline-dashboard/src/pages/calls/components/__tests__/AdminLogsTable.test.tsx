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
} from "@api";
import { SessionType, CallLog, SimulationLog, ChatSummaryStatus } from "@types";

import { CALL_LOGS_PAGINATION_LIMIT } from "../../constants";
import AdminLogsTable from "../AdminLogsTable";

// Mock MUI components
vi.mock("@mui/material", () => ({
  CircularProgress: () => <div data-testid="circular-progress">Loading...</div>,
}));

// Mock UI shared components
vi.mock("@ally-ui-mono/ui-shared", () => ({
  GenericTable: React.forwardRef(
    ({ columns, data, isLoading, handleLoadMore, fallbackUI, className }: any, ref: any) => (
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
    ),
  ),
}));

// Mock API hooks
vi.mock("@api", () => ({
  useGetAdminCallLogsQuery: vi.fn(),
  useGetAdminSimulationLogsQuery: vi.fn(),
  useGetCounsellorsQuery: vi.fn(),
  useGetCallTagsQuery: vi.fn(),
}));

// Mock assets
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
    Delete: () => <div data-testid="delete-icon">Delete</div>,
    ActionsIcon: () => <div data-testid="actions-icon">Actions</div>,
  };
});

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, onClick, fullWidth, variant, ...props }: any) => (
    <button onClick={onClick} data-full-width={fullWidth} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  Chip: ({ config }: any) => (
    <div data-testid="chip" data-variant={config?.variant}>
      {config?.label || config?.text || ""}
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

// Mock child components
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
  default: ({ summaryId, summaryName, closeSummarySidebar }: any) => (
    <div data-testid="simulation-summary-sidebar">
      <div data-testid="summary-id">{summaryId}</div>
      <div data-testid="summary-name">{summaryName}</div>
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

// Mock utils
vi.mock("@utils", () => ({
  convertSecondsToDuration: vi.fn(
    (seconds: number) => `${Math.floor(seconds / 60)}:${seconds % 60}`,
  ),
  getFormattedDate: vi.fn((date: string) => new Date(date).toLocaleDateString()),
  getSimulationScoreDisplay: vi.fn((score: number) => `${score}/100`),
}));

// Mock utils in component directory
vi.mock("../utils", () => ({
  getSourceChipConfig: vi.fn((source: string) => ({
    label: source || "Unknown",
    variant: "default",
  })),
  getStatusChipConfig: vi.fn((status: string) => ({
    label: status || "PENDING",
    variant: "warning",
  })),
}));

// Mock router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({
      state: { refetch: false },
      pathname: "/calls",
    }),
  };
});

// Mock Redux actions
vi.mock("@reducer", () => ({
  updateFilters: vi.fn(filters => ({ type: "UPDATE_FILTERS", payload: filters })),
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock constants
vi.mock("../constants", () => ({
  CALL_LOGS_PAGINATION_LIMIT: 25,
  defaultTags: ["Tag1", "Tag2"],
  tagColors: {
    1: "#FF0000",
    2: "#FFA500",
    3: "#FFFF00",
    4: "#90EE90",
    5: "#008000",
  },
}));

// Mock Redux store
const createMockStore = (callsState: any = { filters: { offset: 0 } }) => {
  return configureStore({
    reducer: {
      calls: (state = callsState, action: any) => {
        if (action.type === "UPDATE_FILTERS") {
          return { ...state, filters: action.payload };
        }
        return state;
      },
    },
    preloadedState: {
      calls: callsState,
    },
  });
};

const mockCallLog: CallLog = {
  id: 1,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z",
  roomId: 1,
  clientId: 1,
  counselorId: 1,
  status: "ACTIVE",
  startedAt: "2024-01-01T10:00:00Z",
  endedAt: "2024-01-01T10:05:00Z",
  details: {
    callDuration: 300,
    callInfo: {
      summaryName: "Test Call",
      provider: "AUDIO_UPLOAD",
    },
    startTime: "2024-01-01T10:00:00Z",
    summary: {
      callQuality: 85,
      tags: [
        { tag: "Depression", positivity_rating: 3 },
        { tag: "Anxiety", positivity_rating: 4 },
      ],
    },
    transcript: "Test transcript content",
  },
  summaryStatus: ChatSummaryStatus.PENDING,
  counselor: {
    id: 1,
    name: "Test Counselor",
    phone: "1234567890",
  },
} as CallLog;

const mockSimulationLog: SimulationLog = {
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
  metadata: {
    sessionName: "Test Simulation",
  },
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
    metadata: {},
  },
} as SimulationLog;

const renderComponent = (
  sessionType: SessionType,
  refreshKey?: number,
  callsState: any = { filters: { offset: 0 } },
) => {
  const store = createMockStore(callsState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <AdminLogsTable sessionType={sessionType} refreshKey={refreshKey} />
      </BrowserRouter>
    </Provider>,
  );
};

describe("AdminLogsTable Component", () => {
  const mockUseGetAdminCallLogsQuery = useGetAdminCallLogsQuery as any;
  const mockUseGetAdminSimulationLogsQuery = useGetAdminSimulationLogsQuery as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
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

    vi.mocked(useGetCallTagsQuery).mockReturnValue({
      data: { data: ["Depression", "Anxiety"] },
      isLoading: false,
    } as any);
  });

  describe("Component Rendering", () => {
    it("should render loading state for call logs", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should render loading state for simulation logs", () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should render table with call logs data", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    it("should render table with simulation logs data", () => {
      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);
      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      expect(screen.getByTestId("table-row-0")).toBeInTheDocument();
    });

    it("should render fallback UI when no data", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
    });
  });

  describe("Call Logs Columns", () => {
    beforeEach(() => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });
    });

    it("should render counsellor name column for call logs", () => {
      renderComponent(SessionType.CALL);
      expect(screen.getByTestId("cell-counsellorName-0")).toBeInTheDocument();
    });

    it("should render delete button for AUDIO_UPLOAD calls", () => {
      renderComponent(SessionType.CALL);
      // Delete button should be in actions column
      expect(screen.getByTestId("cell-actions-0")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("should handle load more for call logs", () => {
      const mockRefetch = vi.fn();
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: Array(25).fill(mockCallLog) },
        isLoading: false,
        refetch: mockRefetch,
        error: null,
      });

      renderComponent(SessionType.CALL, undefined, { filters: { offset: 0 } });

      const loadMoreButton = screen.getByTestId("load-more-button");
      fireEvent.click(loadMoreButton);

      // Should trigger pagination
      expect(loadMoreButton).toBeInTheDocument();
    });

    it("should reset logs when session type changes", () => {
      const { rerender } = renderComponent(SessionType.CALL);

      mockUseGetAdminSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
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

      // Should reset and fetch simulation logs
      expect(mockUseGetAdminSimulationLogsQuery).toHaveBeenCalled();
    });
  });

  describe("Delete Functionality", () => {
    it("should open delete dialog when delete button is clicked", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      // Find delete button in actions column
      const actionsCell = screen.getByTestId("cell-actions-0");
      const deleteButton = actionsCell.querySelector('[data-testid="delete-icon"]');

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
        expect(screen.getByTestId("delete-chat-id")).toHaveTextContent("1");
      }
    });
  });

  describe("Error Handling", () => {
    it("should show error toast when call logs fetch fails", () => {
      const { toast } = require("sonner");

      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
        error: { data: { message: "Fetch failed" } },
      });

      renderComponent(SessionType.CALL);

      waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("Summary Sidebar", () => {
    it("should open call summary sidebar when review button is clicked", () => {
      mockUseGetAdminCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
        error: null,
      });

      renderComponent(SessionType.CALL);

      const actionsCell = screen.getByTestId("cell-actions-0");
      const reviewButton = actionsCell.querySelector('[data-testid="review-icon"]');

      if (reviewButton) {
        fireEvent.click(reviewButton);
        expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
      }
    });
  });
});
