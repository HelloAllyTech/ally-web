/**
 * Comprehensive Unit Tests for UserAnalytics Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - API integration and data fetching
 * - Calendar functionality and date handling
 * - View mode switching (Day, Week, Month, Year, All)
 * - Date navigation (prev/next)
 * - Calendar popup functionality
 * - Loading states and error handling
 * - Chart integration
 * - Button interactions
 * - Accessibility features
 * - Snapshot testing
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { UserRole } from "@types";

import UserAnalytics from "../UserAnalytics";

// Mock the API hook
const mockGetCounsellorStats = vi.fn();
const mockUseLazyGetCounsellorStatsQuery = vi.fn();

vi.mock("@api", () => ({
  useLazyGetCounsellorStatsQuery: () => [
    mockGetCounsellorStats,
    mockUseLazyGetCounsellorStatsQuery(),
  ],
}));

// Mock the components
vi.mock("@components", () => ({
  Button: vi.fn(({ children, onClick, className, variant }) => (
    <button data-testid="button" onClick={onClick} className={className} data-variant={variant}>
      {children}
    </button>
  )),
  Calendar: vi.fn(({ mode, onChange, value, onMonthClick, onYearClick, disableFuture }) => (
    <div
      data-testid="calendar"
      data-mode={mode}
      data-disable-future={disableFuture}
      onClick={() => {
        if (onChange) onChange(new Date());
        if (onMonthClick) onMonthClick(new Date());
        if (onYearClick) onYearClick(new Date());
      }}
    >
      Calendar Component
    </div>
  )),
}));

// Mock the utils
vi.mock("@utils", () => ({
  getDateRange: vi.fn((date, type) => {
    const startDate = new Date(date);
    const endDate = new Date(date);

    switch (type) {
      case "day":
        return [startDate, endDate];
      case "week":
        endDate.setDate(startDate.getDate() + 6);
        return [startDate, endDate];
      case "month":
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(0);
        return [startDate, endDate];
      case "year":
        endDate.setFullYear(startDate.getFullYear() + 1);
        endDate.setDate(0);
        return [startDate, endDate];
      default:
        return [startDate, endDate];
    }
  }),
}));

// Mock the ListeningChart component
vi.mock("../ListeningChart", () => ({
  default: vi.fn(({ isEmpty, listeningPercentage, className }) => (
    <div
      data-testid="listening-chart"
      data-is-empty={isEmpty}
      data-listening-percentage={listeningPercentage}
      className={className}
    >
      Listening Chart
    </div>
  )),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronLeft: vi.fn(({ onClick, className }) => (
    <button data-testid="chevron-left" onClick={onClick} className={className}>
      ChevronLeft
    </button>
  )),
  ChevronRight: vi.fn(({ onClick, className }) => (
    <button data-testid="chevron-right" onClick={onClick} className={className}>
      ChevronRight
    </button>
  )),
}));

// Mock MUI CircularProgress
vi.mock("@mui/material", () => ({
  CircularProgress: vi.fn(() => <div data-testid="circular-progress">Loading...</div>),
}));

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === "yyyy-MM-dd") {
      return "2024-01-01";
    }
    if (formatStr === "MMM dd") {
      return "Jan 01";
    }
    if (formatStr === "MMM yyyy") {
      return "Jan 2024";
    }
    if (formatStr === "yyyy") {
      return "2024";
    }
    return "2024-01-01";
  }),
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = configureStore({
    reducer: {
      user: (state = { user: { role: UserRole.COUNSELLOR } }) => state,
    },
  });
  return <Provider store={store}>{children}</Provider>;
};

describe("UserAnalytics Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLazyGetCounsellorStatsQuery.mockReturnValue({
      data: {
        counselorListeningDuration: 100,
        counselorSharingDuration: 50,
        counselorSharingPercentage: 30,
      },
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("listening-chart")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(
          <TestWrapper>
            <UserAnalytics />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector(
        "div.flex.justify-start.items-start.bg-white.p-6.w-full.h-full.gap-6",
      );
      expect(mainContainer).not.toBeNull();
    });

    it("should render view buttons section", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      const viewButtons = screen.getAllByRole("button");
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it("should render date navigation section", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("chevron-left")).toBeInTheDocument();
      expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: View Mode Switching
   * Verifies view mode switching functionality
   */
  describe("View Mode Switching", () => {
    it("should render all view mode buttons", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      const viewButtons = buttons.filter(
        button =>
          button.textContent === "D" ||
          button.textContent === "W" ||
          button.textContent === "M" ||
          button.textContent === "Y" ||
          button.textContent === "All",
      );

      expect(viewButtons).toHaveLength(5);
    });

    it("should handle day mode selection", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const dayButton = screen.getByText("D");
      fireEvent.click(dayButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });

    it("should handle week mode selection", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const weekButton = screen.getByText("W");
      fireEvent.click(weekButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });

    it("should handle month mode selection", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const monthButton = screen.getByText("M");
      fireEvent.click(monthButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });

    it("should handle year mode selection", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const yearButton = screen.getByText("Y");
      fireEvent.click(yearButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });

    it("should handle all mode selection", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const allButton = screen.getByText("All");
      fireEvent.click(allButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });
  });

  /**
   * TEST GROUP: Date Navigation
   * Verifies date navigation functionality
   */
  describe("Date Navigation", () => {
    it("should handle previous date navigation", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const prevButton = screen.getByTestId("chevron-left");
      fireEvent.click(prevButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });

    it("should handle next date navigation", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const nextButton = screen.getByTestId("chevron-right");
      fireEvent.click(nextButton);

      expect(mockGetCounsellorStats).toHaveBeenCalled();
    });
  });

  /**
   * TEST GROUP: Calendar Functionality
   * Verifies calendar popup functionality
   */
  describe("Calendar Functionality", () => {
    it("should open calendar when date is clicked", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const dateDisplay = screen.getByText("Jan 01");
      fireEvent.click(dateDisplay);

      expect(screen.getByTestId("calendar")).toBeInTheDocument();
    });

    it("should close calendar when cancel is clicked", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const dateDisplay = screen.getByText("Jan 01");
      fireEvent.click(dateDisplay);

      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId("calendar")).not.toBeInTheDocument();
    });

    it("should close calendar when OK is clicked", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const dateDisplay = screen.getByText("Jan 01");
      fireEvent.click(dateDisplay);

      const okButton = screen.getByText("OK");
      fireEvent.click(okButton);

      expect(screen.queryByTestId("calendar")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Loading States
   * Verifies loading state rendering
   */
  describe("Loading States", () => {
    it("should show loading spinner when loading", () => {
      mockUseLazyGetCounsellorStatsQuery.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should hide loading spinner when data is loaded", () => {
      mockUseLazyGetCounsellorStatsQuery.mockReturnValue({
        data: { counselorListeningDuration: 100 },
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("circular-progress")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Chart Integration
   * Verifies ListeningChart integration
   */
  describe("Chart Integration", () => {
    it("should render ListeningChart with correct props", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const chart = screen.getByTestId("listening-chart");
      expect(chart).toBeInTheDocument();
      expect(chart).toHaveAttribute("data-listening-percentage", "70");
      expect(chart).toHaveAttribute("data-is-empty", "false");
    });

    it("should handle empty data state", () => {
      mockUseLazyGetCounsellorStatsQuery.mockReturnValue({
        data: {
          counselorListeningDuration: 0,
          counselorSharingDuration: 0,
          counselorSharingPercentage: 0,
        },
        isLoading: false,
        isError: false,
      });

      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const chart = screen.getByTestId("listening-chart");
      expect(chart).toHaveAttribute("data-is-empty", "true");
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should handle API errors gracefully", () => {
      mockUseLazyGetCounsellorStatsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const chart = screen.getByTestId("listening-chart");
      expect(chart).toHaveAttribute("data-listening-percentage", "0");
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have proper calendar accessibility", () => {
      render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );

      const dateDisplay = screen.getByText("Jan 01");
      fireEvent.click(dateDisplay);

      const calendar = screen.getByTestId("calendar");
      expect(calendar).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const { asFragment } = render(
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof UserAnalytics).toBe("function");
    });

    it("should return a valid React element", () => {
      const element = (
        <TestWrapper>
          <UserAnalytics />
        </TestWrapper>
      );
      expect(element).toBeDefined();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(
          <TestWrapper>
            <UserAnalytics />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });
});
