/**
 * Comprehensive Unit Tests for AchievementsViewAll Component
 *
 * Test Coverage:
 * - Component rendering with different states
 * - Feature flag handling
 * - Loading states and skeleton rendering
 * - Error handling and retry functionality
 * - Badge filtering (ALL vs UNLOCKED)
 * - Navigation functionality
 * - Badge categories and grouping
 * - Empty states
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockUseGetAvailableBadgesQuery,
  mockNavigate,
  mockFeatureFlags,
  mockUseGetMyBadgesQuery,
  mockUseUpdateBadgeViewStatusMutation,
  mockUseLazyGetUserQuery,
  mockUseLazyGetPermissionsQuery,
  mockUseGetProfileImageUrlMutation,
  mockUseDeleteProfileImageMutation,
  mockUseUploadProfileImageMutation,
  mockUseUser,
  mockLocation,
} = vi.hoisted(() => ({
  mockUseGetAvailableBadgesQuery: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseGetMyBadgesQuery: vi.fn(),
  mockUseUpdateBadgeViewStatusMutation: vi.fn(),
  mockUseLazyGetUserQuery: vi.fn(),
  mockUseLazyGetPermissionsQuery: vi.fn(),
  mockUseGetProfileImageUrlMutation: vi.fn(),
  mockUseDeleteProfileImageMutation: vi.fn(),
  mockUseUploadProfileImageMutation: vi.fn(),
  mockUseUser: vi.fn(),
  mockLocation: { state: null, pathname: "/achievements", search: "", hash: "" },
  mockFeatureFlags: {},
}));

// Mock API
vi.mock("@api", () => ({
  useGetAvailableBadgesQuery: (...args: any[]) => mockUseGetAvailableBadgesQuery(...args),
  useGetMyBadgesQuery: (...args: any[]) => mockUseGetMyBadgesQuery(...args),
  useUpdateBadgeViewStatusMutation: (...args: any[]) =>
    mockUseUpdateBadgeViewStatusMutation(...args),
  useLazyGetUserQuery: (...args: any[]) => mockUseLazyGetUserQuery(...args),
  useLazyGetPermissionsQuery: (...args: any[]) => mockUseLazyGetPermissionsQuery(...args),
  useGetProfileImageUrlMutation: (...args: any[]) => mockUseGetProfileImageUrlMutation(...args),
  useDeleteProfileImageMutation: (...args: any[]) => mockUseDeleteProfileImageMutation(...args),
  useUploadProfileImageMutation: (...args: any[]) => mockUseUploadProfileImageMutation(...args),
}));

// Mock feature flags
vi.mock("@ally-ui-mono/ui-shared/featureFlag", () => ({
  FEATURE_FLAGS_MAP: mockFeatureFlags,
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock hooks
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
  useAchievementBadgeModal: () => ({
    currentBadge: null,
    closeModal: vi.fn(),
    resetModal: vi.fn(),
    BadgeModal: null,
    isLoading: false,
  }),
}));

// Mock assets
vi.mock("@assets", () => ({
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  ArrowLeft: ({ className }: { className?: string }) => (
    <svg data-testid="arrow-left-icon" className={className} />
  ),
  NoResults: () => <div data-testid="no-results-icon">No Results</div>,
  Carousel1: () => <div data-testid="carousel-1">Carousel1</div>,
  Carousel2: () => <div data-testid="carousel-2">Carousel2</div>,
  Carousel3: () => <div data-testid="carousel-3">Carousel3</div>,
  Carousel4: () => <div data-testid="carousel-4">Carousel4</div>,
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
  Badge: () => <svg data-testid="badge-icon" />,
  Info: ({ className }: { className?: string }) => (
    <svg data-testid="info-icon" className={className} />
  ),
}));

// Mock components
vi.mock("@components", () => ({
  AchievementItem: ({ achievement, imageSize = 75 }: any) => (
    <div data-testid={`achievement-item-${achievement.id}`} data-image-size={String(imageSize)}>
      <span data-testid="achievement-title">{achievement.name || achievement.title}</span>
      <span data-testid="achievement-status">{achievement.lockStatus}</span>
    </div>
  ),
  FallbackUI: ({ icon, mainMessage, description, button }: any) => (
    <div data-testid="fallback-ui">
      {icon}
      <h2 data-testid="fallback-main-message">{mainMessage}</h2>
      <p data-testid="fallback-description">{description}</p>
      {button && (
        <button data-testid="fallback-retry-button" onClick={button.onClick}>
          {button.text}
        </button>
      )}
    </div>
  ),
  ToggleButtonGroup: ({ value, onValueChange, items, className }: any) => (
    <div data-testid="toggle-button-group" className={className}>
      {items.map((item: any) => (
        <button
          key={item.value}
          data-testid={`filter-${item.value}`}
          onClick={() => onValueChange(item.value)}
          className={value === item.value ? "active" : ""}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

// Mock types
vi.mock("@types", () => ({
  BadgeCategory: {
    SIMULATION_MINUTES: "SIMULATION_MINUTES",
    ACTIVE_DAY_STREAK: "ACTIVE_DAY_STREAK",
    COMMENTS_REACTIONS_GIVEN: "COMMENTS_REACTIONS_GIVEN",
    COMMENTS_REACTIONS_RECEIVED: "COMMENTS_REACTIONS_RECEIVED",
  },
  LockedStatus: {
    UNLOCKED: "UNLOCKED",
    LOCKED: "LOCKED",
  },
  SessionType: {
    CALL: "call",
    SIMULATION: "simulation",
  },
  ViewedStatus: {
    VIEWED: "VIEWED",
    UNVIEWED: "UNVIEWED",
  },
}));

import { BrowserRouter } from "react-router-dom";

import { baseAPI } from "../../../api/baseAPI";
import userSlice from "../../../reducer/userReducer";
import { AchievementsViewAll } from "../AchievementsViewAll";

// --------------------- Mock Data --------------------- //

const mockBadgesData = [
  {
    category: "SIMULATION_MINUTES",
    badges: [
      {
        id: "badge-1",
        title: "First Steps",
        description: "Complete 5 minutes of simulation",
        lockStatus: "UNLOCKED",
        imageUrl: "https://example.com/badge1.png",
      },
      {
        id: "badge-2",
        title: "Getting Started",
        description: "Complete 30 minutes of simulation",
        lockStatus: "LOCKED",
        imageUrl: "https://example.com/badge2.png",
      },
    ],
  },
  {
    category: "ACTIVE_DAY_STREAK",
    badges: [
      {
        id: "badge-3",
        title: "Consistent Learner",
        description: "7-day streak",
        lockStatus: "UNLOCKED",
        imageUrl: "https://example.com/badge3.png",
      },
    ],
  },
  {
    category: "COMMENTS_REACTIONS_GIVEN",
    badges: [
      {
        id: "badge-4",
        title: "Community Member",
        description: "Give 10 reactions",
        lockStatus: "LOCKED",
        imageUrl: "https://example.com/badge4.png",
      },
    ],
  },
];

const defaultQueryReturn = {
  data: mockBadgesData,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: userSlice.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  preloadedState: {
    user: {
      isAuthenticated: false,
      user: null,
      permissions: [],
      availableChatTypes: [],
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={testStore}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

// --------------------- Tests --------------------- //

describe("AchievementsViewAll Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.state = null;
    mockUseGetAvailableBadgesQuery.mockReturnValue(defaultQueryReturn);
    mockUseGetMyBadgesQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseUpdateBadgeViewStatusMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
    mockUseLazyGetUserQuery.mockReturnValue([vi.fn(), { isLoading: false }]);
    mockUseLazyGetPermissionsQuery.mockReturnValue([vi.fn(), { isLoading: false }]);
    mockUseGetProfileImageUrlMutation.mockReturnValue([vi.fn()]);
    mockUseDeleteProfileImageMutation.mockReturnValue([vi.fn()]);
    mockUseUploadProfileImageMutation.mockReturnValue([vi.fn()]);
    mockUseUser.mockReturnValue({
      user: { id: "1", name: "Test User" },
      permissions: [],
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    testStore.dispatch(baseAPI.util.resetApiState());
  });

  /**
   * TEST GROUP: Basic Rendering
   */
  describe("Basic Rendering", () => {
    it("renders the component successfully", () => {
      const { container } = render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(container).not.toBeNull();
    });

    it("renders the page title", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(screen.getByTestId("achievements-view-all-title")).toBeInTheDocument();
      expect(screen.getByText("Achievements")).toBeInTheDocument();
    });

    it("renders the Badges subtitle", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(screen.getByText("Badges")).toBeInTheDocument();
    });

    it("renders the back button", () => {
      mockLocation.state = { from: "community" };
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(screen.getByLabelText("Go back")).toBeInTheDocument();
      expect(screen.getByTestId("arrow-left-icon")).toBeInTheDocument();
    });

    it("renders the toggle button group", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(screen.getByTestId("toggle-button-group")).toBeInTheDocument();
      expect(screen.getByTestId("filter-ALL")).toBeInTheDocument();
      expect(screen.getByTestId("filter-UNLOCKED")).toBeInTheDocument();
    });

    it("renders the page container with correct test id", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      expect(screen.getByTestId("achievements-view-all-page")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Loading State
   */
  describe("Loading State", () => {
    it("shows skeleton loaders when loading", () => {
      // Need to provide category data so the component iterates and shows skeletons
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [
          {
            category: "SIMULATION_MINUTES",
            badges: [{ id: "badge-1", name: "Test Badge", lockStatus: "UNLOCKED" }],
          },
        ],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("does not show achievement items when loading", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [
          {
            category: "SIMULATION_MINUTES",
            badges: [{ id: "badge-1", name: "Test Badge", lockStatus: "UNLOCKED" }],
          },
        ],
        isLoading: true,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("achievement-item-badge-1")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Error State
   */
  describe("Error State", () => {
    it("shows fallback UI when there is an error", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
    });

    it("shows correct error message", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-main-message")).toHaveTextContent(
        "Unable to Load Achievements",
      );
      expect(screen.getByTestId("fallback-description")).toHaveTextContent(
        "Something went wrong while loading achievements. Please try again.",
      );
    });

    it("shows retry button in error state", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-retry-button")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: true,
        refetch: mockRefetch,
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("fallback-retry-button"));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST GROUP: Badges Display
   */
  describe("Badges Display", () => {
    it("renders all badges when filter is ALL", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByTestId("achievement-item-badge-1")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-2")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-3")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-4")).toBeInTheDocument();
    });

    it("renders badge category labels", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByText("App Journey")).toBeInTheDocument();
      expect(screen.getByText("Momentum")).toBeInTheDocument();
      expect(screen.getByText("Contribution")).toBeInTheDocument();
    });

    it("passes correct imageSize to AchievementItem", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const achievementItem = screen.getByTestId("achievement-item-badge-1");
      expect(achievementItem).toHaveAttribute("data-image-size", "75");
    });
  });

  /**
   * TEST GROUP: Filter Functionality
   */
  describe("Filter Functionality", () => {
    it("defaults to ALL filter", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const allButton = screen.getByTestId("filter-ALL");
      expect(allButton).toHaveClass("active");
    });

    it("shows only unlocked badges when UNLOCKED filter is selected", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Click UNLOCKED filter
      fireEvent.click(screen.getByTestId("filter-UNLOCKED"));

      // Should show unlocked badges
      expect(screen.getByTestId("achievement-item-badge-1")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-3")).toBeInTheDocument();

      // Should NOT show locked badges
      expect(screen.queryByTestId("achievement-item-badge-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("achievement-item-badge-4")).not.toBeInTheDocument();
    });

    it("hides category section when no badges match filter", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Click UNLOCKED filter
      fireEvent.click(screen.getByTestId("filter-UNLOCKED"));

      // Contribution category has no unlocked badges, so it should not be visible
      expect(screen.queryByText("Contribution")).not.toBeInTheDocument();
    });

    it("changes active state when filter is changed", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const unlockedButton = screen.getByTestId("filter-UNLOCKED");
      fireEvent.click(unlockedButton);

      expect(unlockedButton).toHaveClass("active");
    });

    it("shows all badges again when switching back to ALL filter", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Switch to UNLOCKED
      fireEvent.click(screen.getByTestId("filter-UNLOCKED"));

      // Switch back to ALL
      fireEvent.click(screen.getByTestId("filter-ALL"));

      // All badges should be visible again
      expect(screen.getByTestId("achievement-item-badge-1")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-2")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-3")).toBeInTheDocument();
      expect(screen.getByTestId("achievement-item-badge-4")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation
   */
  describe("Navigation", () => {
    it("navigates back when back button is clicked", () => {
      mockLocation.state = { from: "community" };
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const backButton = screen.getByLabelText("Go back");
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  /**
   * TEST GROUP: Empty State
   */
  describe("Empty State", () => {
    it("does not render category sections when no badges available", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.queryByText("App Journey")).not.toBeInTheDocument();
      expect(screen.queryByText("Momentum")).not.toBeInTheDocument();
    });

    it("renders header even when no badges", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(screen.getByText("Achievements")).toBeInTheDocument();
      expect(screen.getByText("Badges")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Badge Categories
   */
  describe("Badge Categories", () => {
    it("groups badges by category correctly", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Check that each category section exists
      const journeySection = screen.getByText("App Journey");
      const momentumSection = screen.getByText("Momentum");
      const contributionSection = screen.getByText("Contribution");

      expect(journeySection).toBeInTheDocument();
      expect(momentumSection).toBeInTheDocument();
      expect(contributionSection).toBeInTheDocument();
    });

    it("does not render empty category when all badges in category are filtered out", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [
          {
            category: "SIMULATION_MINUTES",
            badges: [
              {
                id: "badge-1",
                title: "Locked Badge",
                lockStatus: "LOCKED",
              },
            ],
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Select UNLOCKED filter
      fireEvent.click(screen.getByTestId("filter-UNLOCKED"));

      // Category should not be visible since all badges are locked
      expect(screen.queryByText("App Journey")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Grid Layout
   */
  describe("Grid Layout", () => {
    it("applies responsive grid classes to badge sections", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const grids = document.querySelectorAll(".grid");
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   */
  describe("Edge Cases", () => {
    it("handles undefined badges data gracefully", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      expect(() =>
        render(
          <TestWrapper>
            <AchievementsViewAll />
          </TestWrapper>,
        ),
      ).not.toThrow();
    });

    it("handles badges with missing properties", () => {
      mockUseGetAvailableBadgesQuery.mockReturnValue({
        data: [
          {
            category: "SIMULATION_MINUTES",
            badges: [
              {
                id: "badge-incomplete",
                title: undefined,
                lockStatus: undefined,
              },
            ],
          },
        ],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      expect(() =>
        render(
          <TestWrapper>
            <AchievementsViewAll />
          </TestWrapper>,
        ),
      ).not.toThrow();
    });

    it("renders consistently on multiple renders", () => {
      const { container: container1 } = render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );
      const { container: container2 } = render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      // Carbon's Tooltip generates a unique id per render (via useId) that shows
      // up in `id`/`aria-labelledby`; normalize those so we compare structure.
      const normalize = (html: string) => html.replace(/tooltip-:[^:"]+:/g, "tooltip-ID");
      expect(normalize(container1.innerHTML)).toBe(normalize(container2.innerHTML));
    });
  });

  /**
   * TEST GROUP: Accessibility
   */
  describe("Accessibility", () => {
    it("has accessible back button with aria-label", () => {
      mockLocation.state = { from: "community" };
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const backButton = screen.getByRole("button", { name: "Go back" });
      expect(backButton).toBeInTheDocument();
    });

    it("has proper heading structure", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Achievements");
    });
  });

  /**
   * TEST GROUP: Localization
   */
  describe("Localization", () => {
    it("passes current language code to badges query", () => {
      render(
        <TestWrapper>
          <AchievementsViewAll />
        </TestWrapper>,
      );

      expect(mockUseGetAvailableBadgesQuery).toHaveBeenCalledWith({
        languageCode: expect.any(String),
      });
    });
  });
});
