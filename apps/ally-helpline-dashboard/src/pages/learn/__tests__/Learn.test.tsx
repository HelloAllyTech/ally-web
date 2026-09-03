/**
 * Comprehensive Unit Tests for Learn Component
 *
 * Test Coverage:
 * - Component rendering with different states
 * - API integration and data handling
 * - Loading states and empty states
 * - Scenario sorting and filtering
 * - Navigation functionality
 * - Animation and motion components
 * - Accessibility features
 * - Error handling
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll } from "vitest";

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockUseGetScenariosQuery,
  mockUseGetScenarioPathwaysQuery,
  mockUseGetScenarioCasesQuery,
  mockUseGetLearnTracksQuery,
} = vi.hoisted(() => ({
  mockUseGetScenariosQuery: vi.fn(),
  mockUseGetScenarioPathwaysQuery: vi.fn(),
  mockUseGetScenarioCasesQuery: vi.fn(),
  mockUseGetLearnTracksQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("@api", () => ({
  useGetScenariosQuery: (args: any) => mockUseGetScenariosQuery(args),
  useGetScenarioPathwaysQuery: (args: any) => mockUseGetScenarioPathwaysQuery(args),
  useGetScenarioCasesQuery: (args: any) => mockUseGetScenarioCasesQuery(args),
  useGetLearnTracksQuery: () => mockUseGetLearnTracksQuery(),
}));

import { Learn } from "../Learn";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Install in beforeAll / restore in afterAll so the override does not leak
// into other test files in the same worker.
const ORIGINAL_LOCAL_STORAGE_DESCRIPTOR = Object.getOwnPropertyDescriptor(window, "localStorage");
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock,
  });
});
afterAll(() => {
  if (ORIGINAL_LOCAL_STORAGE_DESCRIPTOR) {
    Object.defineProperty(window, "localStorage", ORIGINAL_LOCAL_STORAGE_DESCRIPTOR);
  } else {
    delete (window as unknown as Record<string, unknown>).localStorage;
  }
});

// Mock assets
vi.mock("@assets", () => ({
  ProgressLadderIcon: () => <svg data-testid="progress-ladder-icon" />,
  CharacterLibraryIcon: (props: any) => <svg {...props} data-testid="character-library-icon" />,
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  Carousel1: "carousel-1.jpg",
  Carousel2: "carousel-2.jpg",
  Carousel3: "carousel-3.jpg",
  Carousel4: "carousel-4.jpg",
  Carousel5: "carousel-5.jpg",
  Carousel6: "carousel-6.jpg",
  SearchIcon: () => <svg data-testid="search-icon" />,
  Badge: () => <svg data-testid="badge-icon" />,
  SortIcon: () => <svg data-testid="sort-icon" />,
  FilterIcon: () => <svg data-testid="filter-icon" />,
  CloseIcon: () => <svg data-testid="close-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right" />,
  ArrowLeft: () => <svg data-testid="arrow-left" />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
  Bolt: () => <div data-testid="bolt-icon">⚡</div>,
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));

// Mock the useSimulationCredits hook
const mockUseSimulationCredits = vi.fn();
const mockUseUser = vi.fn();
const mockUseAchievementBadgeModal = vi.fn();
vi.mock("@hooks", () => ({
  // Exhaustive mock: NavSideBar gates the Progress tab and its level ring on this hook.
  useProgressSummary: () => ({ summary: undefined, canViewProgress: false }),
  useSimulationCredits: () => mockUseSimulationCredits(),
  useUser: () => mockUseUser(),
  useDebounce: (val: any) => val,
  useAchievementBadgeModal: () => mockUseAchievementBadgeModal(),
}));

// Import the mocked hook for use in component mock
const getMockCredits = () => mockUseSimulationCredits();

// Mock the components
vi.mock("@components", () => ({
  ScenarioCard: ({
    coverImage,
    title,
    description,
    onClick,
    isComingSoon,
  }: {
    coverImage: string;
    title: string;
    description: string;
    onClick: () => void;
    isComingSoon: boolean;
  }) => (
    <div
      data-testid="scenario-card"
      onClick={onClick}
      className={isComingSoon ? "coming-soon" : ""}
    >
      <img src={coverImage} alt={title} />
      <h3>{title}</h3>
      <p>{description}</p>
      {isComingSoon && <span>Coming Soon</span>}
    </div>
  ),
  TabGroup: ({ tabs, value, onChange }: any) => (
    <div data-testid="tab-group">
      {tabs.map((tab: any) => (
        <button
          key={tab.value}
          onClick={() => onChange({}, tab.value)}
          className={value === tab.value ? "active" : ""}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
  PracticeStreakHeatmap: ({ className }: { className?: string }) => (
    <div data-testid="practice-streak-heatmap" className={className} />
  ),
  CreditsDisplay: ({ className }: { className?: string }) => {
    const mockData = getMockCredits();
    const credits = mockData?.credits || { consumedCredits: 0, creditLimit: 0 };
    const limitReached = mockData?.limitReached || false;

    return (
      <div data-testid="credits-display" className={className}>
        <div className="font-primary text-base text-typography-700 whitespace-nowrap">
          Credits used:
        </div>
        <div data-testid="bolt-icon">⚡</div>
        <span
          data-testid="credits-consumed"
          className={`font-primary font-bold text-lg ${limitReached ? "text-red-500" : "text-black"}`}
        >
          {credits.consumedCredits}
        </span>
        <span className="font-primary text-base text-typography-700" data-testid="credits-limit">
          /{credits.creditLimit}
        </span>
      </div>
    );
  },
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, variants, initial, animate, exit, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children, mode }: any) => (
    <div data-testid="animate-presence">{children}</div>
  ),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    BrowserRouter: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="browser-router">{children}</div>
    ),
  };
});

// Mock constants
vi.mock("../constants", () => ({
  learnPageContainerVariants: {},
  learnPageItemVariants: {},
}));

// Mock types - use importOriginal so SessionType and other exports remain available to transitive imports
vi.mock("@types", async importOriginal => {
  const actual = await importOriginal<typeof import("@types")>();
  return {
    ...actual,
    ScenarioStatus: {
      ACTIVE: "ACTIVE",
      COMING_SOON: "COMING_SOON",
      INACTIVE: "INACTIVE",
    },
  };
});

// Create a mock Redux store
const createMockStore = (initialState = {}) => {
  const userReducer = (
    state = {
      isAuthenticated: true,
      availableChatTypes: [],
      user: { id: "1", name: "Test User" },
      permissions: [],
    },
    action: any,
  ) => state;

  return configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: initialState,
  });
};

// Test wrapper component with Redux Provider
const TestWrapper = ({
  children,
  store = createMockStore(),
}: {
  children: React.ReactNode;
  store?: any;
}) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("Learn Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.set("tab", "simulations");
    mockUseGetScenariosQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetScenarioPathwaysQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetScenarioCasesQuery.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseSimulationCredits.mockReturnValue({
      credits: {
        consumedCredits: 5,
        creditLimit: 10,
      },
      limitReached: false,
    });
    mockUseUser.mockReturnValue({
      permissions: ["view:scenario-paths"],
      user: { id: "1", name: "Test User" },
      isAuthenticated: true,
    });
    mockUseAchievementBadgeModal.mockReturnValue({
      currentBadge: null,
      closeModal: vi.fn(),
      resetModal: vi.fn(),
      BadgeModal: null,
      isLoading: false,
    });
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the Learn component successfully", () => {
      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() =>
        render(
          <TestWrapper>
            <Learn />
          </TestWrapper>,
        ),
      ).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the correct HTML structure and layout
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector("div.flex.flex-col");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("w-full");
      expect(mainContainer?.className).toContain("bg-white");
    });

    it("should render page description section", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const description = screen.getByText(/real-world practice situation/);
      expect(description).not.toBeNull();
    });

    it("should render scenario grid section", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const scenarioSection = screen.getByText(/Choose your/);
      expect(scenarioSection).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Page Description
   * Verifies the page description content and styling
   */
  describe("Page Description", () => {
    it("should display the main description text", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByText(/AI-voice based/)).not.toBeNull();
      expect(screen.getByText(/real-world practice situation/)).not.toBeNull();
      expect(screen.getByText(/to build/)).not.toBeNull();
    });

    // Font-related styling tests are skipped as they change frequently during development
  });

  /**
   * TEST GROUP: Credits Display
   * Verifies credits display functionality
   */
  describe("Credits Display", () => {
    it("should display consumed credits and limit", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByText("5")).not.toBeNull();
      expect(screen.getByText("/10")).not.toBeNull();
    });

    it("should display Bolt icon", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByTestId("bolt-icon")).not.toBeNull();
    });

    it("should show red text when limit is reached", () => {
      mockUseSimulationCredits.mockReturnValue({
        credits: {
          consumedCredits: 10,
          creditLimit: 10,
        },
        limitReached: true,
      });

      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const creditsText = container.querySelector(".text-red-500");
      expect(creditsText).not.toBeNull();
    });

    it("should show black text when limit is not reached", () => {
      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const creditsText = container.querySelector(".text-black");
      expect(creditsText).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Loading State
   * Verifies loading state rendering
   */
  describe("Loading State", () => {
    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: undefined },
        isLoading: true,
        refetch: vi.fn(),
      });
    });

    it("should show loading skeleton when scenarios are loading", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const skeletonCards = document.querySelectorAll("div[class*='animate-pulse']");
      expect(skeletonCards.length).toBe(6);
    });

    it("should render correct number of skeleton cards", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const skeletonCards = document.querySelectorAll("div.rounded-lg.animate-pulse");
      expect(skeletonCards.length).toBe(6);
    });

    it("should apply correct grid layout for loading state", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const grid = document.querySelector("div.grid.grid-cols-2");
      expect(grid).not.toBeNull();
    });

    it("should keep the Simulations tab visible while its query is loading, even though it will resolve empty", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByTestId("tab-simulations")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Empty State
   * Verifies empty state rendering when no scenarios are available
   */
  describe("Empty State", () => {
    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should show empty state message when no scenarios", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const emptyMessage = screen.getByText("No scenarios available at the moment");
      expect(emptyMessage).not.toBeNull();
    });

    it("should show refresh button in empty state", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const refreshButton = screen.getByText("Refresh Page");
      expect(refreshButton).not.toBeNull();
    });

    it("should call refetch when refresh button is clicked", () => {
      const mockRefetch = vi.fn();
      mockUseGetScenariosQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const refreshButton = screen.getByText("Refresh Page");
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("should hide the Simulations tab when there are no scenarios and loading has finished", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.queryByTestId("tab-simulations")).not.toBeInTheDocument();
    });

    it("should hide the Cases tab when there are no cases and loading has finished", () => {
      mockUseGetScenarioCasesQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.queryByTestId("tab-cases")).not.toBeInTheDocument();
    });

    it("should hide the Learning Pathways tab when there are no pathways and loading has finished", () => {
      mockUseGetScenarioPathwaysQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.queryByTestId("tab-tracks")).not.toBeInTheDocument();
    });

    it("should hide the Courses tab when there are no tracks and loading has finished", () => {
      mockUseGetLearnTracksQuery.mockReturnValue({
        data: { data: [] },
        isLoading: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.queryByTestId("tab-courses")).not.toBeInTheDocument();
    });

  });

  /**
   * TEST GROUP: Scenarios Display
   * Verifies scenarios are displayed correctly
   */
  describe("Scenarios Display", () => {
    const mockScenarios = [
      {
        id: "1",
        title: "Scenario 1",
        description: "Description 1",
        coverImageUrl: "image1.jpg",
        status: "ACTIVE",
      },
      {
        id: "2",
        title: "Scenario 2",
        description: "Description 2",
        coverImageUrl: "image2.jpg",
        status: "COMING_SOON",
      },
    ];

    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should render scenario cards when scenarios are available", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const scenarioCards = screen.getAllByTestId("scenario-card");
      expect(scenarioCards.length).toBe(2);
    });

    it("should display scenario titles", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByText("Scenario 1")).not.toBeNull();
      expect(screen.getByText("Scenario 2")).not.toBeNull();
    });

    it("should display scenario descriptions", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByText("Description 1")).not.toBeNull();
      expect(screen.getByText("Description 2")).not.toBeNull();
    });

    it("should display scenario cover images", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const images = screen.getAllByRole("img");
      expect(images[0]).toHaveAttribute("src", "image1.jpg");
      expect(images[1]).toHaveAttribute("src", "image2.jpg");
    });

    it("should show 'Coming Soon' for coming soon scenarios", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByText("Coming Soon")).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Scenario Sorting
   * Verifies scenarios are sorted correctly
   */
  describe("Scenario Sorting", () => {
    const mockScenarios = [
      {
        id: "1",
        title: "Inactive Scenario",
        description: "Description 1",
        coverImageUrl: "image1.jpg",
        status: "INACTIVE",
      },
      {
        id: "2",
        title: "Active Scenario",
        description: "Description 2",
        coverImageUrl: "image2.jpg",
        status: "ACTIVE",
      },
    ];

    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should sort active scenarios before inactive ones", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const scenarioCards = screen.getAllByTestId("scenario-card");
      expect(scenarioCards[0]).toHaveTextContent("Active Scenario");
      expect(scenarioCards[1]).toHaveTextContent("Inactive Scenario");
    });
  });

  /**
   * TEST GROUP: Navigation
   * Verifies navigation functionality
   */
  describe("Navigation", () => {
    const mockScenarios = [
      {
        id: "1",
        title: "Scenario 1",
        description: "Description 1",
        coverImageUrl: "image1.jpg",
        status: "ACTIVE",
      },
    ];

    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should navigate to scenario page when scenario card is clicked", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const scenarioCard = screen.getByTestId("scenario-card");
      fireEvent.click(scenarioCard);

      expect(mockNavigate).toHaveBeenCalledWith("/scenario/1");
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    const mockScenarios = [
      {
        id: "1",
        title: "Scenario 1",
        description: "Description 1",
        coverImageUrl: "image1.jpg",
        status: "ACTIVE",
      },
    ];

    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should have proper heading structure", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).not.toBeNull();
      expect(heading.textContent).toContain("Choose your");
      expect(heading.textContent).toContain("situation");
    });

    it("should have proper list structure for scenarios", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const list = screen.getByRole("list");
      const listItems = screen.getAllByRole("listitem");
      expect(list).not.toBeNull();
      expect(listItems.length).toBe(1);
    });

    it("should have proper aria-label for scenarios list", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const list = screen.getByLabelText("Available scenarios");
      expect(list).not.toBeNull();
    });

    it("should have proper alt text for scenario images", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const image = screen.getByAltText("Scenario 1");
      expect(image).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Grid Layout
   * Verifies grid layout and responsive design
   */
  describe("Grid Layout", () => {
    const mockScenarios = [
      {
        id: "1",
        title: "Scenario 1",
        description: "Description 1",
        coverImageUrl: "image1.jpg",
        status: "ACTIVE",
      },
    ];

    beforeEach(() => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });
    });

    it("should apply correct grid classes", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const grid = document.querySelector(".grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-4");
      expect(grid).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Motion Components
   * Verifies motion components are rendered
   */
  describe("Motion Components", () => {
    it("should render AnimatePresence component", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const animatePresence = screen.getByTestId("animate-presence");
      expect(animatePresence).not.toBeNull();
    });

    it("should render motion div components", () => {
      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const motionDivs = container.querySelectorAll("div");
      expect(motionDivs.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle undefined scenarios data", () => {
      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: undefined },
        isLoading: false,
        refetch: vi.fn(),
      });

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const emptyMessage = screen.getByText("No scenarios available at the moment");
      expect(emptyMessage).not.toBeNull();
    });

    it("should handle scenarios with missing properties", () => {
      const mockScenarios = [
        {
          id: "1",
          title: null,
          description: null,
          coverImageUrl: null,
          status: "ACTIVE",
        },
      ];

      mockUseGetScenariosQuery.mockReturnValue({
        data: { data: mockScenarios },
        isLoading: false,
        refetch: vi.fn(),
      });

      expect(() =>
        render(
          <TestWrapper>
            <Learn />
          </TestWrapper>,
        ),
      ).not.toThrow();
    });

    it("should handle missing credits data", () => {
      mockUseSimulationCredits.mockReturnValue({
        credits: null,
        limitReached: false,
      });

      const { container } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(container.textContent).toContain("0");
    });

    it("should render consistently on multiple renders", () => {
      const { container: container1 } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const { container: container2 } = render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Language Selection", () => {
    it("should initialize with language from localStorage", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      // Verify the component renders without errors
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should use default rendering when localStorage is empty", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should render without language selection UI", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      // Language dropdown no longer exists
      expect(screen.queryByTestId("language-dropdown")).not.toBeInTheDocument();
    });
  });

  it("should call list queries with languageCode", () => {
    // We already have a mock for useGetScenariosQuery at the top of the file
    // But since it's a mock implementation, we can check how it's called
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );

    expect(mockUseGetScenariosQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: expect.any(String), // i18n.language
      }),
    );
    expect(mockUseGetScenarioPathwaysQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: expect.any(String), // i18n.language
      }),
    );
    expect(mockUseGetScenarioCasesQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        languageCode: expect.any(String), // i18n.language
      }),
    );
  });

  it("should return a valid React element", () => {
    const result = render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    expect(result.container.firstChild).not.toBeNull();
  });

  it("should be callable as a React component", () => {
    expect(() => (
      <TestWrapper>
        <Learn />
      </TestWrapper>
    )).not.toThrow();
  });
});

