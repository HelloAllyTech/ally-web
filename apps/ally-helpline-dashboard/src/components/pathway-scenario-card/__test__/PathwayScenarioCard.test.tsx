import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { PathwayScenarioStatus } from "@types";

import { PathwayScenarioCard } from "../PathwayScenarioCard";
import { PathwayScenarioCardProps } from "../types";

// --- Mocks Setup ---

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// --- Test Setup ---

const mockOnScenarioClick = vi.fn();
const mockOnViewSummary = vi.fn();

const defaultProps: PathwayScenarioCardProps = {
  scenario: {
    sessionItemId: 1,
    sessionId: "session-123",
    scenarioId: 1,
    coverImageUrl: "https://example.com/scenario-image.jpg",
    coverVideoUrl: "https://example.com/scenario-video.mp4",
    description: "Test scenario description",
    title: "Test Scenario",
    order: 1,
    status: PathwayScenarioStatus.UNLOCKED,
  },
  index: 0,
  onScenarioClick: mockOnScenarioClick,
  onViewSummary: mockOnViewSummary,
};

const renderComponent = (props: Partial<PathwayScenarioCardProps> = {}) => {
  return render(<PathwayScenarioCard {...defaultProps} {...props} />);
};

describe("PathwayScenarioCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering Tests ---

  it("should render the card with scenario title", () => {
    renderComponent();
    expect(screen.getByText("Test Scenario")).toBeInTheDocument();
  });

  it("should render simulation number", () => {
    renderComponent({ index: 2 });
    expect(screen.getByText("Simulation 3")).toBeInTheDocument();
  });

  it("should render the cover image", () => {
    renderComponent();
    const image = screen.getByAltText("Test Scenario");
    expect(image).toBeInTheDocument();
  });

  // --- Status Badge Tests ---

  it("should render completed badge when status is COMPLETED", () => {
    renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.COMPLETED },
    });
    const badge = screen.getByRole("img", { hidden: true });
    expect(badge).toBeInTheDocument();
  });

  it("should render 'Next' badge when status is UNLOCKED and index > 0", () => {
    renderComponent({
      index: 1,
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.UNLOCKED },
    });
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("should not render 'Next' badge when status is UNLOCKED and index is 0", () => {
    renderComponent({
      index: 0,
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.UNLOCKED },
    });
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  // --- Lock State Tests ---

  it("should render lock icon when status is LOCKED", () => {
    renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.LOCKED },
    });
    const lockIcon = screen.getByRole("img", { hidden: true });
    expect(lockIcon).toBeInTheDocument();
  });

  it("should have cursor-not-allowed class when status is LOCKED", () => {
    const { container } = renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.LOCKED },
    });
    const card = container.firstChild;
    expect(card).toHaveClass("cursor-not-allowed");
  });

  // --- View Summary Tests ---

  it("should render 'View summary' button when status is COMPLETED", () => {
    renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.COMPLETED },
    });
    expect(screen.getByText("View summary")).toBeInTheDocument();
  });

  it("should not render 'View summary' button when status is not COMPLETED", () => {
    renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.UNLOCKED },
    });
    expect(screen.queryByText("View summary")).not.toBeInTheDocument();
  });

  it("should call onViewSummary when 'View summary' button is clicked", () => {
    renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.COMPLETED },
    });
    const viewSummaryButton = screen.getByText("View summary");
    fireEvent.click(viewSummaryButton);
    expect(mockOnViewSummary).toHaveBeenCalledWith("session-123");
    expect(mockOnScenarioClick).not.toHaveBeenCalled();
  });

  // --- Interaction Tests ---

  it("should call onScenarioClick when card is clicked", () => {
    const { container } = renderComponent();
    const card = container.firstChild;
    fireEvent.click(card as Element);
    expect(mockOnScenarioClick).toHaveBeenCalledWith(1, PathwayScenarioStatus.UNLOCKED);
  });

  it("should have cursor-pointer class when status is not LOCKED", () => {
    const { container } = renderComponent({
      scenario: { ...defaultProps.scenario, status: PathwayScenarioStatus.UNLOCKED },
    });
    const card = container.firstChild;
    expect(card).toHaveClass("cursor-pointer");
  });
});
