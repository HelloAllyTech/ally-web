import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import StressBusterStep from "../StressBusterStep";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div data-testid="motion-div" className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @components
vi.mock("@components", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
  BoxBreathing: ({ showViewSummaryButton, onViewSummary, ...props }: any) => (
    <div data-testid="box-breathing" {...props}>
      {showViewSummaryButton && (
        <button data-testid="box-breathing-view-summary" onClick={onViewSummary}>
          View Summary
        </button>
      )}
    </div>
  ),
}));

describe("StressBusterStep", () => {
  const mockOnProceed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---

  it("should match snapshot", () => {
    const { asFragment } = render(<StressBusterStep onProceed={mockOnProceed} />);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the component", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    expect(screen.getByTestId("motion-div")).toBeInTheDocument();
  });

  it("should render BoxBreathing component", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    expect(screen.getByTestId("box-breathing")).toBeInTheDocument();
  });

  it("should pass showViewSummaryButton prop to BoxBreathing", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    const boxBreathing = screen.getByTestId("box-breathing");
    expect(boxBreathing).toBeInTheDocument();
    expect(screen.getByTestId("box-breathing-view-summary")).toBeInTheDocument();
  });

  it("should render View Call Summary button", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    expect(screen.getByText("stressBuster.viewCallSummary")).toBeInTheDocument();
  });

  // --- Interaction Tests ---

  it("should call onProceed when View Call Summary button is clicked", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    const button = screen.getByText("stressBuster.viewCallSummary");
    fireEvent.click(button);
    expect(mockOnProceed).toHaveBeenCalledTimes(1);
  });

  it("should call onProceed when BoxBreathing view summary button is clicked", () => {
    render(<StressBusterStep onProceed={mockOnProceed} />);
    const boxBreathingButton = screen.getByTestId("box-breathing-view-summary");
    fireEvent.click(boxBreathingButton);
    expect(mockOnProceed).toHaveBeenCalledTimes(1);
  });
});