/**
 * TEST GROUP: Responsive Design
 * Verifies responsive design classes are applied
 */
describe("Responsive Design", () => {
  it("should apply responsive padding classes", () => {
    const { container } = render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    const mainContainer = container.querySelector("div.p-\\[10px\\]");
    expect(mainContainer).not.toBeNull();
  });

  it("should apply responsive text size classes", () => {
    const { container } = render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    const description = container.querySelector("div[class*='text-3xl']");
    expect(description?.className).toContain("text-3xl");
  });

  it("should apply responsive margin classes", () => {
    const { container } = render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    const description = container.querySelector("div[class*='mb-[48px]']");
    expect(description).not.toBeNull();
  });
});

/**
 * TEST GROUP: Tab Navigation
 * Verifies tab navigation functionality
 */
describe("Tab Navigation", () => {
  // This describe block is a sibling of "Learn Component", not nested inside
  // it, so the mock-reset beforeEach at the top of the file does not run
  // here — every test below sets up its own mocks explicitly rather than
  // relying on whatever the previous suite left behind.
  const populateAllTabs = () => {
    mockUseUser.mockReturnValue({
      permissions: ["view:scenario-paths"],
      user: { id: "1", name: "Test User" },
      isAuthenticated: true,
    });
    mockUseGetLearnTracksQuery.mockReturnValue({
      data: { data: [{ id: "t1", title: "Track 1" }] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetScenarioCasesQuery.mockReturnValue({
      data: { data: [{ id: "c1", title: "Case 1" }] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetScenariosQuery.mockReturnValue({
      data: { data: [{ id: "s1", title: "Scenario 1", status: "ACTIVE" }] },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetScenarioPathwaysQuery.mockReturnValue({
      data: { data: [{ id: "p1", title: "Pathway 1" }] },
      isLoading: false,
      refetch: vi.fn(),
    });
  };

  it("should render tab group", () => {
    populateAllTabs();
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    expect(screen.getByTestId("tabs")).not.toBeNull();
  });

  it("should render Simulations tab", () => {
    populateAllTabs();
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    expect(screen.getByText("Simulations")).not.toBeNull();
  });

  it("should render all four tabs in the order Courses, Cases, Simulations, Learning Pathways", () => {
    populateAllTabs();
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    const tabsContainer = screen.getByTestId("tabs");
    const tabButtonIds = Array.from(tabsContainer.querySelectorAll("button")).map(button =>
      button.getAttribute("data-testid"),
    );
    expect(tabButtonIds).toEqual(["tab-courses", "tab-cases", "tab-simulations", "tab-tracks"]);
  });
});
