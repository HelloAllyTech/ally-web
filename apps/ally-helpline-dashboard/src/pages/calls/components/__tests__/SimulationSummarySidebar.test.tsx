import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { Permissions } from "@constants";
import { setPermissions } from "@reducer/userReducer";
import { store } from "@store";
import { UserRole } from "@types";

import { SUMMARY_FEEDBACK_TIMEOUT } from "../constants";
import SimulationSummarySidebar from "../SimulationSummarySidebar";

// Overridable per-test so we can drive the short-session branch. Default mirrors
// the previous fixed mock (a normal, in-progress session).
const mockPolling = vi.hoisted(() =>
  vi.fn(() => ({ summaryData: undefined, retryMaxReached: false, isShortSession: false })),
);

// Mock feature flags
vi.mock("@ally-ui-mono/ui-shared", async () => {
  const actual = await vi.importActual("@ally-ui-mono/ui-shared");
  return {
    ...actual,
    FEATURE_FLAGS_MAP: {
      ...(actual as any).FEATURE_FLAGS_MAP,
    },
  };
});

// Mock containers
vi.mock("@containers", () => ({
  FeedbackDialog: ({ open, onClose, id, sessionType }: any) => (
    <div data-testid="feedback-dialog" style={{ display: open ? "block" : "none" }}>
      <div data-testid="feedback-id">{id}</div>
      <div data-testid="feedback-session-type">{sessionType}</div>
      <button onClick={onClose} data-testid="close-feedback">
        Close
      </button>
    </div>
  ),
  SimulationSummary: ({ sessionId, summaryData, retryMaxReached }: any) => (
    <div data-testid="simulation-summary">
      <div data-testid="simulation-summary-session-id">{sessionId}</div>
      <div data-testid="simulation-summary-has-data">{String(!!summaryData)}</div>
      <div data-testid="simulation-summary-retry-max">{String(retryMaxReached)}</div>
    </div>
  ),
  useSimulationSummaryPolling: mockPolling,
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useUser: () => ({
    user: { role: UserRole.COUNSELLOR },
  }),
  useDebounce: (callback: any) => callback,
  useSendMessage: () => ({
    messages: [],
    isStreaming: false,
    sendMessage: vi.fn(),
  }),
  useClickOutside: () => vi.fn(),
}));

// Mock child components
vi.mock("../SummarySidebarWrapper", () => ({
  SummarySidebarWrapper: ({ onSidebarClose, tabList, title, children }: any) => (
    <div data-testid="summary-sidebar-wrapper">
      <div data-testid="sidebar-title">{title}</div>
      <button onClick={onSidebarClose} data-testid="close-sidebar">
        Close Sidebar
      </button>
      {tabList?.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          <div data-testid={`tab-label-${tab.id}`}>{tab.label}</div>
          {tab.content}
        </div>
      ))}
      {children}
    </div>
  ),
  default: ({ onSidebarClose, tabList, title, children }: any) => (
    <div data-testid="summary-sidebar-wrapper">
      <div data-testid="sidebar-title">{title}</div>
      <button onClick={onSidebarClose} data-testid="close-sidebar">
        Close Sidebar
      </button>
      {tabList?.map((tab: any) => (
        <div key={tab.id} data-testid={`tab-${tab.id}`}>
          <div data-testid={`tab-label-${tab.id}`}>{tab.label}</div>
          {tab.content}
        </div>
      ))}
      {children}
    </div>
  ),
}));

vi.mock("../SimulationTranscriptTab", () => ({
  SimulationTranscriptTab: ({ sessionId }: any) => (
    <div data-testid="simulation-transcript-tab">
      <div data-testid="transcript-session-id">{sessionId}</div>
    </div>
  ),
  default: ({ sessionId }: any) => (
    <div data-testid="simulation-transcript-tab">
      <div data-testid="transcript-session-id">{sessionId}</div>
    </div>
  ),
}));

