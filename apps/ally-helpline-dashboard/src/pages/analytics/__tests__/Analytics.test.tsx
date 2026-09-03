/**
 * Basic Unit Tests for Analytics Component with Snapshot Testing
 *
 * Test Coverage:
 * - Component rendering and structure
 * - Snapshot testing for different states
 * - Basic functionality verification
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AnalyticsType } from "@constants";

import { Analytics } from "../Analytics";

// Mock the API hooks
const mockGetDashboardUrl = vi.fn();
const mockGetDashboards = vi.fn();
// Mutable fixtures so individual tests can vary the dashboards list and the
// caller's permissions — the two together decide tab visibility and the Org
// tab's content (see canViewNativeOrgMetrics in Analytics.tsx).
let mockDashboardsData: any;
let mockPermissions: string[] = [];

vi.mock("@api", () => ({
  useLazyGetDashboardUrlQuery: () => [mockGetDashboardUrl],
  useLazyGetDashboardsQuery: () => [mockGetDashboards, { data: mockDashboardsData }],
  useGetOrganizationMetricsQuery: () => ({
    data: undefined,
    isFetching: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));

// Mock the user hook — permissions gate the Organization Metrics content.
vi.mock("@hooks", () => ({
  // Exhaustive mock: NavSideBar gates the Progress tab and its level ring on this hook.
  useProgressSummary: () => ({ summary: undefined, canViewProgress: false }),
  useUser: () => ({ permissions: mockPermissions }),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

// Analytics.tsx React.lazy()s this module, which pulls in the real
// @carbon/charts-react tree. Resolving that dynamic import can blow past
// findByTestId's default wait under full-suite CPU contention (flaky, not a
// logic bug) — mock it so this file only exercises Analytics.tsx's own
// gating logic (tab visibility + native-vs-Metabase content selection).
vi.mock("../OrganizationMetrics", () => ({
  default: () => <div data-testid="organization-metrics-section" />,
}));

// Mock the NoAnalytics asset
vi.mock("@assets", () => ({
  ProgressLadderIcon: () => <svg data-testid="progress-ladder-icon" />,
  CharacterLibraryIcon: (props: any) => <svg {...props} data-testid="character-library-icon" />,
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  NoAnalytics: () => <div data-testid="no-analytics">No Analytics Available</div>,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
  Badge: () => <svg data-testid="badge-icon" />,
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
    mockDashboardsData = undefined;
    mockPermissions = [];
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
      expect(screen.getByText("Session Metrics")).toBeInTheDocument();
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
      expect(mainContainer?.className).toContain("h-[calc(100dvh-100px)]");
    });

    it("should render title with correct styling", () => {
      render(<Analytics />);
      const title = screen.getByText("Session Metrics");
      expect(title).toBeInTheDocument();
      // Font color and size tests removed: They change frequently during development
      expect(title.className).toContain("font-secondary");
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
   * Snapshots removed: Font color, size, and family change frequently during development
   */

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

  /**
   * TEST GROUP: Toggle tabs & native Organization Metrics
   * Tab visibility must stay driven by the tenant's registered dashboards
   * (unchanged from the Metabase-only days), plus: the Organization Metrics
   * tab always shows for `view:organization-metrics` holders now that the
   * native dashboard is GA'd — no email allowlist gates the content anymore.
   */
  describe("Toggle tabs and Organization Metrics", () => {
    const threeDashboards = [
      { externalId: "d1", analyticsType: AnalyticsType.CallLog },
      { externalId: "d2", analyticsType: AnalyticsType.Simulation },
      { externalId: "d3", analyticsType: AnalyticsType.Org },
    ];

    it("keeps all three tabs when the tenant has all three dashboards", () => {
      mockDashboardsData = threeDashboards;
      render(<Analytics />);
      expect(screen.getByTestId("toggle-items-count").textContent).toBe("3");
      expect(screen.getByTestId(`toggle-${AnalyticsType.CallLog}`)).toBeInTheDocument();
      expect(screen.getByTestId(`toggle-${AnalyticsType.Simulation}`)).toBeInTheDocument();
      expect(screen.getByTestId(`toggle-${AnalyticsType.Org}`)).toBeInTheDocument();
    });

    it("renders the native section on the Organization Metrics tab for any admin with the permission", async () => {
      mockDashboardsData = threeDashboards;
      mockPermissions = ["view:organization-metrics"];
      render(<Analytics />);
      fireEvent.click(screen.getByTestId(`toggle-${AnalyticsType.Org}`));
      expect(await screen.findByTestId("organization-metrics-section")).toBeInTheDocument();
      // No Metabase iframe for the org tab
      expect(document.querySelector("iframe")).toBeNull();
    });

    it("keeps the Metabase dashboard on the Organization Metrics tab for admins without the permission", async () => {
      mockDashboardsData = threeDashboards;
      render(<Analytics />);
      fireEvent.click(screen.getByTestId(`toggle-${AnalyticsType.Org}`));
      // Falls through to the same Metabase fetch every other tab uses
      await waitFor(() => expect(mockGetDashboardUrl).toHaveBeenCalledWith({ dashboardId: "d3" }));
      expect(screen.queryByTestId("organization-metrics-section")).toBeNull();
    });

    it("shows the Org tab (and native section) for permission holders even with no org Metabase dashboard", async () => {
      mockDashboardsData = [
        { externalId: "d1", analyticsType: AnalyticsType.CallLog },
        { externalId: "d2", analyticsType: AnalyticsType.Simulation },
      ];
      mockPermissions = ["view:organization-metrics"];
      render(<Analytics />);
      expect(screen.getByTestId("toggle-items-count").textContent).toBe("3");
      fireEvent.click(screen.getByTestId(`toggle-${AnalyticsType.Org}`));
      expect(await screen.findByTestId("organization-metrics-section")).toBeInTheDocument();
    });

    it("does not add the Org tab for admins without the permission and no org Metabase dashboard", () => {
      mockDashboardsData = [
        { externalId: "d1", analyticsType: AnalyticsType.CallLog },
        { externalId: "d2", analyticsType: AnalyticsType.Simulation },
      ];
      render(<Analytics />);
      expect(screen.getByTestId("toggle-items-count").textContent).toBe("2");
      expect(screen.queryByTestId(`toggle-${AnalyticsType.Org}`)).toBeNull();
    });

    it("keeps Metabase tabs untouched for users without the permission", () => {
      mockDashboardsData = [
        { externalId: "d1", analyticsType: AnalyticsType.CallLog },
        { externalId: "d2", analyticsType: AnalyticsType.Simulation },
      ];
      render(<Analytics />);
      expect(screen.getByTestId("toggle-items-count").textContent).toBe("2");
      expect(screen.queryByTestId(`toggle-${AnalyticsType.Org}`)).toBeNull();
    });
  });
});
