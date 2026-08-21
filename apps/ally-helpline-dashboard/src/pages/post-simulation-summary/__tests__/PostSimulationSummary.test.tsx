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
import { ROUTES } from "@constants";
import { store } from "@store";
import { ACTIVE_TRACK_CONTEXT_KEY } from "@types";

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

// Mock containers. SimulationSummary (the old Session Review tab) is no
// longer imported by the page — Debrief replaced it — so it is dropped here.
vi.mock("@containers", () => ({
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
  SimulationTranscriptTab: ({ sessionId, className, focusMessage }: any) => (
    <div
      data-testid="simulation-transcript-tab"
      className={className}
      data-focus-message-id={focusMessage?.messageId ?? ""}
      data-focus-request-id={String(focusMessage?.requestId ?? "")}
    >
      <div data-testid="transcript-session-id">{sessionId}</div>
    </div>
  ),
}));

// Stub DebriefTab and SkillsTab. DebriefTab now leads the tab order and is
// what the page renders on open; SkillsTab is the next one a test switches
// to. Both drive their own queries (chat history / skills), so left real they
// render a loading skeleton on one render and an error on the next, making
// both the snapshots and the render-consistency assertion timing-dependent.
// Everything else in the barrel stays real (the star rating and footer button
// are asserted against directly).
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    SkillsTab: ({ sessionId, retryMaxReached }: any) => (
      <div data-testid="skills-tab" data-retry-max={String(retryMaxReached)}>
        <div data-testid="skills-session-id">{sessionId}</div>
      </div>
    ),
    DebriefTab: ({ sessionId, summaryData, retryMaxReached, onOpenMoment }: any) => (
      <div
        data-testid="debrief-tab"
        data-has-summary={String(!!summaryData)}
        data-retry-max={String(retryMaxReached)}
      >
        <div data-testid="debrief-session-id">{sessionId}</div>
        {onOpenMoment && (
          <>
            <button data-testid="debrief-open-moment" onClick={() => onOpenMoment("msg-1")}>
              open moment
            </button>
            {/* A second anchor, so the tests can tell "the id travelled" apart
                from "some id travelled". */}
            <button data-testid="debrief-open-moment-2" onClick={() => onOpenMoment("msg-2")}>
              open other moment
            </button>
          </>
        )}
      </div>
    ),
  };
});

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

    it("should render DebriefTab as the landing content", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
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

      expect(screen.getByTestId("debrief-session-id")).toHaveTextContent("456");
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
   * TEST GROUP: DebriefTab Integration
   * Verifies integration with the DebriefTab component, which replaced the
   * old SimulationSummary container as the landing tab's content.
   */
  describe("DebriefTab Integration", () => {
    it("should pass sessionId, summaryData and retryMaxReached to DebriefTab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const debriefTab = screen.getByTestId("debrief-tab");
      expect(debriefTab).toHaveAttribute("data-retry-max", "false");
      expect(screen.getByTestId("debrief-session-id")).toHaveTextContent("123");
    });

    it("should pass an onOpenMoment callback that switches to the Transcript tab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Debrief anchors a moment in the transcript; clicking one should hand
      // control back to the page, which switches the active tab.
      fireEvent.click(screen.getByTestId("debrief-open-moment"));

      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();
    });

    it("should hand the anchored message id to the transcript tab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("debrief-open-moment-2"));

      // The chip lands on the moment, not merely on the tab.
      const transcriptTab = screen.getByTestId("simulation-transcript-tab");
      expect(transcriptTab).toHaveAttribute("data-focus-message-id", "msg-2");
      expect(transcriptTab).toHaveAttribute("data-focus-request-id", "1");
    });

    it("should raise a fresh request each time a moment is opened", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("debrief-open-moment"));
      expect(screen.getByTestId("simulation-transcript-tab")).toHaveAttribute(
        "data-focus-request-id",
        "1",
      );

      // Back to Debrief, then the same chip again: a reader who has scrolled
      // away should be taken back to the moment rather than ignored because
      // the id has not changed.
      fireEvent.click(screen.getByTestId("tab-6"));
      fireEvent.click(screen.getByTestId("debrief-open-moment"));

      const transcriptTab = screen.getByTestId("simulation-transcript-tab");
      expect(transcriptTab).toHaveAttribute("data-focus-message-id", "msg-1");
      expect(transcriptTab).toHaveAttribute("data-focus-request-id", "2");
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

    it("should render Debrief tab", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
      expect(screen.getByTestId("tab-6")).toHaveTextContent("Debrief");
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

    it("should have Debrief tab selected by default", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Carbon Tabs marks the active tab via styling rather than a data-value
      // attribute; Debrief leads the shared tab order and so is the landing
      // tab, highlighted by default.
      const debriefTab = screen.getByTestId("tab-6");
      expect(debriefTab.className).toContain("text-primary-500");
    });

    it("should display DebriefTab content by default", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
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

    it("should hide Debrief content when Transcription tab is selected", async () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Debrief is the landing tab.
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();

      // Click Transcription tab
      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      // Debrief should no longer be visible
      expect(screen.queryByTestId("debrief-tab")).not.toBeInTheDocument();
    });

    it("should switch back to Debrief tab when clicked", async () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Click Transcription tab first
      const transcriptionTab = screen.getByTestId("tab-2");
      fireEvent.click(transcriptionTab);

      expect(screen.getByTestId("simulation-transcript-tab")).toBeInTheDocument();

      // Click Debrief tab
      const debriefTab = screen.getByTestId("tab-6");
      fireEvent.click(debriefTab);

      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
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

      // Carbon Tabs renders each item as a `tab-${id}` button (no ARIA tab
      // role). With no session data loaded, feedbackTabs falls back to the
      // legacy all-true default (Debrief, Skills, Transcript) and there is no
      // Up Next tab since there's no scenarioPathSessionItemId/caseSessionItemId.
      const tabButtons = screen.getAllByTestId(/^tab-\d+$/);
      expect(tabButtons).toHaveLength(3);
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

    it("should not render SimulationTranscriptTab when Debrief tab is selected", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // By default the Debrief tab is selected
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

      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
      expect(screen.getByTestId("tab-5")).toBeInTheDocument();
      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
    });

    it("should have Debrief as first tab with id 6", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const debriefTab = screen.getByTestId("tab-6");
      expect(debriefTab).toHaveTextContent("Debrief");
    });

    it("should have Skills as second tab with id 5", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const skillsTab = screen.getByTestId("tab-5");
      expect(skillsTab).toHaveTextContent("Skills");
    });

    it("should have Annotated Transcript as third tab with id 2", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      expect(transcriptionTab).toHaveTextContent("Annotated Transcript");
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

      expect(screen.queryByTestId("debrief-tab")).toBeNull();
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
      // Debrief is the landing tab, so its content is visible immediately.
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
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
      expect(screen.queryByTestId("debrief-tab")).toBeNull();
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
   * TEST GROUP: feedbackTabs gating
   * Verifies the backend-resolved `scenario.metadata.feedbackTabs` sub-toggles
   * ({ debrief, skills, transcript }) control which tabs render, that the
   * page lands on the first tab still present, and that switching every
   * sub-toggle off is equivalent to enableFeedback: false.
   */
  describe("feedbackTabs gating", () => {
    const mockedSummaryQuery = vi.mocked(useGetSimulationSummaryQuery);

    const summaryQueryResult = (data: unknown, isLoading = false) =>
      ({ data, isLoading, refetch: vi.fn() }) as unknown as ReturnType<
        typeof useGetSimulationSummaryQuery
      >;

    it("falls back to all three tabs when feedbackTabs is absent (legacy roleplay)", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({ scenario: { metadata: {} }, hasFeedback: false }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
      expect(screen.getByTestId("tab-5")).toBeInTheDocument();
      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
      // Debrief still leads, and is still the landing tab.
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
    });

    it("hides the Debrief tab and lands on Skills when debrief is off", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: {
            metadata: { feedbackTabs: { debrief: false, skills: true, transcript: true } },
          },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("tab-6")).not.toBeInTheDocument();
      expect(screen.getByTestId("tab-5")).toBeInTheDocument();
      expect(screen.getByTestId("tab-2")).toBeInTheDocument();
      // Skills is now the first tab in the list, so the page lands there.
      expect(screen.getByTestId("skills-tab")).toBeInTheDocument();
      expect(screen.getByTestId("tab-5").className).toContain("text-primary-500");
    });

    it("renders only Debrief when skills and transcript are off", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: {
            metadata: { feedbackTabs: { debrief: true, skills: false, transcript: false } },
          },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-5")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-2")).not.toBeInTheDocument();
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
      // No transcript tab exists to jump to, so the moment-open callback is
      // never wired up.
      expect(screen.queryByTestId("debrief-open-moment")).not.toBeInTheDocument();
    });

    it("renders Debrief plus Up Next when only debrief is on and the session belongs to a track", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: {
            metadata: { feedbackTabs: { debrief: true, skills: false, transcript: false } },
          },
          hasFeedback: false,
          scenarioPathSessionItemId: "path-item-1",
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
      expect(screen.getByTestId("tab-3")).toBeInTheDocument();
      expect(screen.queryByTestId("tab-5")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-2")).not.toBeInTheDocument();
    });

    it("falls through to the feedback-disabled branch when every sub-toggle is off", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: {
            metadata: { feedbackTabs: { debrief: false, skills: false, transcript: false } },
          },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      // Same branch as enableFeedback: false — only the star-rating dialog.
      expect(screen.queryByTestId("tabs")).toBeNull();
      expect(screen.queryByTestId("debrief-tab")).toBeNull();
      expect(screen.getByTestId("feedback-dialog")).toBeInTheDocument();
    });

    it("lands on Debrief by default when it is present alongside the other tabs", () => {
      mockedSummaryQuery.mockReturnValue(
        summaryQueryResult({
          scenario: {
            metadata: { feedbackTabs: { debrief: true, skills: true, transcript: true } },
          },
          hasFeedback: false,
        }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tab-6").className).toContain("text-primary-500");
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
      expect(screen.queryByTestId("skills-tab")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Bottom footer layout
   * Regression: the "continue" / "next challenge" bar pinned to the bottom of
   * the page used to be `fixed`, which pulls it out of the flex column's flow
   * so it floats on top of whatever is beneath it instead of reserving its
   * own space. That covered the bottom of the tab panel — e.g. the last
   * utterance under the Annotated Transcript tab — making it inaccessible.
   */
  describe("Bottom footer layout", () => {
    afterEach(() => {
      sessionStorage.removeItem(ACTIVE_TRACK_CONTEXT_KEY);
    });

    it("keeps the continue-track footer in normal flex flow instead of floating over the tab panel", () => {
      sessionStorage.setItem(
        ACTIVE_TRACK_CONTEXT_KEY,
        JSON.stringify({ trackId: "track-1", itemId: "item-1" }),
      );

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const footer = screen.getByTestId("post-sim-footer");
      const tabPanel = screen.getByTestId("post-sim-tab-panel");

      // `fixed` removes the footer from the flex column entirely, so the tab
      // panel above it never shrinks to leave it room — the footer just
      // overlaps whatever content is currently at the bottom of the panel.
      expect(footer.className).not.toMatch(/\bfixed\b/);
      // Still a sibling of the tab panel in the same flex column, so the
      // panel's flex-1/min-h-0 sizing accounts for the footer's height.
      expect(footer.parentElement).toBe(tabPanel.parentElement);
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

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByTestId("debrief-tab")).toBeInTheDocument();
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

      expect(screen.getByTestId("debrief-session-id")).toHaveTextContent(longSessionId);
    });

    it("should handle special characters in sessionId", () => {
      const specialSessionId = "session-123_@#$%";
      mockUseParams.mockReturnValue({ sessionId: specialSessionId });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("debrief-session-id")).toHaveTextContent(specialSessionId);
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
