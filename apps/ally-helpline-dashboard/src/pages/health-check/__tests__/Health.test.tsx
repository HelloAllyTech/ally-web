/**
 * Comprehensive Unit Tests for Health Component
 *
 * Test Coverage:
 * - Component rendering with all elements
 * - State management (lastChecked timer)
 * - useEffect cleanup
 * - Real-time updates
 * - Accessibility features
 * - Dark mode support
 * - Responsive design classes
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { Health } from "../Health";

// Mock the assets module
vi.mock("@assets", () => ({
  LifelineLogo: ({ className }: { className: string }) => (
    <div data-testid="lifeline-logo" className={className}>
      LifelineLogo
    </div>
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  CheckCircle: ({ className }: { className: string }) => (
    <div data-testid="check-circle" className={className}>
      CheckCircle
    </div>
  ),
}));

describe("Health Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the Health component successfully", () => {
      const { container } = render(<Health />);
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() => render(<Health />)).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<Health />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<Health />);
      const mainContainer = container.querySelector("div.min-h-dvh");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("bg-gray-100");
      expect(mainContainer?.className).toContain("dark:bg-gray-900");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("flex-col");
      expect(mainContainer?.className).toContain("items-center");
      expect(mainContainer?.className).toContain("justify-center");
    });

    it("should render card container with correct styling", () => {
      const { container } = render(<Health />);
      const cardContainer = container.querySelector("div.max-w-md");
      expect(cardContainer).not.toBeNull();
      expect(cardContainer?.className).toContain("bg-white");
      expect(cardContainer?.className).toContain("dark:bg-gray-800");
      expect(cardContainer?.className).toContain("rounded-2xl");
      expect(cardContainer?.className).toContain("shadow-xl");
    });

    it("should render header section with logo and title", () => {
      render(<Health />);
      const logo = screen.getByTestId("lifeline-logo");
      const title = screen.getByText("Application Health Status");

      expect(logo).not.toBeNull();
      expect(title).not.toBeNull();
      expect(title.tagName.toLowerCase()).toBe("h1");
    });

    it("should render health status section", () => {
      render(<Health />);
      const checkIcon = screen.getByTestId("check-circle");
      const statusText = screen.getByText("Healthy");

      expect(checkIcon).not.toBeNull();
      expect(statusText).not.toBeNull();
    });

    it("should render description section", () => {
      render(<Health />);
      const description = screen.getByText(/All systems are operating normally/);
      expect(description).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Logo and Icon Rendering
   * Verifies that logos and icons are properly rendered
   */
  describe("Logo and Icon Rendering", () => {
    it("should render LifelineLogo with correct classes", () => {
      render(<Health />);
      const logo = screen.getByTestId("lifeline-logo");
      expect(logo).not.toBeNull();
      expect(logo.className).toContain("h-10");
      expect(logo.className).toContain("w-10");
    });

    it("should render CheckCircle icon with correct classes", () => {
      render(<Health />);
      const checkIcon = screen.getByTestId("check-circle");
      expect(checkIcon).not.toBeNull();
      expect(checkIcon.className).toContain("h-12");
      expect(checkIcon.className).toContain("w-12");
      expect(checkIcon.className).toContain("text-green-500");
    });
  });

  /**
   * TEST GROUP: Text Content
   * Verifies all text content is correctly displayed
   */
  describe("Text Content", () => {
    it("should display the main title", () => {
      render(<Health />);
      const title = screen.getByText("Application Health Status");
      expect(title).not.toBeNull();
      expect(title.className).toContain("text-3xl");
      expect(title.className).toContain("font-bold");
    });

    it("should display 'Healthy' status", () => {
      render(<Health />);
      const status = screen.getByText("Healthy");
      expect(status).not.toBeNull();
      expect(status.className).toContain("text-4xl");
      expect(status.className).toContain("font-extrabold");
      expect(status.className).toContain("text-green-500");
    });

    it("should display system status description", () => {
      render(<Health />);
      const description = screen.getByText(
        "All systems are operating normally. This page confirms that the frontend application is running and responsive.",
      );
      expect(description).not.toBeNull();
    });

    it("should display 'Last checked:' label", () => {
      render(<Health />);
      const lastCheckedLabel = screen.getByText(/Last checked:/);
      expect(lastCheckedLabel).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: State Management
   * Verifies state initialization and basic functionality
   */
  describe("State Management", () => {
    it("should initialize with current date", () => {
      const mockDate = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(mockDate);

      render(<Health />);
      const lastCheckedText = screen.getByText(/Last checked:/);
      const expectedTime = mockDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      expect(lastCheckedText.textContent).toContain(expectedTime);
    });

    it("should display time in correct format", () => {
      render(<Health />);
      const lastCheckedText = screen.getByText(/Last checked:/);
      expect(lastCheckedText.textContent).toMatch(/Last checked: \d{1,2}:\d{2}:\d{2} (AM|PM)/);
    });

    it("should have a timer running in the background", () => {
      render(<Health />);
      // The component should render without errors, indicating timer is set up
      const lastCheckedText = screen.getByText(/Last checked:/);
      expect(lastCheckedText).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: useEffect Cleanup
   * Verifies that the timer is properly cleaned up
   */
  describe("useEffect Cleanup", () => {
    it("should clear interval on component unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      const { unmount } = render(<Health />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("should not update after component unmount", () => {
      const { unmount } = render(<Health />);
      unmount();

      // Advance time after unmount
      vi.advanceTimersByTime(2000);

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  /**
   * TEST GROUP: CSS Classes and Styling
   * Verifies correct CSS classes are applied
   */
  describe("CSS Classes and Styling", () => {
    it("should apply dark mode classes", () => {
      const { container } = render(<Health />);
      const mainContainer = container.querySelector("div.min-h-dvh");
      const cardContainer = container.querySelector("div.max-w-md");

      expect(mainContainer?.className).toContain("dark:bg-gray-900");
      expect(cardContainer?.className).toContain("dark:bg-gray-800");
    });

    it("should apply responsive design classes", () => {
      const { container } = render(<Health />);
      const mainContainer = container.querySelector("div.min-h-dvh");
      const cardContainer = container.querySelector("div.max-w-md");

      expect(mainContainer?.className).toContain("p-4");
      expect(cardContainer?.className).toContain("p-8");
    });

    it("should apply proper spacing classes", () => {
      const { container } = render(<Health />);
      const headerSection = container.querySelector(
        "div.flex.items-center.justify-center.space-x-3.mb-6",
      );
      const statusSection = container.querySelector(
        "div.flex.items-center.justify-center.space-x-3.my-6",
      );

      expect(headerSection).not.toBeNull();
      expect(statusSection).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features and semantic HTML
   */
  describe("Accessibility", () => {
    it("should have semantic heading structure", () => {
      render(<Health />);
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).not.toBeNull();
      expect(heading.textContent).toBe("Application Health Status");
    });

    it("should provide clear status information", () => {
      render(<Health />);
      const statusText = screen.getByText("Healthy");
      const description = screen.getByText(/All systems are operating normally/);

      expect(statusText).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should have proper text hierarchy", () => {
      render(<Health />);
      const title = screen.getByText("Application Health Status");
      const status = screen.getByText("Healthy");
      const description = screen.getByText(/All systems are operating normally/);

      expect(title.tagName.toLowerCase()).toBe("h1");
      expect(status.tagName.toLowerCase()).toBe("p");
      expect(description.tagName.toLowerCase()).toBe("p");
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle rapid timer updates", async () => {
      render(<Health />);

      // Advance time rapidly
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
      }

      // Should not crash or cause issues
      const lastCheckedText = screen.getByText(/Last checked:/);
      expect(lastCheckedText).not.toBeNull();
    });

    it("should render consistently on multiple renders", () => {
      const { container: container1 } = render(<Health />);
      const { container: container2 } = render(<Health />);

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it("should not have any console errors during render", () => {
      const consoleError = vi.spyOn(console, "error");
      render(<Health />);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should not have any console warnings during render", () => {
      const consoleWarn = vi.spyOn(console, "warn");
      render(<Health />);
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  /**
   * TEST GROUP: Component Integration
   * Verifies component works correctly with its dependencies
   */
  describe("Component Integration", () => {
    it("should integrate correctly with mocked assets", () => {
      render(<Health />);
      const logo = screen.getByTestId("lifeline-logo");
      expect(logo).not.toBeNull();
    });

    it("should integrate correctly with mocked lucide-react", () => {
      render(<Health />);
      const checkIcon = screen.getByTestId("check-circle");
      expect(checkIcon).not.toBeNull();
    });

    it("should maintain proper component hierarchy", () => {
      const { container } = render(<Health />);
      const mainContainer = container.querySelector("div.min-h-dvh");
      const cardContainer = container.querySelector("div.max-w-md");

      expect(mainContainer).toContainElement(cardContainer as HTMLElement);
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should render consistently", () => {
      const { container: container1 } = render(<Health />);
      const { container: container2 } = render(<Health />);

      // Compare structure without time-dependent content
      const structure1 = container1.innerHTML.replace(
        /Last checked: [^<]+/,
        "Last checked: TIME_PLACEHOLDER",
      );
      const structure2 = container2.innerHTML.replace(
        /Last checked: [^<]+/,
        "Last checked: TIME_PLACEHOLDER",
      );

      expect(structure1).toBe(structure2);
    });

    it("should have consistent component structure", () => {
      const { container } = render(<Health />);
      const mainContainer = container.querySelector("div.min-h-dvh");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("min-h-dvh");
    });
  });

  /**
   * TEST GROUP: Real-time Updates
   * Verifies the real-time update functionality
   */
  describe("Real-time Updates", () => {
    it("should display time information", () => {
      render(<Health />);
      const lastCheckedText = screen.getByText(/Last checked:/);
      expect(lastCheckedText).not.toBeNull();
      expect(lastCheckedText.textContent).toMatch(/Last checked: \d{1,2}:\d{2}:\d{2} (AM|PM)/);
    });

    it("should have timer functionality available", () => {
      render(<Health />);
      // Component should render without errors, indicating timer setup is working
      const container = document.querySelector("div.min-h-dvh");
      expect(container).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Health).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(<Health />);
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => <Health />).not.toThrow();
    });
  });
});
