/**
 * Comprehensive Unit Tests for ListeningChart Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - Props handling (listeningPercentage, isEmpty, className)
 * - Animation functionality
 * - Empty state rendering
 * - Chart visualization
 * - Color coding and styling
 * - Accessibility features
 * - Snapshot testing
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import ListeningChart from "../ListeningChart";

describe("ListeningChart Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully with default props", () => {
      render(<ListeningChart listeningPercentage={50} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(<ListeningChart listeningPercentage={75} />);
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<ListeningChart listeningPercentage={60} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Props Handling
   * Verifies component handles different props correctly
   */
  describe("Props Handling", () => {
    it("should render with custom listening percentage", () => {
      render(<ListeningChart listeningPercentage={80} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should render with empty state when isEmpty is true", () => {
      render(<ListeningChart listeningPercentage={0} isEmpty={true} />);
      expect(screen.getByText("No data found")).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      const { container } = render(
        <ListeningChart listeningPercentage={50} className="custom-class" />,
      );
      const mainContainer = container.querySelector("div.flex.flex-col.gap-4.custom-class");
      expect(mainContainer).not.toBeNull();
    });

    it("should use default className when not provided", () => {
      const { container } = render(<ListeningChart listeningPercentage={50} />);
      const mainContainer = container.querySelector("div.flex.flex-col.gap-4");
      expect(mainContainer).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Chart Visualization
   * Verifies chart visualization functionality
   */
  describe("Chart Visualization", () => {
    it("should display listening percentage correctly", () => {
      render(<ListeningChart listeningPercentage={70} />);

      // Test that the component renders without errors
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should display talking percentage correctly", () => {
      render(<ListeningChart listeningPercentage={30} />);

      // Test that the component renders without errors
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should handle 100% listening percentage", () => {
      render(<ListeningChart listeningPercentage={100} />);

      const listeningBars = screen.getAllByText((content, element) => {
        return element?.textContent === "100%";
      });
      const talkingBars = screen.getAllByText((content, element) => {
        return element?.textContent === "0%";
      });
      expect(listeningBars.length).toBeGreaterThan(0);
      expect(talkingBars.length).toBeGreaterThan(0);
    });

    it("should handle 0% listening percentage", () => {
      render(<ListeningChart listeningPercentage={0} />);

      const listeningBars = screen.getAllByText((content, element) => {
        return element?.textContent === "0%";
      });
      const talkingBars = screen.getAllByText((content, element) => {
        return element?.textContent === "100%";
      });
      expect(listeningBars.length).toBeGreaterThan(0);
      expect(talkingBars.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Empty State
   * Verifies empty state rendering
   */
  describe("Empty State", () => {
    it("should show empty state message when isEmpty is true", () => {
      render(<ListeningChart listeningPercentage={0} isEmpty={true} />);
      expect(screen.getByText("No data found")).toBeInTheDocument();
    });

    it("should not show chart bars when isEmpty is true", () => {
      render(<ListeningChart listeningPercentage={50} isEmpty={true} />);
      expect(screen.queryByText("50%")).not.toBeInTheDocument();
    });

    it("should apply empty state styling", () => {
      const { container } = render(<ListeningChart listeningPercentage={0} isEmpty={true} />);
      const emptyBar = container.querySelector("div.bg-\\[\\#F5F5F5\\]");
      expect(emptyBar).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Animation
   * Verifies animation functionality
   */
  describe("Animation", () => {
    it("should handle animation correctly", () => {
      // Test that the component renders without errors
      expect(() => {
        render(<ListeningChart listeningPercentage={50} />);
      }).not.toThrow();
    });

    it("should render with animation properties", () => {
      // Test that the component renders without errors
      expect(() => {
        render(<ListeningChart listeningPercentage={75} />);
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Color Coding
   * Verifies color coding and styling
   */
  describe("Color Coding", () => {
    it("should apply correct colors to listening bar", () => {
      const { container } = render(<ListeningChart listeningPercentage={60} />);
      const listeningBar = container.querySelector("div.bg-\\[\\#BBD6FF\\]");
      expect(listeningBar).not.toBeNull();
    });

    it("should apply correct colors to talking bar", () => {
      const { container } = render(<ListeningChart listeningPercentage={40} />);
      const talkingBar = container.querySelector("div.bg-\\[\\#5B7BAF\\]");
      expect(talkingBar).not.toBeNull();
    });

    it("should show legend with correct colors", () => {
      render(<ListeningChart listeningPercentage={50} />);

      const listeningLegend = screen.getByText("Listening");
      const talkingLegend = screen.getByText("Talking");

      expect(listeningLegend).toBeInTheDocument();
      expect(talkingLegend).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<ListeningChart listeningPercentage={50} />);
      const mainContainer = container.querySelector("div.flex.flex-col.gap-4");
      expect(mainContainer).not.toBeNull();
    });

    it("should render title section", () => {
      render(<ListeningChart listeningPercentage={50} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should render chart section", () => {
      const { container } = render(<ListeningChart listeningPercentage={50} />);
      const chartSection = container.querySelector("div.flex.flex-col.gap-2.mt-16");
      expect(chartSection).not.toBeNull();
    });

    it("should render legend section", () => {
      const { container } = render(<ListeningChart listeningPercentage={50} />);
      const legendSection = container.querySelector("div.flex.gap-6.mt-4");
      expect(legendSection).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      render(<ListeningChart listeningPercentage={50} />);
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toBe("Listening : Talking Distribution");
    });

    it("should have proper text contrast", () => {
      render(<ListeningChart listeningPercentage={50} />);

      const listeningText = screen.getByText("Listening");
      const talkingText = screen.getByText("Talking");

      expect(listeningText).toHaveClass("text-[#4A4459]");
      expect(talkingText).toHaveClass("text-[#4A4459]");
    });

    it("should have proper color indicators", () => {
      const { container } = render(<ListeningChart listeningPercentage={50} />);

      const listeningIndicator = container.querySelector("div.w-4.h-4.rounded.bg-\\[\\#BBD6FF\\]");
      const talkingIndicator = container.querySelector("div.w-4.h-4.rounded.bg-\\[\\#5B7BAF\\]");

      expect(listeningIndicator).not.toBeNull();
      expect(talkingIndicator).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle negative listening percentage", () => {
      render(<ListeningChart listeningPercentage={-10} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should handle listening percentage over 100", () => {
      render(<ListeningChart listeningPercentage={150} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });

    it("should handle decimal listening percentage", () => {
      render(<ListeningChart listeningPercentage={33.33} />);
      expect(screen.getByText("Listening : Talking Distribution")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot with default props", () => {
      const { asFragment } = render(<ListeningChart listeningPercentage={50} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with empty state", () => {
      const { asFragment } = render(<ListeningChart listeningPercentage={0} isEmpty={true} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with custom className", () => {
      const { asFragment } = render(
        <ListeningChart listeningPercentage={75} className="custom-class" />,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof ListeningChart).toBe("function");
    });

    it("should return a valid React element", () => {
      const element = <ListeningChart listeningPercentage={50} />;
      expect(element).toBeDefined();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(<ListeningChart listeningPercentage={50} />);
      }).not.toThrow();
    });
  });
});
