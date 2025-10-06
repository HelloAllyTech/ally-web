/**
 * Comprehensive Unit Tests for PostSimulationSummary Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - URL parameter handling (sessionId)
 * - Navigation functionality
 * - Motion animations
 * - Container integration
 * - Error handling and edge cases
 * - Snapshot testing
 */

import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ROUTES } from "@constants";

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

// Mock containers
vi.mock("@containers", () => ({
  SimulationSummary: vi.fn(({ summaryId, className, onSummaryClose }) => (
    <div data-testid="simulation-summary" className={className}>
      <div data-testid="summary-id">{summaryId}</div>
      <button data-testid="close-summary-btn" onClick={onSummaryClose}>
        Close Summary
      </button>
    </div>
  )),
}));

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

// Test Wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
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
      expect(motionDiv.className).toContain("max-w-3xl");
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
      expect(title.className).toContain("w-full");
      expect(title.className).toContain("text-black");
      expect(title.className).toContain("text-[24px]");
      expect(title.className).toContain("sm:text-[32px]");
      expect(title.className).toContain("font-normal");
      expect(title.className).toContain("text-left");
      expect(title.className).toContain("font-['Replay_Pro']");
      expect(title.className).toContain("mt-8");
      expect(title.className).toContain("px-4");
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
    it("should navigate to learn page when closing summary", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const closeButton = screen.getByTestId("close-summary-btn");
      closeButton.click();

      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LEARN);
    });

    it("should call closeSummarySidebar function", () => {
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const closeButton = screen.getByTestId("close-summary-btn");
      closeButton.click();

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
      expect(simulationSummary).toHaveClass("max-h-[calc(100vh-120px)]");
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
      // Test that navigation function is called without errors
      render(
        <TestWrapper>
          <PostSimulationSummary />
        </TestWrapper>,
      );

      const closeButton = screen.getByTestId("close-summary-btn");
      closeButton.click();

      // Should call navigate function
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LEARN);
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
      expect(title.className).toContain("text-[24px]");
      expect(title.className).toContain("sm:text-[32px]");
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
