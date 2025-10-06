import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useGetCallLogsQuery, useGetSimulationLogsQuery } from "@api";
import { SessionType, CallLog, SimulationLog, ChatSummaryStatus } from "@types";

import { CALL_LOGS_PAGINATION_LIMIT } from "../../constants";
import CallLogsTable from "../CallLogsTable";

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
              <div key={col.key} data-testid={`cell-${col.key}`}>
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
  useGetCallLogsQuery: vi.fn(),
  useGetSimulationLogsQuery: vi.fn(),
}));

// Mock assets
vi.mock("@assets", () => ({
  NoResults: () => <div data-testid="no-results-icon">No Results</div>,
  CallIdIcon: () => <div data-testid="call-id-icon">Call ID</div>,
  DateIcon: () => <div data-testid="date-icon">Date</div>,
  TimerIcon: () => <div data-testid="timer-icon">Timer</div>,
  TagsIcon: () => <div data-testid="tags-icon">Tags</div>,
  ReviewIcon: () => <div data-testid="review-icon">Review</div>,
  SummaryGenerationIcon: () => <div data-testid="summary-generation-icon">Summary</div>,
  ScenarioIcon: () => <div data-testid="scenario-icon">Scenario</div>,
  SessionScoreIcon: () => <div data-testid="session-score-icon">Score</div>,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  EndSessionIllustration: "EndSessionIllustration",
  Focus: "Focus",
  PauseIcon: "PauseIcon",
  Warning: "Warning",
  Lock: "Lock",
  Enhance: "Enhance",
  Mindfulness: "Mindfulness",
  Flower: "Flower",
  LoginImage: "LoginImage",
  DefaultCallProfile: "DefaultCallProfile",
  InDoubt: () => <div data-testid="in-doubt-icon">In Doubt</div>,
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, onClick, fullWidth, variant, ...props }: any) => (
    <button onClick={onClick} data-full-width={fullWidth} data-variant={variant} {...props}>
      {children}
    </button>
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
  FallbackUI: ({ image, mainMessage, description, className }: any) => (
    <div className={className} data-testid="fallback-ui">
      {image}
      <div data-testid="fallback-message">{mainMessage}</div>
      <div data-testid="fallback-description">{description}</div>
    </div>
  ),
  SummaryStatusChip: ({ status }: any) => (
    <div data-testid="summary-status-chip" data-status={status}>
      {status || "PENDING"}
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

// Mock utils
vi.mock("@utils", () => ({
  convertSecondsToDuration: vi.fn(
    (seconds: number) => `${Math.floor(seconds / 60)}:${seconds % 60}`,
  ),
  getFormattedDate: vi.fn((date: string) => new Date(date).toLocaleDateString()),
  getSimulationScoreDisplay: vi.fn((score: number) => `${score}/100`),
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

// Mock Redux store
const createMockStore = (callsState: any = { filters: { offset: 0 } }) => {
  return configureStore({
    reducer: {
      calls: (state = callsState, action) => state,
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
  client: {
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:00:00Z",
    id: 1,
    email: "client@test.com",
    name: "Test Client",
    role: "CLIENT",
    status: "ACTIVE",
    username: "testclient",
    phone: "1234567890",
    metadata: {},
  },
  counselor: {
    id: 1,
    name: "Test Counselor",
    phone: "1234567890",
  },
};

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
};

const renderComponent = (
  sessionType: SessionType,
  refreshKey?: number,
  callsState: any = { filters: { offset: 0 } },
) => {
  const store = createMockStore(callsState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <CallLogsTable sessionType={sessionType} refreshKey={refreshKey} />
      </BrowserRouter>
    </Provider>,
  );
};

describe("CallLogsTable Component", () => {
  const mockUseGetCallLogsQuery = useGetCallLogsQuery as any;
  const mockUseGetSimulationLogsQuery = useGetSimulationLogsQuery as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
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
  });

  describe("Component Rendering", () => {
    it("should render loading state for call logs", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should render loading state for simulation logs", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should render call logs table with data", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      expect(screen.getByText("Test Call")).toBeInTheDocument();
    });

    it("should render simulation logs table with data", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      expect(screen.getByText("Test Simulation")).toBeInTheDocument();
    });
  });

  describe("Call Logs Display", () => {
    beforeEach(() => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should display call log data correctly", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByText("Test Call")).toBeInTheDocument();
      // Check that the summary status chip is rendered
      expect(screen.getByTestId("summary-status-chip")).toBeInTheDocument();
      expect(screen.getByText("PENDING")).toBeInTheDocument();
    });

    it("should render tag group for call logs", () => {
      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("tag-group")).toBeInTheDocument();
      expect(screen.getByText("Depression")).toBeInTheDocument();
      expect(screen.getByText("Anxiety")).toBeInTheDocument();
    });

    it("should handle call logs without details", () => {
      const callLogWithoutDetails: CallLog = {
        id: 2,
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
        roomId: 2,
        clientId: 2,
        counselorId: 2,
        status: "ACTIVE",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:05:00Z",
        details: null,
        summaryStatus: ChatSummaryStatus.PENDING,
        client: {
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:00:00Z",
          id: 2,
          email: "client2@test.com",
          name: "Test Client 2",
          role: "CLIENT",
          status: "ACTIVE",
          username: "testclient2",
          phone: "1234567891",
          metadata: {},
        },
        counselor: {
          id: 2,
          name: "Test Counselor 2",
          phone: "1234567891",
        },
      };

      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [callLogWithoutDetails] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });
  });

  describe("Simulation Logs Display", () => {
    beforeEach(() => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should display simulation log data correctly", () => {
      renderComponent(SessionType.SIMULATION);

      expect(screen.getByText("Test Simulation")).toBeInTheDocument();
      expect(screen.getByText("Test Scenario")).toBeInTheDocument();
    });

    it("should calculate duration correctly for simulation logs", () => {
      renderComponent(SessionType.SIMULATION);

      // Duration should be 5 minutes (300 seconds)
      expect(screen.getByText("5:0")).toBeInTheDocument();
    });
  });

  describe("Fallback UI", () => {
    it("should show fallback UI for empty call logs", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      expect(screen.getByText("No call records found")).toBeInTheDocument();
      expect(
        screen.getByText("Your recent calls and insights will be listed here."),
      ).toBeInTheDocument();
    });

    it("should show fallback UI for empty simulation logs", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      expect(screen.getByText("No simulation records found")).toBeInTheDocument();
      expect(screen.getByText("Your recent simulations will be listed here.")).toBeInTheDocument();
    });
  });

  describe("Pagination", () => {
    it("should show load more button when there are more items", () => {
      const multipleCallLogs = Array.from({ length: CALL_LOGS_PAGINATION_LIMIT }, (_, i) => ({
        ...mockCallLog,
        id: i + 1,
      }));

      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: multipleCallLogs },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("load-more-button")).toBeInTheDocument();
    });

    it("should not show load more button when there are no more items", () => {
      const fewCallLogs = Array.from({ length: 5 }, (_, i) => ({
        ...mockCallLog,
        id: i + 1,
      }));

      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: fewCallLogs },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.queryByTestId("load-more-button")).not.toBeInTheDocument();
    });
  });

  describe("Summary Sidebar", () => {
    it("should open call summary sidebar when summary button is clicked", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      const summaryButton = screen.getByTestId("review-icon").closest("button");
      fireEvent.click(summaryButton!);

      expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("call-summary-id")).toHaveTextContent("1");
    });

    it("should open simulation summary sidebar when summary button is clicked", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      const summaryButton = screen.getByTestId("review-icon").closest("button");
      fireEvent.click(summaryButton!);

      expect(screen.getByTestId("simulation-summary-sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("summary-id")).toHaveTextContent("sim-1");
    });

    it("should close summary sidebar when close button is clicked", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      // Open sidebar
      const summaryButton = screen.getByTestId("review-icon").closest("button");
      fireEvent.click(summaryButton!);

      expect(screen.getByTestId("call-summary-sidebar")).toBeInTheDocument();

      // Close sidebar
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("call-summary-sidebar")).not.toBeInTheDocument();
    });
  });

  describe("Data Processing", () => {
    it("should process call log data correctly", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      // Check that the processed data is displayed
      expect(screen.getByText("Test Call")).toBeInTheDocument();
      expect(screen.getByText("5:0")).toBeInTheDocument(); // Duration
    });

    it("should process simulation log data correctly", () => {
      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [mockSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      // Check that the processed data is displayed
      expect(screen.getByText("Test Simulation")).toBeInTheDocument();
      expect(screen.getByText("Test Scenario")).toBeInTheDocument();
      expect(screen.getByText("85/100")).toBeInTheDocument(); // Score
    });
  });

  describe("Session Type Switching", () => {
    it("should reset data when switching session types", () => {
      const { rerender } = renderComponent(SessionType.CALL);

      // Switch to simulation
      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <CallLogsTable sessionType={SessionType.SIMULATION} />
          </BrowserRouter>
        </Provider>,
      );

      // Should not show call data
      expect(screen.queryByText("Test Call")).not.toBeInTheDocument();
    });
  });

  describe("Refresh Functionality", () => {
    it("should refetch data when refreshKey changes", () => {
      const mockRefetch = vi.fn();
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: mockRefetch,
      });

      const { rerender } = renderComponent(SessionType.CALL);

      // Change refreshKey
      rerender(
        <Provider store={createMockStore({ filters: { offset: 0 } })}>
          <BrowserRouter>
            <CallLogsTable sessionType={SessionType.CALL} refreshKey={1} />
          </BrowserRouter>
        </Provider>,
      );

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing call log details gracefully", () => {
      const incompleteCallLog: CallLog = {
        id: 3,
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
        roomId: 3,
        clientId: 3,
        counselorId: 3,
        status: "ACTIVE",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:05:00Z",
        details: {
          callDuration: 0,
          callInfo: null,
          startTime: null,
          summary: null,
          transcript: "",
        },
        summaryStatus: ChatSummaryStatus.PENDING,
        client: {
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:00:00Z",
          id: 3,
          email: "client3@test.com",
          name: "Test Client 3",
          role: "CLIENT",
          status: "ACTIVE",
          username: "testclient3",
          phone: "1234567892",
          metadata: {},
        },
        counselor: {
          id: 3,
          name: "Test Counselor 3",
          phone: "1234567892",
        },
      };

      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [incompleteCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });

    it("should handle missing simulation log data gracefully", () => {
      const incompleteSimulationLog: SimulationLog = {
        id: "incomplete-sim",
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
        tenantId: "tenant-1",
        roomId: "room-1",
        scenarioId: 1,
        counselorId: 1,
        status: "ACTIVE",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:05:00Z",
        score: 0,
        metadata: {
          sessionName: "Incomplete Simulation",
        },
        scenario: {
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:00:00Z",
          id: 1,
          title: "Incomplete Scenario",
          scenario: "incomplete-scenario",
          description: "Incomplete scenario description",
          coverImageUrl: "incomplete-image.jpg",
          status: "ACTIVE",
          prompt: "Incomplete prompt",
          metadata: {},
        },
      };

      mockUseGetSimulationLogsQuery.mockReturnValue({
        data: { data: [incompleteSimulationLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.SIMULATION);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper table structure", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
    });

    it("should have accessible buttons", () => {
      mockUseGetCallLogsQuery.mockReturnValue({
        data: { data: [mockCallLog] },
        isLoading: false,
        refetch: vi.fn(),
      });

      renderComponent(SessionType.CALL);

      const summaryButton = screen.getByTestId("review-icon").closest("button");
      expect(summaryButton).toBeInTheDocument();
    });
  });
});
