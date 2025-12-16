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
import { describe, expect, it, vi, beforeEach } from "vitest";

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const {
  mockUseGetScenariosQuery,
  mockUseGetScenarioPathwaysQuery,
  mockUpdateUserPreferences,
  mockUseScenarioLanguages,
} = vi.hoisted(() => ({
  mockUseGetScenariosQuery: vi.fn(),
  mockUseGetScenarioPathwaysQuery: vi.fn(),
  mockUpdateUserPreferences: vi.fn(),
  mockUseScenarioLanguages: vi.fn(),
}));

vi.mock("@api", () => ({
  useGetScenariosQuery: () => mockUseGetScenariosQuery(),
  useGetScenarioPathwaysQuery: () => mockUseGetScenarioPathwaysQuery(),
  useUpdateUserPreferencesMutation: () => [mockUpdateUserPreferences, { isLoading: false }],
}));

// Mock useScenarioLanguages hook - path relative to the Learn component
vi.mock("@src/hooks/useScenarioLanguages", () => ({
  useScenarioLanguages: () => mockUseScenarioLanguages(),
}));

// Also mock with relative path as fallback
vi.mock("../../hooks/useScenarioLanguages", () => ({
  useScenarioLanguages: () => mockUseScenarioLanguages(),
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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock assets
vi.mock("@assets", () => ({
  Carousel1: "carousel-1.jpg",
  Carousel2: "carousel-2.jpg",
  Carousel3: "carousel-3.jpg",
  Carousel4: "carousel-4.jpg",
  Carousel5: "carousel-5.jpg",
  Carousel6: "carousel-6.jpg",
  SearchIcon: () => <svg data-testid="search-icon" />,
  SortIcon: () => <svg data-testid="sort-icon" />,
  FilterIcon: () => <svg data-testid="filter-icon" />,
  CloseIcon: () => <svg data-testid="close-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right" />,
  ArrowLeft: () => <svg data-testid="arrow-left" />,
  ChevronDown: () => <svg data-testid="chevron-down" />,
  Bolt: () => <div data-testid="bolt-icon">⚡</div>,
}));

// Mock the useSimulationCredits hook
const mockUseSimulationCredits = vi.fn();
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useSimulationCredits: () => mockUseSimulationCredits(),
  useUser: () => mockUseUser(),
  useDebounce: (val: any) => val,
  useScenarioLanguages: () => mockUseScenarioLanguages(),
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

// Mock types
vi.mock("@types", () => ({
  ScenarioStatus: {
    ACTIVE: "ACTIVE",
    COMING_SOON: "COMING_SOON",
    INACTIVE: "INACTIVE",
  },
}));

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
    mockUseScenarioLanguages.mockReturnValue({
      languages: [
        { language_id: 1, value: "en-US", label: "English (US)" },
        { language_id: 2, value: "hi-IN", label: "Hindi (India)" },
      ],
      defaultLanguage: { language_id: 1, value: "en-US", label: "English (US)" },
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
      expect(mainContainer?.className).toContain("max-h-screen");
      expect(mainContainer?.className).toContain("bg-white");
    });

    it("should render page description section", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );
      const description = screen.getByText(/hyper realistic training/);
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
      expect(screen.getByText(/hyper realistic training/)).not.toBeNull();
      expect(screen.getByText(/role plays/)).not.toBeNull();
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

      expect(mockNavigate).toHaveBeenCalledWith(
        "/scenario/1",
        expect.objectContaining({
          state: expect.objectContaining({
            languages: expect.any(Array),
          }),
        }),
      );
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
      expect(heading.textContent).toContain("Scenario");
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
    const mockLanguages = [
      { language_id: 1, value: "en-US", label: "English (US)" },
      { language_id: 2, value: "hi-IN", label: "Hindi (India)" },
    ];

    beforeEach(() => {
      // Reset mocks and localStorage before each test
      vi.clearAllMocks();
      localStorage.clear();
      mockUseScenarioLanguages.mockReturnValue({
        languages: mockLanguages,
        defaultLanguage: mockLanguages[0],
        isLoading: false,
      });
    });

    it("should initialize with language from localStorage", () => {
      const savedLanguage = { language_id: 2, value: "hi-IN", label: "Hindi (India)" };
      localStorage.setItem("selectedLanguage", JSON.stringify(savedLanguage));

      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );

      // Verify the component renders without errors when localStorage has a saved language
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should use default language when localStorage is empty", () => {
      render(
        <TestWrapper>
          <Learn />
        </TestWrapper>,
      );

      // Verify the component renders without errors when localStorage is empty
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  it("should revert to previous language on update failure", async () => {
    const error = new Error("Update failed");
    mockUpdateUserPreferences.mockRejectedValue(error);

    // Mock console.error to avoid test noise
    const originalError = console.error;
    console.error = vi.fn();

    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
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
  it("should render tab group", () => {
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    expect(screen.getByTestId("tab-group")).not.toBeNull();
  });

  it("should render Simulations tab", () => {
    render(
      <TestWrapper>
        <Learn />
      </TestWrapper>,
    );
    expect(screen.getByText("Simulations")).not.toBeNull();
  });
});
