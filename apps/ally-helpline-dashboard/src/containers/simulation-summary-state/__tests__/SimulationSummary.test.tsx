import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { useLazyGetSimulationSummaryQuery } from "@api";
import { useUser } from "@hooks";
import { UserRole } from "@types";

import SimulationSummary from "../SimulationSummary";
import { SimulationSummaryProps } from "../types";

// Mock the API hook
const mockLazyQuery = vi.fn();
const mockGetSimulationSummary = vi.fn();
vi.mock("@api", () => ({
  useLazyGetSimulationSummaryQuery: () => [mockLazyQuery, { data: mockGetSimulationSummary() }],
}));

// Mock the user hook
const mockUser = {
  id: "user-123",
  role: UserRole.LEARNER,
  name: "Test User",
  email: "test@example.com",
};
vi.mock("@hooks", () => ({
  useUser: () => ({ user: mockUser }),
}));

// Mock the child components
vi.mock("../components", () => ({
  FeedbackSection: () => <div data-testid="feedback-section">Feedback Section</div>,
  LoaderSkeleton: () => <div data-testid="loader-skeleton">Loading...</div>,
}));

// Mock the FeedbackDialog completely
vi.mock("../../feedback-dialog", () => ({
  FeedbackDialog: () => <div data-testid="feedback-dialog">Feedback Dialog</div>,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("SimulationSummary", () => {
  const defaultProps: SimulationSummaryProps = {
    summaryId: "test-summary-123",
    onSummaryFetch: vi.fn(),
    onSummaryClose: vi.fn(),
    isInSidebar: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLazyQuery.mockResolvedValue({ data: null });
    mockGetSimulationSummary.mockReturnValue(null);
  });

  describe("Basic Rendering", () => {
    it("should render component with correct props", () => {
      render(<SimulationSummary {...defaultProps} />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<SimulationSummary {...defaultProps} className="custom-class" />);

      // Check the main container div that has the className
      const container = screen
        .getByTestId("loader-skeleton")
        .closest(".relative.flex.flex-col.h-full.w-full");
      expect(container).toHaveClass("custom-class");
    });

    it("should render in sidebar mode", () => {
      render(<SimulationSummary {...defaultProps} isInSidebar={true} />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should call getSimulationSummary on mount", () => {
      render(<SimulationSummary {...defaultProps} />);

      expect(mockLazyQuery).toHaveBeenCalledWith(defaultProps.summaryId);
    });

    it("should call onSummaryFetch when data is received", async () => {
      const mockSummary = {
        id: "test-summary-123",
        details: { summary: { feedback: "Test feedback" } },
        hasFeedback: true,
      };
      mockLazyQuery.mockResolvedValue({ data: mockSummary });

      render(<SimulationSummary {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onSummaryFetch).toHaveBeenCalledWith(mockSummary);
      });
    });
  });

  describe("Content Rendering", () => {
    it("should show loader when no data", () => {
      mockGetSimulationSummary.mockReturnValue(null);

      render(<SimulationSummary {...defaultProps} />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty summaryId", () => {
      render(<SimulationSummary {...defaultProps} summaryId="" />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("should handle rapid summaryId changes", () => {
      const { rerender } = render(<SimulationSummary {...defaultProps} />);

      // Change summaryId rapidly
      rerender(<SimulationSummary {...defaultProps} summaryId="new-id-1" />);
      rerender(<SimulationSummary {...defaultProps} summaryId="new-id-2" />);

      expect(mockLazyQuery).toHaveBeenCalledTimes(3);
    });
  });
});
