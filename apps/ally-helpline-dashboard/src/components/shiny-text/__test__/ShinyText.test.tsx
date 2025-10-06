import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import ShinyText from "../ShinyText";

describe("ShinyText", () => {
  const testText = "Awesome App";
  const testDuration = 5000;
  const testClassName = "text-xl font-bold";

  it("renders the text and applies the correct accessibility label", () => {
    render(<ShinyText text={testText} />);

    const shinyElement = screen.getByText(testText);

    // Check text content
    expect(shinyElement).toBeInTheDocument();

    // Check aria-label for accessibility
    expect(shinyElement).toHaveAttribute("aria-label", testText);
  });

  it("applies the default animation duration when the duration prop is omitted", () => {
    render(<ShinyText text={testText} />);

    const shinyElement = screen.getByText(testText);

    // Default duration is 2000ms
    expect(shinyElement).toHaveStyle("animation-duration: 2000ms;");
  });

  it("applies a custom animation duration when the duration prop is provided", () => {
    render(<ShinyText text={testText} duration={testDuration} />);

    const shinyElement = screen.getByText(testText);

    expect(shinyElement).toHaveStyle(`animation-duration: ${testDuration}ms;`);
  });

  it("merges the base Tailwind classes and the custom className", () => {
    render(<ShinyText text={testText} className={testClassName} />);

    const shinyElement = screen.getByText(testText);

    // Check for a required base class
    expect(shinyElement).toHaveClass("relative");

    // Check for the custom class
    expect(shinyElement).toHaveClass("text-xl");
    expect(shinyElement).toHaveClass("font-bold");
  });

  it("renders the internal <style> tag with the required keyframes", () => {
    render(<ShinyText text={testText} />);

    // Find the parent <span> element
    const shinyElement = screen.getByText(testText);

    // The <style> tag is a child of the <span> element.
    const styleElement = shinyElement.querySelector("style");

    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.tagName).toBe("STYLE");
    expect(styleElement?.textContent).toContain("@keyframes shiny-text");
  });
});
