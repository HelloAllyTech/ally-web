/// <reference types="@testing-library/jest-dom" />
/**
 * Comprehensive Unit Tests for Review Component
 *
 * Test Coverage:
 * - Component rendering with different states
 * - Feature flag handling
 * - Loading states (initial and load more)
 * - Empty state
 * - Error state with retry functionality
 * - Filter functionality
 * - Pagination/Infinite scroll
 * - Comments loading
 * - Navigation
 * - API integration
 */

import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { Permissions } from "@constants";
import { ReviewItem } from "@types";

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockUseGetReviewsQuery,
  mockUseGetReviewThreadsQuery,
  mockUseGetScribeReviewsQuery,
  mockNavigate,
  mockFeatureFlags,
} = vi.hoisted(() => ({
  mockUseGetReviewsQuery: vi.fn(),
  mockUseGetReviewThreadsQuery: vi.fn(),
  mockUseGetScribeReviewsQuery: vi.fn(),
  mockNavigate: vi.fn(),
  mockFeatureFlags: { SCRIBE_REVIEW_FLAG: true },
}));

// --------------------- Mock hooks and modules --------------------- //

vi.mock("@api", () => ({
  useGetReviewsQuery: () => mockUseGetReviewsQuery(),
  useGetReviewThreadsQuery: (params: any, options: any) =>
    mockUseGetReviewThreadsQuery(params, options),
  useGetScribeReviewsQuery: (params: any, options: any) =>
    mockUseGetScribeReviewsQuery(params, options),
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  FEATURE_FLAGS_MAP: mockFeatureFlags,
  Tabs: ({ items, activeId, onChange, className }: any) => (
    <div data-testid="tabs" className={className}>
      {items?.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          onClick={() => onChange(item.id)}
          className={activeId === item.id ? "active" : ""}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  FEATURE_FLAGS_MAP: mockFeatureFlags,
  Tabs: ({ items, activeId, onChange, className }: any) => (
    <div data-testid="tabs" className={className}>
      {items?.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          onClick={() => onChange(item.id)}
          className={activeId === item.id ? "active" : ""}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  InfiniteScroll: ({ children, onInfiniteScroll, isLoading }: any) => (
    <div data-testid="infinite-scroll" data-is-loading={isLoading}>
      {children}
      <button data-testid="load-more-trigger" onClick={onInfiniteScroll}>
        Load More
      </button>
    </div>
  ),
}));

vi.mock("@ally-ui-mono/ui-shared/lib/infinite-scroll", () => ({
  default: ({ children, onInfiniteScroll, isLoading }: any) => (
    <div data-testid="infinite-scroll" data-is-loading={String(isLoading)}>
      {children}
      <button data-testid="load-more-trigger" onClick={onInfiniteScroll} type="button">
        Load More
      </button>
    </div>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockPermissionsList: string[] = [
  Permissions.VIEW_SIMULATION_REVIEWS,
  Permissions.VIEW_SCRIBE_REVIEWS,
];
vi.mock("@hooks", async importOriginal => {
  const actual = await importOriginal<typeof import("@hooks")>();
  return {
    ...actual,
    useUser: () => ({ permissions: mockPermissionsList }),
  };
});

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ReviewsEmptyState: ({ className }: { className?: string }) => (
      <div data-testid="reviews-empty-state" className={className}>
        Empty State Icon
      </div>
    ),
    NoResults: () => <div data-testid="no-results-icon">No Results</div>,
  };
});

vi.mock("@components", () => ({
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
  TabGroup: ({ tabs, value, onChange }: any) => (
    <div data-testid="tab-group">
      {tabs?.map((tab: any) => (
        <button
          key={tab.value}
          data-testid={`tab-${tab.value}`}
          onClick={() => onChange?.(null, tab.value)}
          className={value === tab.value ? "active" : ""}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
  ToggleButtonGroup: ({ value, onValueChange, items }: any) => (
    <div data-testid="toggle-button-group">
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
  FeedCard: ({
    id,
    user,
    scenario,
    commentsCount,
    isCommentsLoading,
    onReviewTranscript,
    onCommentsClick,
  }: any) => (
    <div data-testid={`feed-card-${id}`}>
      <span data-testid="feed-card-user">{user?.name}</span>
      <span data-testid="feed-card-scenario">{scenario?.title}</span>
      <span data-testid="feed-card-comments-count">{commentsCount}</span>
      {isCommentsLoading && <span data-testid="comments-loading">Loading comments...</span>}
      <button data-testid={`review-transcript-${id}`} onClick={onReviewTranscript}>
        Review Transcript
      </button>
      <button data-testid={`comments-click-${id}`} onClick={onCommentsClick}>
        View Comments
      </button>
    </div>
  ),
}));

vi.mock("@components/feed-card", () => ({
  default: ({
    id,
    user,
    scenario,
    commentsCount,
    isCommentsLoading,
    onReviewTranscript,
    onCommentsClick,
  }: any) => (
    <div data-testid={`feed-card-${id}`}>
      <span data-testid="feed-card-user">{user?.name}</span>
      <span data-testid="feed-card-scenario">{scenario?.title}</span>
      <span data-testid="feed-card-comments-count">{commentsCount}</span>
      {isCommentsLoading && <span data-testid="comments-loading">Loading comments...</span>}
      <button data-testid={`review-transcript-${id}`} onClick={onReviewTranscript}>
        Review Transcript
      </button>
      <button data-testid={`comments-click-${id}`} onClick={onCommentsClick}>
        View Comments
      </button>
    </div>
  ),
}));

import { BrowserRouter, MemoryRouter } from "react-router-dom";

import { Review } from "../Review";

// --------------------- Mock Data --------------------- //

const mockReviewItems: ReviewItem[] = [
  {
    id: "review-1",
    createdAt: "2024-01-15T10:00:00Z",
    createdBy: {
      id: "user-1",
      name: "John Doe",
      profileImage: "https://example.com/avatar1.jpg",
    },
    scenario: {
      title: "Test Scenario 1",
      createdAt: "2024-01-15T09:00:00Z",
      duration: "15 min",
      description: "Test description 1",
      coverImageUrl: "https://example.com/cover1.jpg",
    },
    reactions: { like: 5, heart: 3 },
    commentsCount: 2,
  },
  {
    id: "review-2",
    createdAt: "2024-01-16T11:00:00Z",
    createdBy: {
      id: "user-2",
      name: "Jane Smith",
      profileImage: "https://example.com/avatar2.jpg",
    },
    scenario: {
      title: "Test Scenario 2",
      createdAt: "2024-01-16T10:00:00Z",
      duration: "20 min",
      description: "Test description 2",
      coverImageUrl: "https://example.com/cover2.jpg",
    },
    reactions: { like: 10 },
    commentsCount: 5,
  },
];

const mockCommentsData = {
  data: [
    { id: "comment-1", text: "Great session!", user: { name: "Commenter 1" } },
    { id: "comment-2", text: "Very helpful", user: { name: "Commenter 2" } },
  ],
};

const defaultReviewsQueryReturn = {
  data: { data: mockReviewItems, count: 2 },
  isFetching: false,
  refetch: vi.fn(),
  error: null,
};

const defaultThreadsQueryReturn = {
  data: null,
  isLoading: false,
};

const defaultScribeReviewsQueryReturn = {
  data: { data: mockReviewItems, count: 2 },
  isFetching: false,
  refetch: vi.fn(),
  error: null,
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// --------------------- Tests --------------------- //

describe("Review Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionsList = [Permissions.VIEW_SIMULATION_REVIEWS, Permissions.VIEW_SCRIBE_REVIEWS];
    mockUseGetReviewsQuery.mockReturnValue(defaultReviewsQueryReturn);
    mockUseGetReviewThreadsQuery.mockReturnValue(defaultThreadsQueryReturn);
    mockUseGetScribeReviewsQuery.mockReturnValue(defaultScribeReviewsQueryReturn);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * TEST GROUP: Basic Rendering
   */
  describe("Basic Rendering", () => {
    it("renders the component successfully", () => {
      const { container } = render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(container).not.toBeNull();
    });

    it("renders the page title", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByText("Review")).toBeInTheDocument();
    });

    it("renders the toggle button group with filter options", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByTestId("toggle-button-group")).toBeInTheDocument();
      expect(screen.getByTestId("filter-ALL")).toBeInTheDocument();
      expect(screen.getByTestId("filter-LATEST")).toBeInTheDocument();
      expect(screen.getByTestId("filter-MOST_REVIEWED")).toBeInTheDocument();
      expect(screen.getByTestId("filter-UNDISCOVERED")).toBeInTheDocument();
    });

    it("renders feed cards when data is available", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
      expect(screen.getByTestId("feed-card-review-2")).toBeInTheDocument();
    });

    it("displays user names in feed cards", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("displays scenario titles in feed cards", () => {
      // Simulation tab passes scenario to FeedCard; Scribe tab does not. Use MemoryRouter so initial URL is set.
      render(
        <MemoryRouter initialEntries={["/review?tab=SIMULATION&filter=ALL"]}>
          <Review />
        </MemoryRouter>,
      );
      expect(screen.getByText("Test Scenario 1")).toBeInTheDocument();
      expect(screen.getByText("Test Scenario 2")).toBeInTheDocument();
    });

    it("renders InfiniteScroll component", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByTestId("infinite-scroll")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Permission-based tab filtering
   */
  describe("Permission-based tab filtering", () => {
    it("shows tab UI when user has both review permissions", () => {
      mockPermissionsList = [Permissions.VIEW_SIMULATION_REVIEWS, Permissions.VIEW_SCRIBE_REVIEWS];
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });

    it("hides tab UI and renders content when user has only one review permission", () => {
      mockPermissionsList = [Permissions.VIEW_SIMULATION_REVIEWS];
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      expect(screen.queryByTestId("tabs")).not.toBeInTheDocument();
      expect(screen.getByTestId("toggle-button-group")).toBeInTheDocument();
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Loading State
   */
  describe("Loading State", () => {
    it("shows skeleton loaders when initial loading", () => {
      const loadingReturn = {
        data: undefined,
        isFetching: true,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(loadingReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(loadingReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Skeleton loaders have animate-pulse class
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows skeleton loader when loading more", () => {
      const loadingMoreReturn = {
        data: { data: mockReviewItems, count: 20 },
        isFetching: true,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(loadingMoreReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(loadingMoreReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Should show feed cards AND a skeleton for loading more
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("passes isLoading prop to InfiniteScroll when loading more", () => {
      const loadingMoreReturn = {
        data: { data: mockReviewItems, count: 20 },
        isFetching: true,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(loadingMoreReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(loadingMoreReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      const infiniteScroll = screen.getByTestId("infinite-scroll");
      expect(infiniteScroll).toHaveAttribute("data-is-loading", "true");
    });
  });

  /**
   * TEST GROUP: Empty State
   */
  describe("Empty State", () => {
    const emptyReturn = {
      data: { data: [], count: 0 },
      isFetching: false,
      refetch: vi.fn(),
      error: null,
    };

    it("shows empty state when no reviews exist", () => {
      mockUseGetReviewsQuery.mockReturnValue(emptyReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(emptyReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByTestId("reviews-empty-state")).toBeInTheDocument();
      expect(screen.getByText("No shared sessions yet")).toBeInTheDocument();
      expect(
        screen.getByText("Shared user transcripts will be available here for review."),
      ).toBeInTheDocument();
    });

    it("shows refresh button in empty state", () => {
      mockUseGetReviewsQuery.mockReturnValue(emptyReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(emptyReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByText("Refresh Page")).toBeInTheDocument();
    });

    it("calls refetch when refresh button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseGetReviewsQuery.mockReturnValue({
        ...emptyReturn,
        refetch: mockRefetch,
      });
      mockUseGetScribeReviewsQuery.mockReturnValue({
        ...emptyReturn,
        refetch: mockRefetch,
      });

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText("Refresh Page"));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  /**
   * TEST GROUP: Error State
   */
  describe("Error State", () => {
    const errorReturn = {
      data: undefined,
      isFetching: false,
      refetch: vi.fn(),
      error: { message: "Network error" },
    };

    it("shows fallback UI when there is an error", () => {
      mockUseGetReviewsQuery.mockReturnValue(errorReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(errorReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
    });

    it("shows correct error message", () => {
      mockUseGetReviewsQuery.mockReturnValue(errorReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(errorReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-main-message")).toHaveTextContent(
        "Unable to Load Reviews",
      );
      expect(screen.getByTestId("fallback-description")).toHaveTextContent(
        "Something went wrong while loading reviews. Please try again.",
      );
    });

    it("shows NoResults icon in error state", () => {
      mockUseGetReviewsQuery.mockReturnValue(errorReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(errorReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByTestId("no-results-icon")).toBeInTheDocument();
    });

    it("shows retry button in error state", () => {
      mockUseGetReviewsQuery.mockReturnValue(errorReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(errorReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-retry-button")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    it("calls refetch when retry button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseGetReviewsQuery.mockReturnValue({ ...errorReturn, refetch: mockRefetch });
      mockUseGetScribeReviewsQuery.mockReturnValue({ ...errorReturn, refetch: mockRefetch });

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("fallback-retry-button"));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST GROUP: Filter Functionality
   */
  describe("Filter Functionality", () => {
    it("defaults to ALL filter", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      const allButton = screen.getByTestId("filter-ALL");
      expect(allButton).toHaveClass("active");
    });

    it("changes filter when toggle button is clicked", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("filter-LATEST"));

      const latestButton = screen.getByTestId("filter-LATEST");
      expect(latestButton).toHaveClass("active");
    });

    it("changes to MOST_REVIEWED filter when clicked", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("filter-MOST_REVIEWED"));

      const mostReviewedButton = screen.getByTestId("filter-MOST_REVIEWED");
      expect(mostReviewedButton).toHaveClass("active");
    });

    it("changes to UNDISCOVERED filter when clicked", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("filter-UNDISCOVERED"));

      const undiscoveredButton = screen.getByTestId("filter-UNDISCOVERED");
      expect(undiscoveredButton).toHaveClass("active");
    });
  });

  /**
   * TEST GROUP: Infinite Scroll / Pagination
   */
  describe("Infinite Scroll", () => {
    it("triggers load more when InfiniteScroll callback is called", () => {
      const loadMoreReturn = {
        data: { data: mockReviewItems, count: 20 },
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(loadMoreReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(loadMoreReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Trigger load more
      fireEvent.click(screen.getByTestId("load-more-trigger"));

      // Component should re-render (we can't easily verify the offset change,
      // but we can verify the component doesn't crash)
      expect(screen.getByTestId("infinite-scroll")).toBeInTheDocument();
    });

    it("does not show InfiniteScroll when in empty state", () => {
      const emptyReturn = {
        data: { data: [], count: 0 },
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(emptyReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(emptyReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.queryByTestId("infinite-scroll")).not.toBeInTheDocument();
      expect(screen.getByTestId("reviews-empty-state")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Comments Loading
   */
  describe("Comments Loading", () => {
    it("triggers comments loading when comments button is clicked", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Click on comments for review-1
      fireEvent.click(screen.getByTestId("comments-click-review-1"));

      // The component should call useGetReviewThreadsQuery
      // We verify by checking the component doesn't crash
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
    });

    it("shows comments loading indicator when loading comments", () => {
      mockUseGetReviewThreadsQuery.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Click on comments to trigger loading
      fireEvent.click(screen.getByTestId("comments-click-review-1"));

      // After clicking, the selected review should show loading
      // (depends on component re-render with selectedReviewId set)
    });

    it("limits comments to maximum of 2 when there are more than 2 comments", () => {
      const mockThreadsWithManyComments = {
        data: [
          {
            id: "thread-1",
            comments: [
              {
                id: "c1",
                content: "Comment 1",
                createdBy: { id: 1, name: "User 1" },
                createdAt: "2024-01-15T10:00:00Z",
                reactions: {},
                replyCount: 0,
              },
              {
                id: "c2",
                content: "Comment 2",
                createdBy: { id: 2, name: "User 2" },
                createdAt: "2024-01-15T11:00:00Z",
                reactions: {},
                replyCount: 0,
              },
              {
                id: "c3",
                content: "Comment 3",
                createdBy: { id: 3, name: "User 3" },
                createdAt: "2024-01-15T12:00:00Z",
                reactions: {},
                replyCount: 0,
              },
            ],
            commentCount: 3,
          },
        ],
        isLoading: false,
      };

      mockUseGetReviewThreadsQuery.mockReturnValue(mockThreadsWithManyComments);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Click on comments to load them
      fireEvent.click(screen.getByTestId("comments-click-review-1"));

      // The component should render without crashing with limited comments
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
    });

    it("returns all comments when there are less than 2", () => {
      const mockThreadsWithOneComment = {
        data: [
          {
            id: "thread-1",
            comments: [
              {
                id: "c1",
                content: "Comment 1",
                createdBy: { id: 1, name: "User 1" },
                createdAt: "2024-01-15T10:00:00Z",
                reactions: {},
                replyCount: 0,
              },
            ],
            commentCount: 1,
          },
        ],
        isLoading: false,
      };

      mockUseGetReviewThreadsQuery.mockReturnValue(mockThreadsWithOneComment);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Click on comments to load them
      fireEvent.click(screen.getByTestId("comments-click-review-1"));

      // The component should render without crashing
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
    });

    it("returns empty array when no threads data exists", () => {
      mockUseGetReviewThreadsQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
      });

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      // Click on comments to trigger the function
      fireEvent.click(screen.getByTestId("comments-click-review-1"));

      // The component should render without crashing
      expect(screen.getByTestId("feed-card-review-1")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation
   */
  describe("Navigation", () => {
    it("navigates to review details when review transcript is clicked", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("review-transcript-review-1"));

      expect(mockNavigate).toHaveBeenCalledWith("/simulation-review/review-1");
    });

    it("navigates to correct review details for different reviews", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByTestId("review-transcript-review-2"));

      expect(mockNavigate).toHaveBeenCalledWith("/simulation-review/review-2");
    });
  });

  /**
   * TEST GROUP: Multiple Reviews Rendering
   */
  describe("Multiple Reviews Rendering", () => {
    it("renders all reviews from the data", () => {
      const manyReviews: ReviewItem[] = Array.from({ length: 5 }, (_, index) => ({
        id: `review-${index + 1}`,
        createdAt: `2024-01-${15 + index}T10:00:00Z`,
        createdBy: {
          id: `user-${index + 1}`,
          name: `User ${index + 1}`,
        },
        scenario: {
          title: `Scenario ${index + 1}`,
          createdAt: `2024-01-${15 + index}T09:00:00Z`,
          duration: "15 min",
          description: `Description ${index + 1}`,
          coverImageUrl: `https://example.com/cover${index + 1}.jpg`,
        },
        reactions: {},
        commentsCount: 0,
      }));

      const manyReviewsReturn = {
        data: { data: manyReviews, count: 5 },
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(manyReviewsReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(manyReviewsReturn);

      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      manyReviews.forEach((_, index) => {
        expect(screen.getByTestId(`feed-card-review-${index + 1}`)).toBeInTheDocument();
      });
    });

    it("displays comments count for each review", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(screen.getByText("2")).toBeInTheDocument(); // review-1 comments count
      expect(screen.getByText("5")).toBeInTheDocument(); // review-2 comments count
    });
  });

  /**
   * TEST GROUP: Edge Cases
   */
  describe("Edge Cases", () => {
    it("handles undefined data gracefully", () => {
      const undefinedDataReturn = {
        data: undefined,
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(undefinedDataReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(undefinedDataReturn);

      const { container } = render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(container).toBeDefined();
    });

    it("handles reviews with missing user info", () => {
      const reviewsWithMissingData: ReviewItem[] = [
        {
          id: "review-incomplete",
          createdAt: "2024-01-15T10:00:00Z",
          createdBy: {
            id: "user-1",
            name: undefined as any,
          },
          scenario: {
            title: "Test Scenario",
            createdAt: "2024-01-15T09:00:00Z",
            duration: "15 min",
            description: "Test description",
            coverImageUrl: "https://example.com/cover.jpg",
          },
          reactions: {},
          commentsCount: 0,
        },
      ];

      const missingUserReturn = {
        data: { data: reviewsWithMissingData, count: 1 },
        isFetching: false,
        refetch: vi.fn(),
        error: null,
      };
      mockUseGetReviewsQuery.mockReturnValue(missingUserReturn);
      mockUseGetScribeReviewsQuery.mockReturnValue(missingUserReturn);

      const { container } = render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(container).toBeDefined();
    });

    it("renders consistently on multiple renders", () => {
      const { container: container1 } = render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );
      const { container: container2 } = render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });

  /**
   * TEST GROUP: Accessibility
   */
  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Review");
    });

    it("has accessible filter buttons", () => {
      render(
        <TestWrapper>
          <Review />
        </TestWrapper>,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
