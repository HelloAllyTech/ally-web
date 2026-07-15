import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import Accordion from "../Accordion";

// Simple stand-in for the icon component the consumer passes in. The Accordion
// renders it as `<TitleIcon className="h-6 w-6" />`, so it must accept props.
const ExpandIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="expand-icon" aria-label="expand icon" {...props} />
);

describe("Accordion", () => {
  const mockTitle = "Test Accordion";
  const mockContent = "Test Content";
  const mockTitleIcon = {
    icon: ExpandIcon,
    alt: "expand icon",
  };

  // ---- Behavioral tests ----
  it("renders with title and content", () => {
    render(<Accordion title={mockTitle}>{mockContent}</Accordion>);
    expect(screen.getByText(mockTitle)).toBeInTheDocument();
    expect(screen.getByText(mockContent)).toBeInTheDocument();
  });

  it("renders with title icon when provided", () => {
    render(
      <Accordion title={mockTitle} titleIcon={mockTitleIcon}>
        {mockContent}
      </Accordion>,
    );
    expect(screen.getByLabelText("expand icon")).toBeInTheDocument();
  });

  it("expands and collapses when clicked", () => {
    render(<Accordion title={mockTitle}>{mockContent}</Accordion>);

    // Carbon AccordionItem renders its header as a button with aria-expanded.
    const headerButton = screen.getByRole("button");

    expect(headerButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(headerButton);
    expect(headerButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(headerButton);
    expect(headerButton).toHaveAttribute("aria-expanded", "false");
  });

  it("renders expanded by default when defaultExpanded is true", () => {
    render(
      <Accordion title={mockTitle} defaultExpanded>
        {mockContent}
      </Accordion>,
    );
    const headerButton = screen.getByRole("button");
    expect(headerButton).toHaveAttribute("aria-expanded", "true");
  });
});
