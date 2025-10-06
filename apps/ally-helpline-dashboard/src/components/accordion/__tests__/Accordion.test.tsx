import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import Accordion from "../Accordion";

describe("Accordion", () => {
  const mockTitle = "Test Accordion";
  const mockContent = "Test Content";
  const mockTitleIcon = {
    icon: PlayArrowRounded,
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

    const accordionHeader = screen.getByText(mockTitle);
    const accordionElement = accordionHeader.closest(".MuiAccordion-root");

    expect(accordionElement).not.toHaveClass("Mui-expanded");

    fireEvent.click(accordionHeader);
    expect(accordionElement).toHaveClass("Mui-expanded");

    fireEvent.click(accordionHeader);
    expect(accordionElement).not.toHaveClass("Mui-expanded");
  });

  it("renders expanded by default when defaultExpanded is true", () => {
    render(
      <Accordion title={mockTitle} defaultExpanded>
        {mockContent}
      </Accordion>,
    );
    const accordionElement = screen.getByText(mockTitle).closest(".MuiAccordion-root");
    expect(accordionElement).toHaveClass("Mui-expanded");
  });

  // ---- Snapshot tests ----
  it("matches snapshot (collapsed)", () => {
    const { container } = render(<Accordion title={mockTitle}>{mockContent}</Accordion>);
    expect(container).toMatchSnapshot();
  });

  it("matches snapshot (expanded)", () => {
    const { container } = render(
      <Accordion title={mockTitle} defaultExpanded>
        {mockContent}
      </Accordion>,
    );
    expect(container).toMatchSnapshot();
  });
});