const renderComponent = (
  summaryId: string = "test-summary-id",
  summaryName: string = "Test Simulation Summary",
  userRole: UserRole = UserRole.COUNSELLOR,
) => {
  const mockCloseSummarySidebar = vi.fn();

  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>
          <SimulationSummarySidebar
            summaryId={summaryId}
            closeSummarySidebar={mockCloseSummarySidebar}
          />
        </BrowserRouter>
      </Provider>,
    ),
    mockCloseSummarySidebar,
  };
};

describe("SimulationSummarySidebar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // clearAllMocks keeps mockReturnValue, so restore the default explicitly.
    mockPolling.mockReturnValue({
      summaryData: undefined,
      retryMaxReached: false,
      isShortSession: false,
    });
    store.dispatch(setPermissions([]));
  });

  afterEach(() => {
    vi.useRealTimers();
    store.dispatch(setPermissions([]));
  });

  describe("Component Rendering", () => {
    it("should render sidebar with correct title", () => {
      renderComponent();

      expect(screen.getByTestId("summary-sidebar-wrapper")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar-title")).toBeInTheDocument();
    });

    it("should render tabs correctly", () => {
      renderComponent();

      expect(screen.getByTestId("tab-1")).toBeInTheDocument();
      expect(screen.getByTestId("tab-label-1")).toHaveTextContent("Session Review");
      expect(screen.getByTestId("tab-3")).toBeInTheDocument();
      expect(screen.getByTestId("tab-label-3")).toHaveTextContent("Annotated Transcript");
      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
      expect(screen.getByTestId("tab-label-2")).toHaveTextContent("Ask AI");
      // Skills Demonstrated was switched off platform-wide (2026-08-24).
      expect(screen.queryByTestId("tab-5")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-4")).not.toBeInTheDocument();
    });

    it("should render simulation summary component in summary tab", () => {
      renderComponent();

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
      expect(screen.getByTestId("simulation-summary-session-id")).toHaveTextContent(
        "test-summary-id",
      );
    });

    it("should render simulation transcript tab", () => {
      renderComponent();

      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();
      expect(screen.getByTestId("transcript-session-id")).toHaveTextContent("test-summary-id");
    });
  });

  describe("Feedback Dialog", () => {
    it.skip("should show feedback dialog when closing sidebar after threshold time", async () => {
      const { mockCloseSummarySidebar } = renderComponent();

      // Fast forward time to exceed threshold
      act(() => {
        vi.advanceTimersByTime(SUMMARY_FEEDBACK_TIMEOUT + 1000);
      });

      const closeButton = screen.getByTestId("close-sidebar");
      fireEvent.click(closeButton);

      await waitFor(
        () => {
          expect(screen.getByTestId("feedback-dialog")).toBeVisible();
          expect(screen.getByTestId("feedback-id")).toHaveTextContent("test-summary-id");
          expect(screen.getByTestId("feedback-session-type")).toHaveTextContent("SIMULATION");
        },
        { timeout: 10000 },
      );
    });

    it.skip("should not show feedback dialog when feedback already added", async () => {
      const { mockCloseSummarySidebar } = renderComponent();

      // When useSimulationSummaryPolling returns summaryData with hasFeedback, sidebar
      // sets hasFeedback.current and closing should not show dialog.

      act(() => {
        vi.advanceTimersByTime(SUMMARY_FEEDBACK_TIMEOUT + 1000);
      });

      const closeButton = screen.getByTestId("close-sidebar");
      fireEvent.click(closeButton);

      await waitFor(
        () => {
          expect(screen.queryByTestId("feedback-dialog")).not.toBeVisible();
          expect(mockCloseSummarySidebar).toHaveBeenCalled();
        },
        { timeout: 10000 },
      );
    });

    it.skip("should not show feedback dialog for admin users", async () => {
      const { mockCloseSummarySidebar } = renderComponent(
        "test-id",
        "Test Summary",
        UserRole.ADMIN,
      );

      // Fast forward time to exceed threshold
      act(() => {
        vi.advanceTimersByTime(SUMMARY_FEEDBACK_TIMEOUT + 1000);
      });

      const closeButton = screen.getByTestId("close-sidebar");
      fireEvent.click(closeButton);

      await waitFor(
        () => {
          expect(screen.queryByTestId("feedback-dialog")).not.toBeVisible();
          expect(mockCloseSummarySidebar).toHaveBeenCalled();
        },
        { timeout: 10000 },
      );
    });

    it("should not show feedback dialog when threshold not elapsed", () => {
      const { mockCloseSummarySidebar } = renderComponent();

      const closeButton = screen.getByTestId("close-sidebar");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("feedback-dialog")).not.toBeVisible();
      expect(mockCloseSummarySidebar).toHaveBeenCalled();
    });

    it("fires the feedback close-guard for a normal session with edit permission and no feedback", () => {
      mockPolling.mockReturnValue({
        summaryData: undefined,
        retryMaxReached: false,
        isShortSession: false,
      });
      store.dispatch(setPermissions([Permissions.EDIT_SCENARIO_SESSION]));

      const { mockCloseSummarySidebar } = renderComponent();
      fireEvent.click(screen.getByTestId("close-sidebar"));

      // Guard intercepts the close and opens the rating dialog instead.
      expect(screen.getByTestId("feedback-dialog")).toBeVisible();
      expect(mockCloseSummarySidebar).not.toHaveBeenCalled();
    });

    it("closes a short session directly instead of getting stuck on the feedback guard", () => {
      // Regression: the close-guard used to fire for short sessions too, opening
      // a FeedbackDialog that SummarySidebarWrapper never mounts in the
      // short-session branch — so the drawer's X / outside-click did nothing.
      mockPolling.mockReturnValue({
        summaryData: undefined,
        retryMaxReached: false,
        isShortSession: true,
      });
      store.dispatch(setPermissions([Permissions.EDIT_SCENARIO_SESSION]));

      const { mockCloseSummarySidebar } = renderComponent();
      fireEvent.click(screen.getByTestId("close-sidebar"));

      expect(mockCloseSummarySidebar).toHaveBeenCalled();
      expect(screen.queryByTestId("feedback-dialog")).not.toBeVisible();
    });

    it.skip("should close feedback dialog and call closeSummarySidebar", async () => {
      const { mockCloseSummarySidebar } = renderComponent();

      // Fast forward time to exceed threshold
      act(() => {
        vi.advanceTimersByTime(SUMMARY_FEEDBACK_TIMEOUT + 1000);
      });

      const closeButton = screen.getByTestId("close-sidebar");
      fireEvent.click(closeButton);

      await waitFor(
        () => {
          expect(screen.getByTestId("feedback-dialog")).toBeVisible();
        },
        { timeout: 10000 },
      );

      const closeFeedbackButton = screen.getByTestId("close-feedback");
      fireEvent.click(closeFeedbackButton);

      expect(mockCloseSummarySidebar).toHaveBeenCalled();
    });
  });

  describe("Summary Content", () => {
    it("should render simulation summary with polling data from hook", () => {
      renderComponent();

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
      expect(screen.getByTestId("simulation-summary-session-id")).toHaveTextContent(
        "test-summary-id",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty summary id", () => {
      renderComponent("");

      expect(screen.getByTestId("summary-sidebar-wrapper")).toBeInTheDocument();
    });

    it("should handle empty summary name", () => {
      renderComponent("test-id", "");

      expect(screen.getByTestId("summary-sidebar-wrapper")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button structure", () => {
      renderComponent();

      expect(screen.getByTestId("close-sidebar")).toBeInTheDocument();
    });

    it("should have proper dialog structure", () => {
      renderComponent();

      // Dialog should be rendered but not visible initially
      expect(screen.getByTestId("feedback-dialog")).toBeInTheDocument();
    });
  });
});
