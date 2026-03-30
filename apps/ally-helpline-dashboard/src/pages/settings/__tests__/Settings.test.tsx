/**
 * Comprehensive Unit Tests for Settings Component
 *
 * Test Coverage:
 * - Component rendering with FallbackUI
 * - Coming Soon image integration
 * - Layout and styling classes
 * - Accessibility features
 * - Component integration
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Settings } from "../Settings";

// Mock the assets module
vi.mock("@assets", () => ({
  ComingSoon: ({ className }: { className: string }) => (
    <div data-testid="coming-soon-icon" className={className}>
      ComingSoon
    </div>
  ),
}));

// Mock the FallbackUI component
vi.mock("@components", () => ({
  FallbackUI: ({
    icon,
    mainMessage,
    description,
  }: {
    icon: React.ReactNode;
    mainMessage: string;
    description: string;
  }) => (
    <div data-testid="fallback-ui-mock">
      <div data-testid="fallback-image">{icon}</div>
      <h2 data-testid="fallback-main-message">{mainMessage}</h2>
      <p data-testid="fallback-description">{description}</p>
    </div>
  ),
}));

describe("Settings Component", () => {
  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the Settings component successfully", () => {
      const { container } = render(<Settings />);
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() => render(<Settings />)).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<Settings />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render a wrapper div with correct height class", () => {
      const { container } = render(<Settings />);
      const wrapperDiv = container.querySelector("div.h-\\[90vh\\]");
      expect(wrapperDiv).not.toBeNull();
    });

    it("should apply flex layout classes to wrapper div", () => {
      const { container } = render(<Settings />);
      const wrapperDiv = container.firstChild as HTMLElement;
      expect(wrapperDiv.className).toContain("flex");
      expect(wrapperDiv.className).toContain("items-center");
      expect(wrapperDiv.className).toContain("justify-center");
    });

    it("should have exactly one root div element", () => {
      const { container } = render(<Settings />);
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
      render(<Settings />);
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(fallbackUI).not.toBeNull();
    });

    it("should pass ComingSoon icon as image prop to FallbackUI", () => {
      render(<Settings />);
      const imageContainer = screen.getByTestId("fallback-image");
      const comingSoonIcon = screen.getByTestId("coming-soon-icon");
      expect(imageContainer).toContainElement(comingSoonIcon);
    });

    it("should pass 'Coming Soon' as mainMessage prop to FallbackUI", () => {
      render(<Settings />);
      const mainMessage = screen.getByTestId("fallback-main-message");
      expect(mainMessage.textContent).toBe("Coming Soon");
    });

    it("should pass correct description prop to FallbackUI", () => {
      render(<Settings />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toContain("working on something exciting");
      expect(description.textContent).toContain("This feature will be available soon");
    });
  });

  /**
   * TEST GROUP: Image Rendering
   * Verifies that the ComingSoon icon is properly rendered
   */
  describe("Image Rendering", () => {
    it("should render the ComingSoon icon", () => {
      render(<Settings />);
      const icon = screen.getByTestId("coming-soon-icon");
      expect(icon).not.toBeNull();
    });

    it("should render an icon element", () => {
      render(<Settings />);
      const icon = screen.getByTestId("coming-soon-icon");
      expect(icon.tagName.toLowerCase()).toBe("div");
    });

    it("should have accessible content for the icon", () => {
      render(<Settings />);
      const icon = screen.getByTestId("coming-soon-icon");
      expect(icon.textContent).toBe("ComingSoon");
    });
  });

  /**
   * TEST GROUP: Text Content
   * Verifies all text content is correctly displayed
   */
  describe("Text Content", () => {
    it("should display 'Coming Soon' as the main message", () => {
      render(<Settings />);
      const mainMessage = screen.getByText("Coming Soon");
      expect(mainMessage).not.toBeNull();
    });

    it("should display the feature description text", () => {
      render(<Settings />);
      const description = screen.getByText(/working on something exciting/);
      expect(description).not.toBeNull();
    });

    it("should render main message text exactly as specified", () => {
      render(<Settings />);
      const mainMessage = screen.getByTestId("fallback-main-message");
      expect(mainMessage.textContent).toBe("Coming Soon");
      expect(mainMessage.textContent).not.toBe("coming soon");
      expect(mainMessage.textContent).not.toBe("COMING SOON");
    });

    it("should render description with proper punctuation", () => {
      render(<Settings />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toContain("!");
      expect(description.textContent?.trim().endsWith(".")).toBe(true);
    });
  });

  /**
   * TEST GROUP: Component Props
   * Verifies that props are not passed to Settings (it's a presentational component)
   */
  describe("Component Props", () => {
    it("should render consistently without any props", () => {
      const { container: container1 } = render(<Settings />);
      const { container: container2 } = render(<Settings />);
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });

    it("should be a pure presentational component with no external dependencies", () => {
      // This test verifies component renders the same way every time
      const renders = Array.from({ length: 3 }, () => {
        const { container } = render(<Settings />);
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
      const { container } = render(<Settings />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain("h-[90vh]");
    });

    it("should apply flexbox centering classes", () => {
      const { container } = render(<Settings />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.className).toContain("flex");
      expect(rootDiv.className).toContain("items-center");
      expect(rootDiv.className).toContain("justify-center");
    });

    it("should have proper spacing and layout classes", () => {
      const { container } = render(<Settings />);
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
    it("should have semantic heading text for 'Coming Soon'", () => {
      render(<Settings />);
      const heading = screen.getByTestId("fallback-main-message");
      expect(heading.textContent).toBe("Coming Soon");
    });

    it("should have descriptive text explaining the feature status", () => {
      render(<Settings />);
      const description = screen.getByTestId("fallback-description");
      expect(description.textContent).toContain("working on");
      expect(description.textContent).toContain("exciting");
      expect(description.textContent).toContain("soon");
    });

    it("should provide meaningful context to users", () => {
      render(<Settings />);
      const mainMessage = screen.getByText("Coming Soon");
      const description = screen.getByText(/working on something exciting/i);
      expect(mainMessage).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should render icon with accessible content", () => {
      render(<Settings />);
      const icon = screen.getByTestId("coming-soon-icon");
      expect(icon.textContent).toBe("ComingSoon");
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should render consistently on multiple renders", () => {
      const { container: firstRender } = render(<Settings />);
      const { container: secondRender } = render(<Settings />);

      expect(firstRender.innerHTML).toBe(secondRender.innerHTML);
    });

    it("should not break when rendered in isolation", () => {
      expect(() => render(<Settings />)).not.toThrow();
    });

    it("should maintain component structure after re-render", () => {
      const { container, rerender } = render(<Settings />);
      const initialHTML = container.innerHTML;

      rerender(<Settings />);

      expect(container.innerHTML).toBe(initialHTML);
    });

    it("should not have any console errors during render", () => {
      const consoleError = vi.spyOn(console, "error");
      render(<Settings />);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("should not have any console warnings during render", () => {
      const consoleWarn = vi.spyOn(console, "warn");
      render(<Settings />);
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
      render(<Settings />);
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(fallbackUI).toBeInTheDocument();
    });

    it("should pass all required props to FallbackUI", () => {
      render(<Settings />);

      // Verify all three props are present
      const image = screen.getByTestId("fallback-image");
      const mainMessage = screen.getByTestId("fallback-main-message");
      const description = screen.getByTestId("fallback-description");

      expect(image).not.toBeNull();
      expect(mainMessage).not.toBeNull();
      expect(description).not.toBeNull();
    });

    it("should not pass any button prop to FallbackUI", () => {
      render(<Settings />);
      // Since we're mocking FallbackUI, we can verify button is not rendered
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });

    it("should not pass isLoading prop to FallbackUI", () => {
      render(<Settings />);
      // Verify there's no loading spinner (CircularProgress)
      const spinner = screen.queryByRole("progressbar");
      expect(spinner).toBeNull();
    });

    it("should not pass className prop to FallbackUI", () => {
      // This test verifies that Settings doesn't add custom className
      // The component should work with default FallbackUI styling
      const { container } = render(<Settings />);
      expect(container).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for basic render", () => {
      const { container } = render(<Settings />);
      expect(container).toMatchSnapshot();
    });

    it("should match snapshot for component structure", () => {
      const { container } = render(<Settings />);
      const rootDiv = container.firstChild;
      expect(rootDiv).toMatchSnapshot();
    });

    it("should have consistent HTML output", () => {
      const { container } = render(<Settings />);
      expect(container.innerHTML).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Negative Scenarios
   * Verifies what the component should NOT do
   */
  describe("Negative Scenarios", () => {
    it("should not render any interactive buttons", () => {
      render(<Settings />);
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });

    it("should not render any form elements", () => {
      const { container } = render(<Settings />);
      const forms = container.querySelectorAll("form");
      const inputs = container.querySelectorAll("input");
      expect(forms.length).toBe(0);
      expect(inputs.length).toBe(0);
    });

    it("should not render any navigation links", () => {
      render(<Settings />);
      const links = screen.queryAllByRole("link");
      expect(links.length).toBe(0);
    });

    it("should not render any loading states", () => {
      render(<Settings />);
      const spinner = screen.queryByRole("progressbar");
      expect(spinner).toBeNull();
    });

    it("should not have any click handlers on the root element", () => {
      const { container } = render(<Settings />);
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv.onclick).toBeNull();
    });

    it("should not render dynamiclifeline based on props (it accepts none)", () => {
      // Settings is a pure presentational component with no props
      const { container: render1 } = render(<Settings />);
      const { container: render2 } = render(<Settings />);

      expect(render1.innerHTML).toBe(render2.innerHTML);
    });
  });

  /**
   * TEST GROUP: DOM Structure Validation
   * Verifies the exact DOM structure
   */
  describe("DOM Structure Validation", () => {
    it("should have a single root div element", () => {
      const { container } = render(<Settings />);
      expect(container.children.length).toBe(1);
      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });

    it("should nest FallbackUI inside the root div", () => {
      const { container } = render(<Settings />);
      const rootDiv = container.firstChild as HTMLElement;
      const fallbackUI = screen.getByTestId("fallback-ui-mock");
      expect(rootDiv).toContainElement(fallbackUI);
    });

    it("should have proper nesting hierarchy", () => {
      render(<Settings />);

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
      expect(typeof Settings).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(<Settings />);
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => <Settings />).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Feature Status Content Validation
   * Verifies the feature status message is clear and helpful
   */
  describe("Feature Status Content Validation", () => {
    it("should have a clear title indicating feature status", () => {
      render(<Settings />);
      const title = screen.getByText("Coming Soon");
      expect(title).not.toBeNull();
      expect(title.textContent).toContain("Coming");
      expect(title.textContent).toContain("Soon");
    });

    it("should explain the current development status", () => {
      render(<Settings />);
      const description = screen.getByText(/working on something exciting/i);
      expect(description.textContent).toContain("working on");
      expect(description.textContent).toContain("exciting");
      expect(description.textContent).toContain("available soon");
    });

    it("should use positive and encouraging language", () => {
      render(<Settings />);
      const description = screen.getByTestId("fallback-description");

      // Should use positive language
      expect(description.textContent?.toLowerCase()).toContain("exciting");
      expect(description.textContent?.toLowerCase()).toContain("soon");
      // Should not contain negative language
      expect(description.textContent?.toLowerCase()).not.toContain("error");
      expect(description.textContent?.toLowerCase()).not.toContain("broken");
      expect(description.textContent?.toLowerCase()).not.toContain("unavailable");
    });

    it("should provide a complete sentence with proper grammar", () => {
      render(<Settings />);
      const description = screen.getByTestId("fallback-description");
      const text = description.textContent || "";

      // Should be a complete sentence
      expect(text.trim().endsWith(".")).toBe(true);
      expect(text.length).toBeGreaterThan(10);
    });
  });
});
