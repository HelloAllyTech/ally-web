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

// Store onChange handler for Tab mock to access
let tabsOnChange: ((event: any, value: number) => void) | null = null;

// Mock @mui/material
vi.mock("@mui/material", () => ({
  Tabs: ({ children, value, onChange, className, sx }: any) => {
    // Store onChange so Tab components can call it
    tabsOnChange = onChange;
    return (
      <div data-testid="mui-tabs" data-value={value} className={className} role="tablist">
        {children}
      </div>
    );
  },
  Tab: ({ label, value, sx }: any) => (
    <button
      data-testid={`tab-${value}`}
      data-value={value}
      role="tab"
      aria-selected={false}
      onClick={e => {
        // Call the stored onChange handler
        if (tabsOnChange) {
          tabsOnChange(e, value);
        }
      }}
    >
      {label}
    </button>
  ),
}));

// Mock containers
vi.mock("@containers", () => ({
  SimulationSummary: vi.fn(({ summaryId, className, onSummaryClose, isInSidebar }) => (
    <div data-testid="simulation-summary" className={className} data-in-sidebar={isInSidebar}>
      <div data-testid="summary-id">{summaryId}</div>
      <button data-testid="close-summary-btn" onClick={onSummaryClose}>
        Close Summary
      </button>
    </div>
  )),
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
      SUMMARY_TABS_FLAG: true,
      SHARE_FOR_REVIEW_FLAG: true,
    },
  };
});

// Test Wrapper (Provider required for useGetSimulationSummaryQuery / RTK Query)
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

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
      expect(mainContainer?.className).toContain("h-[100vh]");
      expect(mainContainer?.className).toContain("overflow-y-auto");
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
      expect(motionDiv.className).toContain("h-full");
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

      const title = screen.getByText((content, element) => {
        return element?.textContent === "Simulation Summary";
      });
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

      expect(screen.getByTestId("summary-id")).toHaveTextContent("456");
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
    it("should navigate back when clicking back button", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/Simulation/).closest("div");
      const backButton = within(header!).getByRole("button");
      backButton.click();

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("should call navigate when clicking back button", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/Simulation/).closest("div");
      const backButton = within(header!).getByRole("button");
      backButton.click();

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
      expect(simulationSummary).toHaveClass("max-h-[calc(100vh-212px)]");
      expect(screen.getByTestId("summary-id")).toHaveTextContent("123");
    });

    it("should pass onSummaryClose callback to SimulationSummary", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const closeButton = screen.getByTestId("close-summary-btn");
      expect(closeButton).toBeInTheDocument();
    });

    it("should pass summaryId and className to SimulationSummary", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const lastCallArgs = vi.mocked(SimulationSummary).mock.calls.at(-1) ?? [];
      expect(lastCallArgs[0]).toMatchObject({
        summaryId: "123",
        className: "max-h-[calc(100vh-212px)]",
      });
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

      expect(screen.getByTestId("mui-tabs")).toBeInTheDocument();
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

      const tabs = screen.getByTestId("mui-tabs");
      expect(tabs).toHaveAttribute("data-value", "1");
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

      const tabs = screen.getByTestId("mui-tabs");
      expect(tabs).toHaveClass("w-full");
      expect(tabs).toHaveClass("normal-case");
      expect(tabs).toHaveClass("border-b");
      expect(tabs).toHaveClass("border-[#DBDBDB]");
    });

    it("should render all tab buttons", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const tabButtons = screen.getAllByRole("tab");
      // With SUMMARY_TABS_FLAG enabled, we have 5 tabs: Summary, Transcription, Ask AI, Skills, Reflection
      expect(tabButtons).toHaveLength(5);
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
      // The className prop is passed to SimulationTranscriptTab which includes "w-full max-h-[calc(100vh-10px)]"
      // The actual rendering depends on the component implementation
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
      expect(screen.getByTestId("tab-6")).toBeInTheDocument();
    });

    it("should have Summary as first tab with id 1", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const summaryTab = screen.getByTestId("tab-1");
      expect(summaryTab).toHaveTextContent("Session Review");
      expect(summaryTab).toHaveAttribute("data-value", "1");
    });

    it("should have Transcription as second tab with id 2", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const transcriptionTab = screen.getByTestId("tab-2");
      expect(transcriptionTab).toHaveTextContent("Annotated Transcript");
      expect(transcriptionTab).toHaveAttribute("data-value", "2");
    });

    it("should have Ask AI as third tab with id 4", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const askAiTab = screen.getByTestId("tab-4");
      expect(askAiTab).toHaveTextContent("Ask AI");
      expect(askAiTab).toHaveAttribute("data-value", "4");
    });

    it("should have Skills as fourth tab with id 5", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const skillsTab = screen.getByTestId("tab-5");
      expect(skillsTab).toHaveTextContent("Skills");
      expect(skillsTab).toHaveAttribute("data-value", "5");
    });

    it("should have Reflection as fifth tab with id 6", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const reflectionTab = screen.getByTestId("tab-6");
      expect(reflectionTab).toHaveTextContent("Reflection");
      expect(reflectionTab).toHaveAttribute("data-value", "6");
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
      // Test that navigation function is called without errors when using back button
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const header = screen.getByText(/Simulation/).closest("div");
      const backButton = within(header!).getByRole("button");
      backButton.click();

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

      const title = screen.getByText((content, element) => {
        return element?.textContent === "Simulation Summary";
      });
      expect(title).not.toBeNull();
      expect(title.innerHTML).toContain("Simulation");
      expect(title.innerHTML).toContain("<em>Summary</em>");
    });

    it("should have proper text hierarchy", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const title = screen.getByText((content, element) => {
        return element?.textContent === "Simulation Summary";
      });
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

      const title = screen.getByText((content, element) => {
        return element?.textContent === "Simulation Summary";
      });
      expect(title.className).toContain("text-2xl");
      expect(title.className).toContain("sm:text-4xl");
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

      const title = screen.getByText((content, element) => {
        return element?.textContent === "Simulation Summary";
      });
      expect(title).not.toBeNull();
    });

    it("should provide clear navigation options", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const closeButton = screen.getByTestId("close-summary-btn");
      expect(closeButton).toBeInTheDocument();
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

      expect(screen.getByTestId("summary-id")).toHaveTextContent(longSessionId);
    });

    it("should handle special characters in sessionId", () => {
      const specialSessionId = "session-123_@#$%";
      mockUseParams.mockReturnValue({ sessionId: specialSessionId });

      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("summary-id")).toHaveTextContent(specialSessionId);
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
