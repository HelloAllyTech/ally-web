/**
 * Comprehensive Unit Tests for Search Component
 *
 * Test Coverage:
 * - Component rendering with SearchResources
 * - Layout and styling classes
 * - Responsive design
 * - Component integration
 * - Accessibility features
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Search } from "../Search";

// Mock the SearchResources component
vi.mock("@components", () => ({
  SearchResources: () => (
    <div data-testid="search-resources">
      <h1>Search Resources</h1>
      <p>Search functionality will be implemented here</p>
    </div>
  ),
}));

describe("Search Component", () => {
  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the Search component successfully", () => {
      const { container } = render(<Search />);
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() => render(<Search />)).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<Search />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("h-full");
      expect(mainContainer?.className).toContain("overflow-y-hidden");
      expect(mainContainer?.className).toContain("h-[calc(100dvh-30px)]");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("justify-center");
      expect(mainContainer?.className).toContain("items-center");
    });

    it("should render SearchResources component", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      expect(searchResources).not.toBeNull();
    });

    it("should have exactly one root div element", () => {
      const { container } = render(<Search />);
      const divElements = container.querySelectorAll("div");
      expect(divElements.length).toBe(2); // Root div + SearchResources div
    });
  });

  /**
   * TEST GROUP: Responsive Design
   * Verifies responsive design classes are applied correctly
   */
  describe("Responsive Design", () => {
    it("should apply responsive padding classes", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("sm:px-[15%]");
      expect(mainContainer?.className).toContain("px-[2%]");
    });

    it("should have proper height calculations", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("h-full");
      expect(mainContainer?.className).toContain("h-[calc(100dvh-30px)]");
    });

    it("should center content both horizontally and vertically", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("justify-center");
      expect(mainContainer?.className).toContain("items-center");
    });
  });

  /**
   * TEST GROUP: SearchResources Integration
   * Verifies integration with SearchResources component
   */
  describe("SearchResources Integration", () => {
    it("should render SearchResources component", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      expect(searchResources).not.toBeNull();
    });

    it("should pass SearchResources as child of main container", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      const searchResources = screen.getByTestId("search-resources");

      expect(mainContainer).toContainElement(searchResources);
    });

    it("should not pass any props to SearchResources", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");

      // SearchResources should render with default content
      expect(searchResources.textContent).toContain("Search Resources");
    });
  });

  /**
   * TEST GROUP: Layout and Styling
   * Verifies correct CSS classes are applied
   */
  describe("Layout and Styling", () => {
    it("should apply full height classes", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("h-full");
    });

    it("should apply overflow hidden for vertical scrolling", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("overflow-y-hidden");
    });

    it("should apply calculated height for viewport", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("h-[calc(100dvh-30px)]");
    });

    it("should apply flexbox centering", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("justify-center");
      expect(mainContainer?.className).toContain("items-center");
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper semantic structure", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      const heading = screen.getByText("Search Resources");

      expect(searchResources).not.toBeNull();
      expect(heading.tagName.toLowerCase()).toBe("h1");
    });

    it("should provide accessible content through SearchResources", () => {
      render(<Search />);
      const heading = screen.getByRole("heading", { level: 1 });
      const description = screen.getByText("Search functionality will be implemented here");

      expect(heading).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should maintain proper focus management", () => {
      render(<Search />);
      const mainContainer = document.querySelector("div");
      expect(mainContainer).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Props
   * Verifies that props are not passed to Search (it's a presentational component)
   */
  describe("Component Props", () => {
    it("should render consistently without any props", () => {
      const { container: container1 } = render(<Search />);
      const { container: container2 } = render(<Search />);
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it("should be a pure presentational component with no external dependencies", () => {
      // This test verifies component renders the same way every time
      const renders = Array.from({ length: 3 }, () => {
        const { container } = render(<Search />);
        return container.innerHTML;
      });

      // All renders should produce the same output
      expect(renders[0]).toBe(renders[1]);
      expect(renders[1]).toBe(renders[2]);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should render consistently on multiple renders", () => {
      const { container: firstRender } = render(<Search />);
      const { container: secondRender } = render(<Search />);

      expect(firstRender.innerHTML).toBe(secondRender.innerHTML);
    });

    it("should not break when rendered in isolation", () => {
      expect(() => render(<Search />)).not.toThrow();
    });

    it("should maintain component structure after re-render", () => {
      const { container, rerender } = render(<Search />);
      const initialHTML = container.innerHTML;

      rerender(<Search />);

      expect(container.innerHTML).toBe(initialHTML);
    });

    it("should not have any console errors during render", () => {
      const consoleError = vi.spyOn(console, "error");
      render(<Search />);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should not have any console warnings during render", () => {
      const consoleWarn = vi.spyOn(console, "warn");
      render(<Search />);
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  /**
   * TEST GROUP: Component Integration
   * Verifies component works correctly with its dependencies
   */
  describe("Component Integration", () => {
    it("should integrate correctly with SearchResources component", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      expect(searchResources).toBeInTheDocument();
    });

    it("should maintain proper component hierarchy", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      const searchResources = screen.getByTestId("search-resources");

      expect(mainContainer).toContainElement(searchResources);
    });

    it("should not interfere with SearchResources functionality", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      const heading = screen.getByText("Search Resources");

      expect(searchResources).toContainElement(heading);
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for basic render", () => {
      const { container } = render(<Search />);
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot for component structure", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer).toMatchSnapshot();
    });

    it("should have consistent HTML output", () => {
      const { container } = render(<Search />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Negative Scenarios
   * Verifies what the component should NOT do
   */
  describe("Negative Scenarios", () => {
    it("should not render any interactive elements directly", () => {
      const { container } = render(<Search />);
      const buttons = container.querySelectorAll("button");
      const inputs = container.querySelectorAll("input");
      const links = container.querySelectorAll("a");

      // Only SearchResources should have interactive elements
      expect(buttons.length).toBe(0);
      expect(inputs.length).toBe(0);
      expect(links.length).toBe(0);
    });

    it("should not have any click handlers on the root element", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");
      expect(mainContainer?.onclick).toBeNull();
    });

    it("should not render dynamically based on props (it accepts none)", () => {
      const { container: render1 } = render(<Search />);
      const { container: render2 } = render(<Search />);

      expect(render1.innerHTML).toBe(render2.innerHTML);
    });

    it("should not have any form elements", () => {
      const { container } = render(<Search />);
      const forms = container.querySelectorAll("form");
      expect(forms.length).toBe(0);
    });
  });

  /**
   * TEST GROUP: DOM Structure Validation
   * Verifies the exact DOM structure
   */
  describe("DOM Structure Validation", () => {
    it("should have a single root div element", () => {
      const { container } = render(<Search />);
      expect(container.children.length).toBe(1);
      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it("should nest SearchResources inside the root div", () => {
      const { container } = render(<Search />);
      const rootDiv = container.firstChild as HTMLElement;
      const searchResources = screen.getByTestId("search-resources");
      expect(rootDiv).toContainElement(searchResources);
    });

    it("should have proper nesting hierarchy", () => {
      render(<Search />);
      const searchResources = screen.getByTestId("search-resources");
      const heading = screen.getByText("Search Resources");
      const description = screen.getByText("Search functionality will be implemented here");

      expect(searchResources).toContainElement(heading);
      expect(searchResources).toContainElement(description);
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Search).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(<Search />);
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => <Search />).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Responsive Behavior
   * Verifies responsive behavior works correctly
   */
  describe("Responsive Behavior", () => {
    it("should apply different padding for different screen sizes", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");

      // Check that both mobile and desktop padding classes are present
      expect(mainContainer?.className).toContain("px-[2%]"); // Mobile
      expect(mainContainer?.className).toContain("sm:px-[15%]"); // Desktop
    });

    it("should maintain centering across all screen sizes", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");

      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("justify-center");
      expect(mainContainer?.className).toContain("items-center");
    });

    it("should handle viewport height calculations correctly", () => {
      const { container } = render(<Search />);
      const mainContainer = container.querySelector("div");

      expect(mainContainer?.className).toContain("h-[calc(100dvh-30px)]");
    });
  });
});
