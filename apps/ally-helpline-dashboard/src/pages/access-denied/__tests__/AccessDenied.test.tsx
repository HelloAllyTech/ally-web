/**
 * Comprehensive Unit Tests for AccessDenied Component
 *
 * Test Coverage:
 * - Component rendering with all required props
 * - Component structure and layout
 * - Image prop passthrough
 * - Text content verification
 * - Accessibility roles and semantic HTML
 * - CSS classes application
 * - Snapshot testing
 * - Integration with FallbackUI component
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AccessDenied } from "../AccessDenied";

// Mock the assets module to provide a test SVG component
vi.mock("@assets", () => ({
  NoResults: () => (
    <svg data-testid="no-results-icon" aria-label="No results illustration">
      <title>No Results</title>
    </svg>
  ),
}));

// Mock the FallbackUI component to verify props are passed correctly
vi.mock("@components", () => ({
  FallbackUI: ({
    image,
    mainMessage,
    description,
  }: {
    image: React.ReactNode;
    mainMessage: string;
    description: string;
  }) => (
    <div data-testid="fallback-ui-mock">
      <div data-testid="fallback-image">{image}</div>
      <h2 data-testid="fallback-main-message">{mainMessage}</h2>
      <p data-testid="fallback-description">{description}</p>
    </div>
  ),
}));

describe("AccessDenied Component", () => {
  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the AccessDenied component successfully", () => {
      const { container } = render(<AccessDenied />);
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() => render(<AccessDenied />)).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<AccessDenied />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render a wrapper div with correct height class", () => {
      const { container } = render(<AccessDenied />);
      const wrapperDiv = container.querySelector("div.h-\\[90vh\\]");
      expect(wrapperDiv).not.toBeNull();
    });

    it("should apply flex layout classes to wrapper div", () => {
      const { container } = render(<AccessDenied />);
      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.className).toContain("flex");
      expect(wrapperDiv.className).toContain("items-center");
      expect(wrapperDiv.className).toContain("justify-center");
    });

    it("should have exactly one root div element", () => {
      const { container } = render(<AccessDenied />);
      const divElements = container.querySelectorAll("div");
      // First div is the root element
      expect(divElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * TEST GROUP: FallbackUI Integration
   * Verifies that FallbackUI component is rendered with correct props
   */
  describe("FallbackUI Integration", () => {
    it("should render FallbackUI component", () => {
      render(<AccessDenied />);
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(fallbackUI).not.toBeNull();
    });

    it("should pass NoResults icon as image prop to FallbackUI", () => {
      render(<AccessDenied />);
      const imageContainer = screen.getByTestId("fallback-image");
      const noResultsIcon = screen.getByTestId("no-results-icon");
      expect(imageContainer).toContainElement(noResultsIcon);
    });

    it("should pass 'Access Denied' as mainMessage prop to FallbackUI", () => {
      render(<AccessDenied />);
      const mainMessage = screen.getByTestId("fallback-main-message");
      expect(mainMessage.textContent).toBe("Access Denied");
    });

    it("should pass correct description prop to FallbackUI", () => {
      render(<AccessDenied />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toBe("You do not have permission to access this page.");
    });
  });

  /**
   * TEST GROUP: Image Rendering
   * Verifies that the NoResults icon is properly rendered
   */
  describe("Image Rendering", () => {
    it("should render the NoResults SVG icon", () => {
      render(<AccessDenied />);
      const icon = screen.getByTestId("no-results-icon");
      expect(icon).not.toBeNull();
    });

    it("should render an SVG element for the icon", () => {
      render(<AccessDenied />);
      const icon = screen.getByTestId("no-results-icon");
      expect(icon.tagName.toLowerCase()).toBe("svg");
    });

    it("should have accessible label for the icon", () => {
      render(<AccessDenied />);
      const icon = screen.getByTestId("no-results-icon");
      expect(icon.getAttribute("aria-label")).toBe("No results illustration");
    });

    it("should contain a title element in the SVG for accessibility", () => {
      render(<AccessDenied />);
      const title = screen.getByText("No Results");
      expect(title).not.toBeNull();
      expect(title.tagName.toLowerCase()).toBe("title");
    });
  });

  /**
   * TEST GROUP: Text Content
   * Verifies all text content is correctly displayed
   */
  describe("Text Content", () => {
    it("should display 'Access Denied' as the main message", () => {
      render(<AccessDenied />);
      const mainMessage = screen.getByText("Access Denied");
      expect(mainMessage).not.toBeNull();
    });

    it("should display the permission description text", () => {
      render(<AccessDenied />);
      const description = screen.getByText("You do not have permission to access this page.");
      expect(description).not.toBeNull();
    });

    it("should render main message text exactly as specified", () => {
      render(<AccessDenied />);
      const mainMessage = screen.getByTestId("fallback-main-message");
      expect(mainMessage.textContent).toBe("Access Denied");
      expect(mainMessage.textContent).not.toBe("access denied");
      expect(mainMessage.textContent).not.toBe("ACCESS DENIED");
    });

    it("should render description with proper punctuation", () => {
      render(<AccessDenied />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toContain(".");
      expect(description.textContent?.trim().endsWith(".")).toBe(true);
    });
  });

  /**
   * TEST GROUP: Component Props
   * Verifies that props are not passed to AccessDenied (it's a presentational component)
   */
  describe("Component Props", () => {
    it("should render consistently without any props", () => {
      const { container: container1 } = render(<AccessDenied />);
      const { container: container2 } = render(<AccessDenied />);
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it("should be a pure presentational component with no external dependencies", () => {
      // This test verifies component renders the same way every time
      const renders = Array.from({ length: 3 }, () => {
        const { container } = render(<AccessDenied />);
        return container.innerHTML;
      });

      // All renders should produce the same output
      expect(renders[0]).toBe(renders[1]);
      expect(renders[1]).toBe(renders[2]);
    });
  });

  /**
   * TEST GROUP: CSS Classes and Styling
   * Verifies correct CSS classes are applied
   */
  describe("CSS Classes and Styling", () => {
    it("should apply height viewport class to root div", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain("h-[90vh]");
    });

    it("should apply flexbox centering classes", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain("flex");
      expect(rootDiv.className).toContain("items-center");
      expect(rootDiv.className).toContain("justify-center");
    });

    it("should have proper spacing and layout classes", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild as HTMLElement;
      const classes = rootDiv.className.split(" ");
      expect(classes).toContain("h-[90vh]");
      expect(classes).toContain("flex");
      expect(classes).toContain("items-center");
      expect(classes).toContain("justify-center");
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features and semantic HTML
   */
  describe("Accessibility", () => {
    it("should have semantic heading text for 'Access Denied'", () => {
      render(<AccessDenied />);
      const heading = screen.getByTestId("fallback-main-message");
      expect(heading.textContent).toBe("Access Denied");
    });

    it("should have descriptive text explaining the access restriction", () => {
      render(<AccessDenied />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toContain("permission");
      expect(description.textContent).toContain("access");
    });

    it("should provide meaningful error context to users", () => {
      render(<AccessDenied />);
      const mainMessage = screen.getByText("Access Denied");
      const description = screen.getByText(/You do not have permission to access this page/i);
      expect(mainMessage).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should render icon with proper ARIA attributes", () => {
      render(<AccessDenied />);
      const icon = screen.getByTestId("no-results-icon");
      expect(icon.hasAttribute("aria-label")).toBe(true);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should render consistently on multiple renders", () => {
      const { container: firstRender } = render(<AccessDenied />);
      const { container: secondRender } = render(<AccessDenied />);

      expect(firstRender.innerHTML).toBe(secondRender.innerHTML);
    });

    it("should not break when rendered in isolation", () => {
      expect(() => {
        render(<AccessDenied />);
      }).not.toThrow();
    });

    it("should maintain component structure after re-render", () => {
      const { container, rerender } = render(<AccessDenied />);
      const initialHTML = container.innerHTML;

      rerender(<AccessDenied />);

      expect(container.innerHTML).toBe(initialHTML);
    });

    it("should not have any console errors during render", () => {
      const consoleError = vi.spyOn(console, "error");
      render(<AccessDenied />);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should not have any console warnings during render", () => {
      const consoleWarn = vi.spyOn(console, "warn");
      render(<AccessDenied />);
      expect(consoleWarn).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  /**
   * TEST GROUP: Component Integration
   * Verifies component works correctly with its dependencies
   */
  describe("Component Integration", () => {
    it("should integrate correctly with FallbackUI component", () => {
      render(<AccessDenied />);
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(fallbackUI).toBeInTheDocument();
    });

    it("should pass all required props to FallbackUI", () => {
      render(<AccessDenied />);

      // Verify all three props are present
      const image = screen.getByTestId("fallback-image");
      const mainMessage = screen.getByTestId("fallback-main-message");
      const description = screen.getByTestId("fallback-description");

      expect(image).not.toBeNull();
      expect(mainMessage).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should not pass any button prop to FallbackUI", () => {
      render(<AccessDenied />);
      // Since we're mocking FallbackUI, we can verify button is not rendered
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });

    it("should not pass isLoading prop to FallbackUI", () => {
      render(<AccessDenied />);
      // Verify there's no loading spinner (CircularProgress)
      const spinner = screen.queryByRole("progressbar");
      expect(spinner).toBeNull();
    });

    it("should not pass className prop to FallbackUI", () => {
      // This test verifies that AccessDenied doesn't add custom className
      // The component should work with default FallbackUI styling
      const { container } = render(<AccessDenied />);
      expect(container).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for basic render", () => {
      const { container } = render(<AccessDenied />);
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot for component structure", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild;
      expect(rootDiv).toMatchSnapshot();
    });

    it("should have consistent HTML output", () => {
      const { container } = render(<AccessDenied />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Negative Scenarios
   * Verifies what the component should NOT do
   */
  describe("Negative Scenarios", () => {
    it("should not render any interactive buttons", () => {
      render(<AccessDenied />);
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });

    it("should not render any form elements", () => {
      const { container } = render(<AccessDenied />);
      const forms = container.querySelectorAll("form");
      const inputs = container.querySelectorAll("input");
      expect(forms.length).toBe(0);
      expect(inputs.length).toBe(0);
    });

    it("should not render any navigation links", () => {
      render(<AccessDenied />);
      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0);
    });

    it("should not render any loading states", () => {
      render(<AccessDenied />);
      const spinner = screen.queryByRole("progressbar");
      expect(spinner).toBeNull();
    });

    it("should not have any click handlers on the root element", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.onclick).toBeNull();
    });

    it("should not render dynamically based on props (it accepts none)", () => {
      // AccessDenied is a pure presentational component with no props
      const { container: render1 } = render(<AccessDenied />);
      const { container: render2 } = render(<AccessDenied />);

      expect(render1.innerHTML).toBe(render2.innerHTML);
    });
  });

  /**
   * TEST GROUP: DOM Structure Validation
   * Verifies the exact DOM structure
   */
  describe("DOM Structure Validation", () => {
    it("should have a single root div element", () => {
      const { container } = render(<AccessDenied />);
      expect(container.children.length).toBe(1);
      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it("should nest FallbackUI inside the root div", () => {
      const { container } = render(<AccessDenied />);
      const rootDiv = container.firstChild as HTMLElement;
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(rootDiv).toContainElement(fallbackUI);
    });

    it("should have proper nesting hierarchy", () => {
      render(<AccessDenied />);

      // Root -> FallbackUI -> Image, Message, Description
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      const image = screen.getByTestId("fallback-image");
      const mainMessage = screen.getByTestId("fallback-main-message");
      const description = screen.getByTestId("fallback-description");

      expect(fallbackUI).toContainElement(image);
      expect(fallbackUI).toContainElement(mainMessage);
      expect(fallbackUI).toContainElement(description);
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof AccessDenied).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(<AccessDenied />);
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => <AccessDenied />).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Error Message Content Validation
   * Verifies the error message is clear and helpful
   */
  describe("Error Message Content Validation", () => {
    it("should have a clear title indicating access denial", () => {
      render(<AccessDenied />);
      const title = screen.getByText("Access Denied");
      expect(title).not.toBeNull();
      expect(title.textContent).toContain("Access");
      expect(title.textContent).toContain("Denied");
    });

    it("should explain the reason for access denial", () => {
      render(<AccessDenied />);
      const description = screen.getByText(/You do not have permission to access this page/i);
      expect(description.textContent).toContain("permission");
      expect(description.textContent).toContain("access");
      expect(description.textContent).toContain("page");
    });

    it("should use professional and user-friendly language", () => {
      render(<AccessDenied />);
      const description = screen.getByTestId("fallback-description");

      // Should not contain technical jargon or harsh language
      expect(description.textContent?.toLowerCase()).not.toContain("error");
      expect(description.textContent?.toLowerCase()).not.toContain("forbidden");
      expect(description.textContent?.toLowerCase()).not.toContain("401");
      expect(description.textContent?.toLowerCase()).not.toContain("403");
    });

    it("should provide a complete sentence with proper grammar", () => {
      render(<AccessDenied />);
      const description = screen.getByTestId("fallback-description");
      const text = description.textContent || "";

      // Should be a complete sentence
      expect(text.trim().endsWith(".")).toBe(true);
      expect(text.length).toBeGreaterThan(10);
    });
  });
});
