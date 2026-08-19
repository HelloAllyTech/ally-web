import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ScenarioCard from "../ScenarioCard";
import { ScenarioCardProps } from "../types";

// --- Mocks Setup ---

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// --- Test Setup ---

const mockOnClick = vi.fn();

const defaultProps: ScenarioCardProps = {
  coverImage: "https://example.com/scenario-image.jpg",
  description: "This is a test scenario description that provides details about the simulation.",
  onClick: mockOnClick,
  title: "Test Scenario",
  isComingSoon: false,
};

const renderComponent = (props: Partial<ScenarioCardProps> = {}) => {
  return render(<ScenarioCard {...defaultProps} {...props} />);
};

describe("ScenarioCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering Tests ---

  it("should render the card container", () => {
    renderComponent();
    const card = screen.getByRole("button", { name: /Select Test Scenario scenario/i });
    expect(card).toBeInTheDocument();
  });

  it("should render the title", () => {
    const title = "Custom Scenario Title";
    renderComponent({ title });
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it("should render the cover image with correct attributes", () => {
    const imageUrl = "https://example.com/test-image.jpg";
    renderComponent({ coverImage: imageUrl });
    const image = screen.getByAltText("Test Scenario scenario cover");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", imageUrl);
    expect(image).toHaveAttribute("loading", "lazy");
  });

  it("should render 'Coming Soon' badge when isComingSoon is true", () => {
    renderComponent({ isComingSoon: true });
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("should not render 'Coming Soon' badge when isComingSoon is false", () => {
    renderComponent({ isComingSoon: false });
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
  });

  // --- Completed Badge Tests ---

  it("should render the completed badge without a count for a single attempt", () => {
    renderComponent({ attemptCount: 1 });
    expect(screen.getByLabelText("Completed once")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("should show the attempt count once the learner has replayed", () => {
    renderComponent({ attemptCount: 3 });
    expect(screen.getByLabelText("Completed 3 times")).toBeInTheDocument();
    expect(screen.getByText("Completed · 3×")).toBeInTheDocument();
  });

  it("should not render the completed badge when never completed", () => {
    renderComponent({ attemptCount: 0 });
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it("should not render the completed badge when attemptCount is omitted", () => {
    renderComponent();
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
  });

  it("should leave the card clickable when completed — replay is never blocked", () => {
    renderComponent({ attemptCount: 2 });
    const card = screen.getByRole("button", { name: /Select Test Scenario scenario/i });
    fireEvent.click(card);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(card.className).toContain("cursor-pointer");
  });

  it("should not render the completed badge on a pathway/case/course card", () => {
    // totalScenarios present ⇒ the card is a multi-item one, which shows its
    // own progress ring instead.
    renderComponent({ attemptCount: 2, totalScenarios: 5, completedScenarios: 5 });
    expect(screen.queryByText(/Completed ·/)).not.toBeInTheDocument();
  });

  it("should prefer 'Coming Soon' over the completed badge", () => {
    renderComponent({ attemptCount: 2, isComingSoon: true });
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.queryByText(/Completed ·/)).not.toBeInTheDocument();
  });

  // --- Image Error Handling Tests ---

  it("should show fallback message when image fails to load", () => {
    renderComponent();
    const image = screen.getByAltText("Test Scenario scenario cover");

    fireEvent.error(image);

    expect(screen.getByText("Image not available")).toBeInTheDocument();
    expect(screen.queryByAltText("Test Scenario scenario cover")).not.toBeInTheDocument();
  });

  // The course player renders this card before its scenario request resolves,
  // so the first paint has no cover URL at all.
  it("should not hand an empty src to <img> while the cover is still loading", () => {
    renderComponent({ coverImage: "" });

    expect(screen.queryByAltText("Test Scenario scenario cover")).not.toBeInTheDocument();
  });

  it("should show a cover that arrives after an earlier one failed", () => {
    const { rerender } = render(
      <ScenarioCard {...defaultProps} coverImage="https://example.com/pending.jpg" />,
    );
    fireEvent.error(screen.getByAltText("Test Scenario scenario cover"));

    rerender(<ScenarioCard {...defaultProps} coverImage="https://example.com/arrived.jpg" />);

    expect(screen.getByAltText("Test Scenario scenario cover")).toHaveAttribute(
      "src",
      "https://example.com/arrived.jpg",
    );
    expect(screen.queryByText("Image not available")).not.toBeInTheDocument();
  });

  it("should apply blur and grayscale styles when isComingSoon and image loaded", () => {
    renderComponent({ isComingSoon: true });
    const image = screen.getByAltText("Test Scenario scenario cover");
    expect(image).toHaveClass("blur-[2px]", "grayscale", "opacity-50");
  });

  it("should not apply blur styles when isComingSoon is false", () => {
    renderComponent({ isComingSoon: false });
    const image = screen.getByAltText("Test Scenario scenario cover");
    expect(image).not.toHaveClass("blur-[2px]", "grayscale", "opacity-50");
  });

  // --- Interaction Tests ---

  it("should call onClick when card is clicked", () => {
    renderComponent();
    const card = screen.getByRole("button");

    fireEvent.click(card);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick for other keys", () => {
    renderComponent();
    const card = screen.getByRole("button");

    fireEvent.keyPress(card, { key: "Escape", code: "Escape" });
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it("should have pointer-events-none class when isComingSoon is true", () => {
    renderComponent({ isComingSoon: true });
    const card = screen.getByRole("button");
    expect(card).toHaveClass("pointer-events-none");
  });

  it("should have cursor-pointer class when isComingSoon is false", () => {
    renderComponent({ isComingSoon: false });
    const card = screen.getByRole("button");
    expect(card).toHaveClass("cursor-pointer");
  });

  // --- Accessibility Tests ---

  it("should have correct aria-label", () => {
    const title = "Custom Scenario";
    renderComponent({ title });
    const card = screen.getByRole("button", { name: /Select Custom Scenario scenario/i });
    expect(card).toBeInTheDocument();
  });

  it("should have tabIndex for keyboard navigation", () => {
    renderComponent();
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("should handle long title text", () => {
    const longTitle = "This is a very long title that might wrap across multiple lines";
    renderComponent({ title: longTitle });
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it("should handle long description text", () => {
    const longDescription =
      "This is a very long description that contains a lot of text and might be truncated based on the CSS styling applied to the description element.";
    renderComponent({ description: longDescription });
    expect(screen.getByText(longDescription)).toBeInTheDocument();
  });

  it("should handle invalid image URL", () => {
    renderComponent({ coverImage: "invalid-url" });
    const image = screen.getByAltText("Test Scenario scenario cover");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "invalid-url");
  });

  it("should update title when props change", () => {
    const { rerender } = renderComponent();
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();

    rerender(<ScenarioCard {...defaultProps} title="New Title" />);
    expect(screen.getByText("New Title")).toBeInTheDocument();
    expect(screen.queryByText("Test Scenario")).not.toBeInTheDocument();
  });

  it("should update description when props change", () => {
    const { rerender } = renderComponent();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();

    const newDescription = "New description text";
    rerender(<ScenarioCard {...defaultProps} description={newDescription} />);
    expect(screen.getByText(newDescription)).toBeInTheDocument();
    expect(screen.queryByText(defaultProps.description)).not.toBeInTheDocument();
  });
});
