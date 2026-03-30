import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { SimulationSummary } from "../SimulationSummary";
import { SimulationSummaryProps } from "../types";

// Mock the child components
vi.mock("../components", () => ({
  FeedbackSection: (props: any) => (
    <div data-testid="feedback-section">Feedback Section for {props.sessionId}</div>
  ),
  LoaderSkeleton: () => <div data-testid="loader-skeleton">Loading...</div>,
}));

describe("SimulationSummary", () => {
  const defaultProps: SimulationSummaryProps = {
    sessionId: "test-session-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render loader when no summaryData", () => {
      render(<SimulationSummary {...defaultProps} />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<SimulationSummary {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId("simulation-summary");
      expect(container).toHaveClass("custom-class");
    });

    it("should return null when hideSection is true", () => {
      const { container } = render(<SimulationSummary {...defaultProps} hideSection />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Content Rendering", () => {
    it("should show loader when summaryData has no feedback and retryMaxReached is false", () => {
      render(
        <SimulationSummary
          {...defaultProps}
          summaryData={
            {
              sessionId: "test-123",
              details: { summary: {} },
            } as any
          }
        />,
      );

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });

    it("should show FeedbackSection when summaryData has feedback", () => {
      render(
        <SimulationSummary
          {...defaultProps}
          summaryData={
            {
              sessionId: "test-123",
              details: { summary: { feedback: "Done" } },
            } as any
          }
        />,
      );

      expect(screen.getByTestId("feedback-section")).toBeInTheDocument();
      expect(screen.getByTestId("feedback-section")).toHaveTextContent(
        "Feedback Section for test-session-123",
      );
    });

    it("should show FeedbackSection when retryMaxReached is true and summaryData exists", () => {
      render(
        <SimulationSummary
          {...defaultProps}
          retryMaxReached
          summaryData={
            {
              sessionId: "test-123",
              details: { summary: {} },
            } as any
          }
        />,
      );

      expect(screen.getByTestId("feedback-section")).toBeInTheDocument();
    });
  });
});
