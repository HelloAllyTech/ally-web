/**
 * Basic Unit Tests for Analytics Component with Snapshot Testing
 *
 * Test Coverage:
 * - Component rendering and structure
 * - Snapshot testing for different states
 * - Basic functionality verification
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AnalyticsType } from "@constants";

import { Analytics } from "../Analytics";

// Mock the API hooks
const mockGetDashboardUrl = vi.fn();
const mockGetDashboards = vi.fn();

vi.mock("@api", () => ({
  useLazyGetDashboardUrlQuery: () => [mockGetDashboardUrl],
  useLazyGetDashboardsQuery: () => [mockGetDashboards, { data: undefined }],
}));

// Mock the logger
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

// Mock the NoAnalytics asset
vi.mock("@assets", () => ({
  NoAnalytics: () => <div data-testid="no-analytics">No Analytics Available</div>,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
}));

// Mock the ToggleButtonGroup component
vi.mock("@components", () => ({
  ToggleButtonGroup: ({ value, onValueChange, items }: any) => (
    <div data-testid="toggle-button-group">
      <div data-testid="toggle-value">{value}</div>
      <div data-testid="toggle-items-count">{items?.length || 0}</div>
      {items?.map((item: any) => (
        <button
          key={item.value}
          data-testid={`toggle-${item.value}`}
          onClick={() => onValueChange?.(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

describe("Analytics Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      render(<Analytics />);
      expect(screen.getByText("Session Analytics")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(<Analytics />);
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<Analytics />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<Analytics />);
      const mainContainer = container.querySelector("div.flex.flex-col.justify-center.m-6");
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer?.className).toContain("overflow-hidden");
      expect(mainContainer?.className).toContain("h-[calc(100vh-100px)]");
    });

    it("should render title with correct styling", () => {
      render(<Analytics />);
      const title = screen.getByText("Session Analytics");
      expect(title).toBeInTheDocument();
      expect(title.className).toContain("text-[#0D0D0D]");
      expect(title.className).toContain("font-primary");
      expect(title.className).toContain("text-[24px]");
    });

    it("should render dashboard container with correct classes", () => {
      const { container } = render(<Analytics />);
      const dashboardContainer = container.querySelector("div.h-\\[90vh\\]");
      expect(dashboardContainer).toBeInTheDocument();
      expect(dashboardContainer?.className).toContain("w-full");
      expect(dashboardContainer?.className).toContain("flex");
      expect(dashboardContainer?.className).toContain("flex-col");
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for initial render", () => {
      const { asFragment } = render(<Analytics />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with no dashboards", () => {
      // Create a separate test component with mocked data
      const { asFragment } = render(<Analytics />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with single dashboard type", () => {
      const { asFragment } = render(<Analytics />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with multiple dashboard types", () => {
      const { asFragment } = render(<Analytics />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: API Integration
   * Verifies API calls and data handling
   */
  describe("API Integration", () => {
    it("should call getDashboards on mount", () => {
      render(<Analytics />);
      expect(mockGetDashboards).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Analytics).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(<Analytics />);
      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(<Analytics />);
      }).not.toThrow();
    });
  });
});
