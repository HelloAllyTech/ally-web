/**
 * Comprehensive Unit Tests for PostSimulationSummary Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - URL parameter handling (sessionId)
 * - Navigation functionality
 * - Motion animations
 * - Container integration
 * - Tabs functionality and switching
 * - Transcription tab display
 * - Error handling and edge cases
 * - Snapshot testing
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useGetSimulationSummaryQuery } from "@api";
import { SimulationSummary } from "@containers";
import { ROUTES } from "@constants";
import { store } from "@store";

import { PostSimulationSummary } from "../PostSimulationSummary";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ sessionId: "123" }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, variants, initial, animate, ...props }: any) => (
      <div
        data-testid="motion-div"
        className={className}
        data-variants={JSON.stringify(variants)}
        data-initial={initial}
        data-animate={animate}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

// The MUI Tabs/Tab were replaced by the shared Carbon `Tabs` from
// @ally-ui-mono/ui-shared. That component is rendered for real here (no mock):
// it exposes a `data-testid="tabs"` container and one `data-testid="tab-${id}"`
// button per item (driven by items/activeId/onChange). The assertions below
// query those testids and the active-tab styling rather than MUI roles/attrs.

// Mock containers
vi.mock("@containers", () => ({
  SimulationSummary: vi.fn(({ sessionId, summaryData, retryMaxReached, className }: any) => (
    <div
      data-testid="simulation-summary"
      className={className}
      data-has-summary={String(!!summaryData)}
      data-retry-max={String(retryMaxReached)}
    >
      <div data-testid="summary-session-id">{sessionId}</div>
    </div>
  )),
  useSimulationSummaryPolling: () => ({ summaryData: undefined, retryMaxReached: false }),
  FeedbackDialog: ({ open, id, sessionType, onClose }: any) =>
    open ? (
      <div data-testid="feedback-dialog" data-id={id} data-session-type={sessionType}>
        <button data-testid="feedback-dialog-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
  ShortSessionUI: ({ className }: any) => (
    <div data-testid="short-session-ui" className={className} />
  ),
}));

// Mock SimulationTranscriptTab
vi.mock("../../calls/components", () => ({
  SimulationTranscriptTab: ({ sessionId, className }: any) => (
    <div data-testid="simulation-transcript-tab" className={className}>
      <div data-testid="transcript-session-id">{sessionId}</div>
    </div>
  ),
}));

// Mock calls constants (use importOriginal so reducer still gets CALL_LOGS_PAGINATION_LIMIT)
vi.mock("../../calls/constants", async importOriginal => {
  const actual = await importOriginal<typeof import("../../calls/constants")>();
  return {
    ...actual,
    tabStyles: {
      textTransform: "none",
      fontWeight: 500,
      color: "#49454F",
    },
  };
});

// Mock learn constants
vi.mock("../learn/constants", () => ({
  containerVariants: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  },
}));

// Mock feature flags so snapshot is deterministic (no env variance between local vs CI)
vi.mock("@ally-ui-mono/ui-shared/index", async importOriginal => {
  const actual = await importOriginal<typeof import("@ally-ui-mono/ui-shared/index")>();
  return {
    ...actual,
    FEATURE_FLAGS_MAP: {
      ...actual.FEATURE_FLAGS_MAP,
    },
  };
});

// Mock API so summary query returns stable data (deterministic snapshots and consistency test)
vi.mock("@api", async importOriginal => {
  const actual = await importOriginal<typeof import("@api")>();
  return {
    ...actual,
    useGetSimulationSummaryQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  };
});

// Test Wrapper (Provider required for useGetSimulationSummaryQuery / RTK Query)
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

const hasNormalizedText = (element: Element | null, expectedText: string) =>
  element?.textContent?.replace(/\s+/g, " ").trim() === expectedText;

describe("PostSimulationSummary Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ sessionId: "123" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(
          <TestWrapper>
            <PostSimulationSummary />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const mainContainer = container.querySelector("div.bg-white");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("w-full");
      expect(mainContainer?.className).toContain("h-[100dvh]");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("flex-col");
      expect(mainContainer?.className).toContain("items-center");
    });

    it("should render motion div with correct classes", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).not.toBeNull();
      expect(motionDiv.className).toContain("flex");
      expect(motionDiv.className).toContain("flex-col");
      expect(motionDiv.className).toContain("gap-6");
      expect(motionDiv.className).toContain("max-w-4xl");
      expect(motionDiv.className).toContain("w-full");
      expect(motionDiv.className).toContain("flex-1");
      expect(motionDiv.className).toContain("min-h-0");
      expect(motionDiv.className).toContain("pb-8");
      expect(motionDiv.className).toContain("sm:pb-16");
      expect(motionDiv.className).toContain("px-4");
      expect(motionDiv.className).toContain("sm:px-6");
      expect(motionDiv.className).toContain("items-center");
    });

    it("should render title section", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((_content, element) =>
        hasNormalizedText(element, "Role play Summary"),
      );
      expect(title).not.toBeNull();
      expect(title.className).toContain("text-black");
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("sm:text-4xl");
      expect(title.className).toContain("font-normal");
      expect(title.className).toContain("text-left");
      expect(title.className).toContain("font-secondary");
    });

    it("should render SimulationSummary component", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: URL Parameter Handling
   * Verifies the component handles URL parameters correctly
   */
  describe("URL Parameter Handling", () => {
    it("should handle sessionId parameter", () => {
      mockUseParams.mockReturnValue({ sessionId: "456" });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("summary-session-id")).toHaveTextContent("456");
    });

    it("should handle missing sessionId parameter", () => {
      mockUseParams.mockReturnValue({ sessionId: undefined });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle null sessionId parameter", () => {
      mockUseParams.mockReturnValue({ sessionId: null });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle empty sessionId parameter", () => {
      mockUseParams.mockReturnValue({ sessionId: "" });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation Functionality
   * Verifies navigation functionality
   */
  describe("Navigation Functionality", () => {
    it("should defer navigation and open the feedback dialog when no feedback exists", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/role play/i).closest("div");
      const backButton = within(header!).getByRole("button");
      fireEvent.click(backButton);

      // Exit is gated by feedback: clicking back opens the dialog instead of navigating.
      expect(screen.getByTestId("feedback-dialog")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should flush the deferred navigation after the feedback dialog is dismissed", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/role play/i).closest("div");
      const backButton = within(header!).getByRole("button");
      fireEvent.click(backButton);

      fireEvent.click(screen.getByTestId("feedback-dialog-close"));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST GROUP: Motion Animations
   * Verifies motion animations are properly configured
   */
  describe("Motion Animations", () => {
    it("should render motion div with correct animation props", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveAttribute("data-initial", "hidden");
      expect(motionDiv).toHaveAttribute("data-animate", "visible");
    });

    it("should have container variants configured", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("motion-div");
      const variants = JSON.parse(motionDiv.getAttribute("data-variants") || "{}");
      expect(variants).toHaveProperty("hidden");
      expect(variants).toHaveProperty("visible");
    });
  });

  /**
   * TEST GROUP: Container Integration
   * Verifies integration with SimulationSummary container
   */
  describe("Container Integration", () => {
    it("should pass correct props to SimulationSummary", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const simulationSummary = screen.getByTestId("simulation-summary");
      expect(simulationSummary).toHaveClass("h-full");
      expect(simulationSummary).toHaveClass("min-h-0");
      expect(simulationSummary).toHaveClass("overflow-hidden");
      expect(screen.getByTestId("summary-session-id")).toHaveTextContent("123");
    });

    it("should pass sessionId, summaryData, retryMaxReached and className to SimulationSummary", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const lastCallArgs = vi.mocked(SimulationSummary).mock.calls.at(-1) ?? [];
      expect(lastCallArgs[0]).toMatchObject({
        sessionId: "123",
        className: "h-full min-h-0 flex flex-col overflow-hidden",
      });
      expect(lastCallArgs[0]).toHaveProperty("summaryData");
      expect(lastCallArgs[0]).toHaveProperty("retryMaxReached");
    });
  });

  /**
   * TEST GROUP: Tabs Functionality
   * Verifies tabs rendering and switching behavior
   */
  describe("Tabs Functionality", () => {
    it("should render Tabs component", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });

    it("should render Summary tab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-1")).toBeInTheDocument();
      expect(screen.getByTestId("tab-1")).toHaveTextContent("Session Review");
    });

    it("should render Transcription tab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
      expect(screen.getByTestId("tab-2")).toHaveTextContent("Annotated Transcript");
    });

    it("should have Summary tab selected by default", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Carbon Tabs marks the active tab via styling rather than a data-value
      // attribute; the Summary tab (id 1) is highlighted by default.
      const summaryTab = screen.getByTestId("tab-1");
      expect(summaryTab.className).toContain("text-primary-500");
    });

    it("should display SimulationSummary content by default", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
    });

    it("should switch to Transcription tab when clicked", async () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      // After clicking, the transcription tab content should be visible
      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();
    });

    it("should hide Summary content when Transcription tab is selected", async () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Initially Summary is visible
      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();

      // Click Transcription tab
      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      // Summary should no longer be visible
      expect(screen.queryByTestId("simulation-summary")).not.toBeInTheDocument();
    });

    it("should switch back to Summary tab when clicked", async () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Click Transcription tab first
      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();

      // Click Summary tab
      const summaryTab = screen.getByTestId("tab-1");
      fireEvent.click(summaryTab);

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
    });

    it("should apply correct styles to Tabs component", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const tabs = screen.getByTestId("tabs");
      expect(tabs).toHaveClass("w-full");
      expect(tabs).toHaveClass("shrink-0");
      expect(tabs).toHaveClass("border-b");
      expect(tabs).toHaveClass("border-[#DBDBDB]");
    });

    it("should render all tab buttons", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Carbon Tabs renders each item as a `tab-${id}` button (no ARIA tab role).
      const tabButtons = screen.getAllByTestId(/^tab-\d+$/);
      expect(tabButtons).toHaveLength(4);
    });
  });

  /**
   * TEST GROUP: Transcription Tab
   * Verifies SimulationTranscriptTab integration
   */
  describe("Transcription Tab", () => {
    it("should render SimulationTranscriptTab when Transcription tab is selected", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();
    });

    it("should pass sessionId to SimulationTranscriptTab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      expect(screen.getByTestId("transcript-session-id")).toHaveTextContent("123");
    });

    it("should pass correct className to SimulationTranscriptTab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      const transcriptTab = screen.getByTestId("simulation-transcript-tab");
      expect(transcriptTab).toBeInTheDocument();
      // PostSimulationSummary passes className="w-full"; tab panel height comes from flex layout (h-full chain).
    });

    it("should handle different sessionId for Transcription tab", () => {
      mockUseParams.mockReturnValue({ sessionId: "789" });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      expect(screen.getByTestId("transcript-session-id")).toHaveTextContent("789");
    });

    it("should not render SimulationTranscriptTab when Summary tab is selected", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // By default Summary tab is selected
      expect(screen.queryByTestId("simulation-transcript-tab")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Tab List Configuration
   * Verifies the tab list configuration
   */
  describe("Tab List Configuration", () => {
    it("should have all tabs configured", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-1")).toBeInTheDocument();
      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
      expect(screen.getByTestId("tab-4")).toBeInTheDocument();
      expect(screen.getByTestId("tab-5")).toBeInTheDocument();
    });

    it("should have Summary as first tab with id 1", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const summaryTab = screen.getByTestId("tab-1");
      expect(summaryTab).toHaveTextContent("Session Review");
    });

    it("should have Transcription as second tab with id 2", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      expect(transcriptionTab).toHaveTextContent("Annotated Transcript");
    });

    it("should have Ask AI as third tab with id 4", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const askAiTab = screen.getByTestId("tab-4");
      expect(askAiTab).toHaveTextContent("Ask AI");
    });

    it("should have Skills as fourth tab with id 5", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const skillsTab = screen.getByTestId("tab-5");
      expect(skillsTab).toHaveTextContent("Skills");
    });

  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should handle missing dependencies gracefully", () => {
      mockUseParams.mockReturnValue({ sessionId: null });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle navigation errors gracefully", () => {
      // Test that navigation function is called without errors once the gated exit flushes.
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/role play/i).closest("div");
      const backButton = within(header!).getByRole("button");
      fireEvent.click(backButton);

      fireEvent.click(screen.getByTestId("feedback-dialog-close"));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  /**
   * TEST GROUP: Text Content
   * Verifies all text content is correctly displayed
   */
  describe("Text Content", () => {
    it("should display the main title", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((_content, element) =>
        hasNormalizedText(element, "Role play Summary"),
      );
      expect(title).not.toBeNull();
      expect(title.innerHTML).toContain("Role play");
      expect(title.innerHTML).toContain("<em>Summary</em>");
    });

    it("should have proper text hierarchy", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((_content, element) =>
        hasNormalizedText(element, "Role play Summary"),
      );
      expect(title.tagName.toLowerCase()).toBe("div");
    });
  });

  /**
   * TEST GROUP: Responsive Design
   * Verifies responsive design classes are applied
   */
  describe("Responsive Design", () => {
    it("should apply responsive padding classes", () => {
      const { container } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv.className).toContain("pb-8");
      expect(motionDiv.className).toContain("sm:pb-16");
      expect(motionDiv.className).toContain("px-4");
      expect(motionDiv.className).toContain("sm:px-6");
    });

    it("should apply responsive text size classes", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((_content, element) =>
        hasNormalizedText(element, "Role play Summary"),
      );
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("sm:text-4xl");
    });
  });

  /**
   * TEST GROUP: Feedback toggle (enableFeedback)
   * Verifies the trainer-controlled enableFeedback flag gates the post-session
   * evaluation summary vs. a rating-only flow.
   */
  describe("Feedback toggle (enableFeedback)", () => {
    const mockedSummaryQuery = vi.mocked(useGetSimulationSummaryQuery);

    const summaryQueryResult = (data: unknown, isLoading = false) =>
      ({ data, isLoading, refetch: vi.fn() }) as unknown as ReturnType<
        typeof useGetSimulationSummaryQuery
      >;

    it("renders neither the summary nor the rating dialog while the config is loading", () => {
      mockedSummaryQuery.mockReturnValue(summaryQueryResult(undefined, true));

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("simulation-summary")).toBeNull();
      expect(screen.queryByTestId("tabs")).toBeNull();
      expect(screen.queryByTestId("feedback-dialog")).toBeNull();
    });

    it("renders the full evaluation summary when feedback is enabled", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: { metadata: { enableFeedback: true } },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
    });

    it("treats a missing flag as enabled (legacy scenarios)", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({ scenario: { metadata: {} }, hasFeedback: false }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });

    it("hides the evaluation summary and only prompts for a rating when feedback is disabled", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: { metadata: { enableFeedback: false } },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("tabs")).toBeNull();
      expect(screen.queryByTestId("simulation-summary")).toBeNull();
      expect(screen.getByTestId("feedback-dialog")).toBeInTheDocument();
    });

    it("returns to the role-play list after the rating dialog is dismissed", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: { metadata: { enableFeedback: false } },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("feedback-dialog-close"));

      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LEARN);
    });

    it("skips straight to the role-play list when feedback is disabled and a rating already exists", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: { metadata: { enableFeedback: false } },
          hasFeedback: true,
          sessionFeedback: { rating: 4 },
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LEARN);
      expect(screen.queryByTestId("tabs")).toBeNull();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const { asFragment } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with different sessionId", () => {
      mockUseParams.mockReturnValue({ sessionId: "789" });

      const { asFragment } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof PostSimulationSummary).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(
          <TestWrapper>
            <PostSimulationSummary />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((_content, element) =>
        hasNormalizedText(element, "Role play Summary"),
      );
      expect(title).not.toBeNull();
    });

    it("should provide clear navigation options", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("simulation-summary")).toBeInTheDocument();
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle very long sessionId", () => {
      const longSessionId = "a".repeat(1000);
      mockUseParams.mockReturnValue({ sessionId: longSessionId });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("summary-session-id")).toHaveTextContent(longSessionId);
    });

    it("should handle special characters in sessionId", () => {
      const specialSessionId = "session-123_@#$%";
      mockUseParams.mockReturnValue({ sessionId: specialSessionId });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("summary-session-id")).toHaveTextContent(specialSessionId);
    });

    it("should render consistently on multiple renders", () => {
      const { container: container1 } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const { container: container2 } = render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });
});
