import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { UserRole } from "@types";

import { SimulationSummary } from "../SimulationSummary";
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
  UpNextSimulationCard: () => <div data-testid="up-next-simulation-card">Up Next Simulation</div>,
}));

// Mock the FeedbackDialog completely
vi.mock("..", () => ({
  FeedbackDialog: () => <div data-testid="feedback-dialog">Feedback Dialog</div>,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  PermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

// Mock constants
vi.mock("@constants", () => ({
  Permissions: {
    EDIT_SCENARIO_SESSION: "edit:scenario-session",
  },
}));

// Mock types
vi.mock("@types", () => ({
  SessionType: {
    SIMULATION: "simulation",
  },
  IssueOptions: {
    MISSING_KEY_INFORMATION: "MISSING_KEY_INFORMATION",
    INACCURATE: "INACCURATE",
    TOO_VAGUE: "TOO_VAGUE",
    DIFFICULT_TO_UNDERSTAND: "DIFFICULT_TO_UNDERSTAND",
    TOO_SHORT: "TOO_SHORT",
    OTHER: "OTHER",
  },
  UserRole: {
    LEARNER: "LEARNER",
    COUNSELLOR: "COUNSELLOR",
    ADMIN: "ADMIN",
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Remove the mock of the actual component since we want to test the real component

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
      const container = screen.getByTestId("simulation-summary");
      expect(container).toHaveClass("custom-class");
    });

    it("should render in sidebar mode", () => {
      render(<SimulationSummary {...defaultProps} isInSidebar={true} />);

      expect(screen.getByTestId("loader-skeleton")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("should call getSimulationSummary on mount", async () => {
      render(<SimulationSummary {...defaultProps} />);

      await waitFor(() => {
        expect(mockLazyQuery).toHaveBeenCalledWith(defaultProps.summaryId);
      });
    });

    it("should call onSummaryFetch when data is received", async () => {
      const mockSummary = {
        id: "test-summary-123",
        details: { summary: { feedback: "Test feedback" } },
        hasFeedback: true,
      };
      mockLazyQuery.mockResolvedValue({ data: mockSummary });
      mockGetSimulationSummary.mockReturnValue(mockSummary);

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
    it("should handle rapid summaryId changes", async () => {
      const { rerender } = render(<SimulationSummary {...defaultProps} />);

      // Change summaryId rapidly
      rerender(<SimulationSummary {...defaultProps} summaryId="new-id-1" />);
      rerender(<SimulationSummary {...defaultProps} summaryId="new-id-2" />);

      await waitFor(() => {
        expect(mockLazyQuery).toHaveBeenCalledTimes(3);
      });
    });
  });
});
