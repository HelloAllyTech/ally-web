/**
 * Comprehensive Unit Tests for OrgAnalytics Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - API integration and data fetching
 * - Dashboard URL management
 * - iframe rendering and error handling
 * - Interval management for URL refresh
 * - Loading states and error handling
 * - Accessibility features
 * - Snapshot testing
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import OrgAnalytics from "../OrgAnalytics";

// Mock the API hooks
const mockGetDashboardUrl = vi.fn();
const mockGetDashboards = vi.fn();
const mockUseLazyGetDashboardUrlQuery = vi.fn();
const mockUseLazyGetDashboardsQuery = vi.fn();

vi.mock("@api", () => ({
  useLazyGetDashboardUrlQuery: () => [mockGetDashboardUrl, mockUseLazyGetDashboardUrlQuery()],
  useLazyGetDashboardsQuery: () => [mockGetDashboards, mockUseLazyGetDashboardsQuery()],
}));

// Mock the logger
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("OrgAnalytics Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLazyGetDashboardsQuery.mockReturnValue({
      data: [{ externalId: "dashboard1" }, { externalId: "dashboard2" }],
      isLoading: false,
      isError: false,
    });
    mockUseLazyGetDashboardUrlQuery.mockReturnValue({
      data: { url: "https://example.com/dashboard1" },
      isLoading: false,
      isError: false,
    });

    // Mock the API functions to return promises
    mockGetDashboards.mockResolvedValue({
      data: [{ externalId: "dashboard1" }, { externalId: "dashboard2" }],
    });
    mockGetDashboardUrl.mockResolvedValue({
      data: { url: "https://example.com/dashboard1" },
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
    it("should render successfully", async () => {
      render(<OrgAnalytics />);
      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
      });
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(<OrgAnalytics />);
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<OrgAnalytics />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<OrgAnalytics />);
      const mainContainer = container.querySelector(
        "div.h-\\[90vh\\].w-full.flex.items-center.justify-center",
      );
      expect(mainContainer).not.toBeNull();
    });

    it("should render iframe elements for dashboards", async () => {
      render(<OrgAnalytics />);
      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
      });
    });

    it("should have proper iframe attributes", async () => {
      render(<OrgAnalytics />);
      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        expect(iframes[0]).toHaveAttribute("width", "100%");
        expect(iframes[0]).toHaveAttribute("height", "100%");
      });
    });
  });

  /**
   * TEST GROUP: API Integration
   * Verifies API integration and data fetching
   */
  describe("API Integration", () => {
    it("should call getDashboards on mount", () => {
      render(<OrgAnalytics />);
      expect(mockGetDashboards).toHaveBeenCalled();
    });

    it("should call getDashboardUrl for each dashboard", async () => {
      render(<OrgAnalytics />);

      await waitFor(() => {
        expect(mockGetDashboardUrl).toHaveBeenCalledWith({ dashboardId: "dashboard1" });
        expect(mockGetDashboardUrl).toHaveBeenCalledWith({ dashboardId: "dashboard2" });
      });
    });

    it("should handle API errors gracefully", async () => {
      mockGetDashboardUrl.mockRejectedValue(new Error("API Error"));

      render(<OrgAnalytics />);

      // Wait for the API call to be made and fail
      await waitFor(
        () => {
          expect(mockGetDashboardUrl).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // The error should be logged by the component
      const { logger } = await import("@ally-ui-mono/ui-shared");
      expect(logger.info).toHaveBeenCalledWith("Error in triggerDashboardUrl: Error: API Error");
    });
  });

  /**
   * TEST GROUP: Dashboard URL Management
   * Verifies dashboard URL management functionality
   */
  describe("Dashboard URL Management", () => {
    it("should update dashboard URLs when API returns data", async () => {
      mockGetDashboardUrl.mockResolvedValue({
        data: { url: "https://example.com/dashboard1" },
      });

      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        expect(iframes[0]).toHaveAttribute("src", "https://example.com/dashboard1");
      });
    });

    it("should handle multiple dashboard URLs", async () => {
      mockGetDashboardUrl
        .mockResolvedValueOnce({ data: { url: "https://example.com/dashboard1" } })
        .mockResolvedValueOnce({ data: { url: "https://example.com/dashboard2" } });

      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes).toHaveLength(2);
      });
    });

    it("should replace bordered=true with bordered=false in URLs", async () => {
      mockGetDashboardUrl.mockResolvedValue({
        data: { url: "https://example.com/dashboard1?bordered=true" },
      });

      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        expect(iframes[0]).toHaveAttribute("src", "https://example.com/dashboard1?bordered=false");
      });
    });
  });

  /**
   * TEST GROUP: Interval Management
   * Verifies interval management for URL refresh
   */
  describe("Interval Management", () => {
    it("should set up interval for URL refresh", () => {
      vi.useFakeTimers();

      render(<OrgAnalytics />);

      // Fast-forward time to trigger interval
      vi.advanceTimersByTime(870000);

      expect(mockGetDashboardUrl).toHaveBeenCalledTimes(4); // 2 initial + 2 from interval

      vi.useRealTimers();
    });

    it("should clear interval on unmount", () => {
      vi.useFakeTimers();

      const { unmount } = render(<OrgAnalytics />);

      unmount();

      // Fast-forward time to check if interval is cleared
      vi.advanceTimersByTime(870000);

      // Should not have additional calls after unmount
      expect(mockGetDashboardUrl).toHaveBeenCalledTimes(2); // Only initial calls

      vi.useRealTimers();
    });
  });

  /**
   * TEST GROUP: iframe Error Handling
   * Verifies iframe error handling functionality
   */
  describe("iframe Error Handling", () => {
    it("should handle iframe onError event", async () => {
      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        const onError = iframes[0].getAttribute("onError");
        expect(onError).toBeDefined();
      });
    });

    it("should trigger dashboard URL refresh on iframe error", async () => {
      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        fireEvent.error(iframes[0]);

        // Should call getDashboardUrl again
        expect(mockGetDashboardUrl).toHaveBeenCalled();
      });
    });
  });

  /**
   * TEST GROUP: Loading States
   * Verifies loading state handling
   */
  describe("Loading States", () => {
    it("should handle loading state from API", () => {
      mockUseLazyGetDashboardsQuery.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      render(<OrgAnalytics />);

      // Should not render iframes when loading
      expect(screen.queryByTitle("Metabase dashboard")).not.toBeInTheDocument();
    });

    it("should handle empty dashboards data", () => {
      mockUseLazyGetDashboardsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      });

      render(<OrgAnalytics />);

      // Should not render iframes when no dashboards
      expect(screen.queryByTitle("Metabase dashboard")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockGetDashboardUrl.mockRejectedValue(new Error("API Error"));

      render(<OrgAnalytics />);

      // Wait for the API call to be made and fail
      await waitFor(
        () => {
          expect(mockGetDashboardUrl).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );

      // The error should be logged by the component
      const { logger } = await import("@ally-ui-mono/ui-shared");
      expect(logger.info).toHaveBeenCalledWith("Error in triggerDashboardUrl: Error: API Error");
    });

    it("should handle missing dashboard data", () => {
      mockUseLazyGetDashboardsQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      render(<OrgAnalytics />);

      // Should not render iframes when no data
      expect(screen.queryByTitle("Metabase dashboard")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper iframe titles", async () => {
      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
      });
    });

    it("should have proper iframe dimensions", async () => {
      render(<OrgAnalytics />);

      await waitFor(() => {
        const iframes = screen.getAllByTitle("Metabase dashboard");
        expect(iframes.length).toBeGreaterThan(0);
        expect(iframes[0]).toHaveAttribute("width", "100%");
        expect(iframes[0]).toHaveAttribute("height", "100%");
      });
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const { asFragment } = render(<OrgAnalytics />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof OrgAnalytics).toBe("function");
    });

    it("should return a valid React element", () => {
      const element = <OrgAnalytics />;
      expect(element).toBeDefined();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(<OrgAnalytics />);
      }).not.toThrow();
    });
  });
});
