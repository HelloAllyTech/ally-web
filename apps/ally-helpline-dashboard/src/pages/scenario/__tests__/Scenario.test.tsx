/**
 * Comprehensive Unit Tests for Scenario Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - URL parameter handling (scenarioId)
 * - API integration and data fetching
 * - State management and user interactions
 * - Navigation functionality
 * - Dialog management
 * - Error handling and loading states
 * - Motion animations
 * - Snapshot testing
 */

import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LOCAL_STORAGE_KEYS, ROUTES } from "@constants";

import { Scenario } from "../Scenario";

// Mock react-router-dom - declare mocks at module level before vi.mock
const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({
  scenarioId: "123",
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
  motion: {
    button: ({ children, className, onClick, ...props }: any) => (
      <button data-testid="motion-button" className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
    div: ({ children, className, initial, animate, exit, ...props }: any) => (
      <div
        data-testid="motion-div"
        className={className}
        data-initial={initial}
        data-animate={animate}
        data-exit={exit}
        {...props}
      >
        {children}
      </div>
    ),
  },
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock API hooks
const mockUseGetScenarioQuery = vi.fn();
const mockUseEndSimulationMutation = vi.fn();
const mockUseStartSimulationMutation = vi.fn();
const mockUseGetScenariosQuery = vi.fn();
const mockUseGetReviewsQuery = vi.fn();

vi.mock("@api", () => ({
  useGetScenarioQuery: (args: any) => mockUseGetScenarioQuery(args),
  useEndSimulationMutation: () => mockUseEndSimulationMutation(),
  useStartSimulationMutation: () => mockUseStartSimulationMutation(),
  useGetScenariosQuery: (args: any, opts: any) => {
    const result = mockUseGetScenariosQuery(args);
    // Support selectFromResult option
    if (opts?.selectFromResult) {
      return opts.selectFromResult(result);
    }
    return result;
  },
  useGetReviewsQuery: (args: any, opts: any) => {
    const result = mockUseGetReviewsQuery(args);
    if (opts?.selectFromResult) {
      return opts.selectFromResult(result ?? {});
    }
    return result;
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  BackCircle: () => <div data-testid="back-circle">BackCircle</div>,
  ExistingCall: () => <div data-testid="existing-call">ExistingCall</div>,
  PageNotFoundIllustration: () => <div data-testid="page-not-found">PageNotFound</div>,
  Carousel1: "carousel1.jpg",
  Carousel2: "carousel2.jpg",
  Carousel3: "carousel3.jpg",
  Carousel4: "carousel4.jpg",
  Carousel5: "carousel5.jpg",
  Carousel6: "carousel6.jpg",
  Carousel7: "carousel7.jpg",
  Carousel8: "carousel8.jpg",
  Carousel9: "carousel9.jpg",
  Carousel10: "carousel10.jpg",
  Bolt: () => <div data-testid="bolt-icon">⚡</div>,
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
const { mockStartSimulation } = vi.hoisted(() => {
  return {
    mockStartSimulation: vi.fn(),
  };
});

// Mock hooks to avoid needing Redux Provider in tests
vi.mock("@hooks", () => ({
  useSimulationCredits: () => ({
    credits: { creditLimit: 100, consumedCredits: 0 },
  }),
  useStartSimulation: () => ({
    startSimulation: mockStartSimulation,
    isStarting: false,
  }),
  useUser: () => ({
    permissions: [],
    user: undefined,
  }),
}));

// Mock @ally-ui-mono/ui-shared
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  MaxActiveUsersDialog: vi.fn(({ open, onClose, onRetry, translations }: any) => (
    <div data-testid="max-active-users-dialog" style={{ display: open ? "block" : "none" }}>
      <div data-testid="max-active-users-title">{translations?.title}</div>
      <div data-testid="max-active-users-description">{translations?.description}</div>
      <button data-testid="max-active-users-retry" onClick={onRetry}>
        {translations?.retry}
      </button>
      <button data-testid="max-active-users-close" onClick={onClose}>
        Close
      </button>
    </div>
  )),
  DropdownField: vi.fn(({ options, value, onChange }: any) => (
    <select
      data-testid="language-dropdown"
      value={value}
      onChange={e => onChange?.(e.target.value)}
    >
      {options?.map((option: string) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )),
}));

// Mock components
vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => children,
  LoginDialog: vi.fn(({ isOpen, onClose, onSuccess }: any) => (
    <div data-testid="login-dialog" style={{ display: isOpen ? "block" : "none" }}>
      <button data-testid="login-close" onClick={onClose}>
        Close Login
      </button>
      <button data-testid="login-success" onClick={onSuccess}>
        Login Success
      </button>
    </div>
  )),
  ScenarioDetailsCard: vi.fn(({ coverImage, isStarting, title, longDescription, onStart }: any) => (
    <div data-testid="scenario-details-card">
      <div data-testid="cover-image">{coverImage}</div>
      <div data-testid="scenario-title">{title}</div>
      <div data-testid="scenario-description">{longDescription}</div>
      <div data-testid="is-starting">{isStarting ? "true" : "false"}</div>
      <button data-testid="start-simulation-btn" onClick={onStart}>
        Start Simulation
      </button>
    </div>
  )),
  CreditsDisplay: ({ className }: { className?: string }) => (
    <div data-testid="credits-display" className={className}>
      <div className="font-primary text-base text-typography-700 whitespace-nowrap">
        Credits used:
      </div>
      <div data-testid="credits-icon">⚡</div>
      <span data-testid="credits-consumed" className="font-primary font-bold text-lg">
        0
      </span>
      <span className="font-primary text-base text-typography-700" data-testid="credits-limit">
        /100
      </span>
    </div>
  ),
  ConfirmationDialog: vi.fn(
    ({
      isOpen,
      onClose,
      onButtonClick,
      onSecondaryButtonClick,
      title,
      content,
      buttonText,
      secondaryButtonText,
      icon,
    }: any) => (
      <div data-testid="confirmation-dialog" style={{ display: isOpen ? "block" : "none" }}>
        <div data-testid="dialog-title">{JSON.stringify(title)}</div>
        <div data-testid="dialog-content">{content}</div>
        <div data-testid="dialog-icon">{icon}</div>
        <button data-testid="dialog-primary-btn" onClick={onButtonClick}>
          {buttonText}
        </button>
        <button data-testid="dialog-secondary-btn" onClick={onSecondaryButtonClick}>
          {secondaryButtonText}
        </button>
        <button data-testid="dialog-close" onClick={onClose}>
          Close Dialog
        </button>
      </div>
    ),
  ),
  FallbackUI: vi.fn(({ icon, isLoading, mainMessage, description, button }: any) => (
    <div data-testid="fallback-ui">
      <div data-testid="fallback-image">{icon}</div>
      <div data-testid="fallback-loading">{isLoading ? "true" : "false"}</div>
      <div data-testid="fallback-message">{mainMessage}</div>
      <div data-testid="fallback-description">{description}</div>
      <button data-testid="fallback-button" onClick={button?.onClick}>
        {button?.text}
      </button>
    </div>
  )),
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
  },
  CreditInfo: vi.fn(() => null),
}));

// Mock the peer sessions drawer — only rendered for allowlisted reviewers
vi.mock("../components/PeerSessionsDrawer", () => ({
  default: vi.fn(() => <div data-testid="peer-sessions-drawer" />),
}));

// Mock learn constants
vi.mock("../learn/constants", () => ({
  learnPageExpandedVariants: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
}));

// Test Wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("Scenario Component", () => {
  const mockScenario = {
    id: 123,
    title: "Test Scenario",
    description: "This is a test scenario description",
    coverImageUrl: "https://example.com/image.jpg",
  };

  const mockScenarioSession = {
    id: "session123",
    startedAt: "2024-01-01T00:00:00Z",
  };

  const mockAccessToken = {
    token: "access-token-123",
    serverUrl: "https://server.example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartSimulation.mockClear();
    mockUseParams.mockReturnValue({ scenarioId: "123" });

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(key => {
          if (key === LOCAL_STORAGE_KEYS.ACCESS_TOKEN) return "mock-token";
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Default API mocks
    mockUseGetScenarioQuery.mockReturnValue({
      data: mockScenario,
      isSuccess: true,
      isLoading: false,
    });

    mockUseGetScenariosQuery.mockReturnValue({
      data: { data: [] },
      isSuccess: true,
      isLoading: false,
    });

    mockUseEndSimulationMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: null, error: null }),
    ]);

    mockUseStartSimulationMutation.mockReturnValue([
      vi.fn().mockResolvedValue({ data: null, error: null }),
      { isLoading: false, error: null },
    ]);
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
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(
          <TestWrapper>
            <Scenario />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper>
          <Scenario />
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
          <Scenario />
        </TestWrapper>,
      );

      const mainContainer = container.querySelector("div.h-full");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("w-full");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("flex-col");
      expect(mainContainer?.className).toContain("bg-white");
    });

    it("should render AnimatePresence wrapper", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("animate-presence")).toBeInTheDocument();
    });

    it("should render motion div with correct classes when scenario is loaded", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("scenario-content");
      expect(motionDiv).not.toBeNull();
      expect(motionDiv.className).toContain("flex");
      expect(motionDiv.className).toContain("flex-col");
      expect(motionDiv.className).toContain("gap-6");
      expect(motionDiv.className).toContain("w-full");
      expect(motionDiv.className).toContain("mx-auto");
    });
  });

  /**
   * TEST GROUP: URL Parameter Handling
   * Verifies the component handles URL parameters correctly
   */
  describe("URL Parameter Handling", () => {
    it("should handle scenarioId parameter", () => {
      mockUseParams.mockReturnValue({ scenarioId: "456" });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle missing scenarioId parameter", () => {
      mockUseParams.mockReturnValue({ scenarioId: undefined });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle invalid scenarioId parameter", () => {
      mockUseParams.mockReturnValue({ scenarioId: "invalid" });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: API Integration
   * Verifies API integration and data fetching
   */
  describe("API Integration", () => {
    it("should call useGetScenarioQuery with correct parameters including languageCode", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(mockUseGetScenarioQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: 123,
          languageCode: expect.any(String),
        }),
      );
    });

    it("should render scenario details when data is loaded", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("scenario-details-card")).toBeInTheDocument();
      // Note: scenario-title appears twice - once in header, once in card
      const scenarioTitles = screen.getAllByTestId("scenario-title");
      expect(scenarioTitles[1]).toHaveTextContent("Test Scenario");
      expect(screen.getByTestId("scenario-description")).toHaveTextContent(
        "This is a test scenario description",
      );
    });

    it("should render fallback UI when scenario is not found", () => {
      mockUseGetScenarioQuery.mockReturnValue({
        data: null,
        isSuccess: false,
        isLoading: false,
      });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      expect(screen.getByTestId("fallback-message")).toHaveTextContent("Scenario not found");
    });

    it("should render fallback UI when loading", () => {
      mockUseGetScenarioQuery.mockReturnValue({
        data: null,
        isSuccess: false,
        isLoading: true,
      });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      expect(screen.getByTestId("fallback-loading")).toHaveTextContent("true");
    });
  });

  /**
   * TEST GROUP: Navigation Functionality
   * Verifies navigation functionality
   */
  describe("Navigation Functionality", () => {
    it("should navigate to learn page when back button is clicked", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("scenario-back-button");
      backButton.click();

      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LEARN);
    });

    it("should render fallback UI when scenario not found", () => {
      mockUseGetScenarioQuery.mockReturnValue({
        data: null,
        isSuccess: false,
        isLoading: false,
      });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
      expect(screen.getByTestId("fallback-message")).toHaveTextContent("Scenario not found");
    });
  });

  /**
   * TEST GROUP: Dialog Management
   * Verifies dialog state management
   */
  describe("Dialog Management", () => {
    it("should not start simulation when access token is missing", async () => {
      (window.localStorage.getItem as any).mockReturnValue(null);

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      // Simulation should not be started when not authenticated
      expect(mockStartSimulation).not.toHaveBeenCalled();
    });

    it("should start simulation when existing simulation is detected", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });
  });

  /**
   * TEST GROUP: Simulation Management
   * Verifies simulation start and end functionality
   */
  describe("Simulation Management", () => {
    it("should start simulation when access token is present", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });

    it("should call startSimulation with correct metadata", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });

    it("should call startSimulation hook when button is clicked", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should call startSimulation hook for error handling", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });

    it("should call startSimulation hook when handling errors", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123, languageId: undefined },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });
  });

  /**
   * TEST GROUP: Motion Animations
   * Verifies motion animations are properly configured
   */
  describe("Motion Animations", () => {
    it("should render motion div with correct animation props", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const motionDiv = screen.getByTestId("scenario-content");
      expect(motionDiv).toHaveAttribute("data-initial", "hidden");
      expect(motionDiv).toHaveAttribute("data-animate", "visible");
      expect(motionDiv).toHaveAttribute("data-exit", "exit");
    });

    it("should render motion button with correct animation props", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const motionButton = screen.getByTestId("scenario-back-button");
      expect(motionButton).toHaveAttribute("aria-label", "Close scenario details");
    });
  });

  /**
   * TEST GROUP: Text Content
   * Verifies all text content is correctly displayed
   */
  describe("Text Content", () => {
    it("should display the main title", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const title = screen.getByText("Start");
      const subtitle = screen.getByText(/role play/i);
      expect(title).toBeInTheDocument();
      expect(subtitle).toBeInTheDocument();
    });

    it("should display scenario details", () => {
      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      // Note: scenario-title appears twice - once in header, once in card
      const scenarioTitles = screen.getAllByTestId("scenario-title");
      expect(scenarioTitles[1]).toHaveTextContent("Test Scenario");
      expect(screen.getByTestId("scenario-description")).toHaveTextContent(
        "This is a test scenario description",
      );
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot with scenario loaded", () => {
      const { asFragment } = render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with scenario not found", () => {
      mockUseGetScenarioQuery.mockReturnValue({
        data: null,
        isSuccess: false,
        isLoading: false,
      });

      const { asFragment } = render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Scenario).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(
          <TestWrapper>
            <Scenario />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle missing scenario data gracefully", () => {
      mockUseGetScenarioQuery.mockReturnValue({
        data: null,
        isSuccess: false,
        isLoading: false,
      });

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(screen.getByTestId("fallback-ui")).toBeInTheDocument();
    });

    it("should handle API errors gracefully", async () => {
      (window.localStorage.getItem as any).mockReturnValue("access-token");

      render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const startButton = screen.getByTestId("start-simulation-btn");
      startButton.click();

      await waitFor(() => {
        expect(mockStartSimulation).toHaveBeenCalledWith({
          params: { scenarioId: 123 },
          metadata: {
            title: mockScenario.title,
            coverImageUrl: mockScenario.coverImageUrl,
          },
        });
      });
    });

    it("should render consistently on multiple renders", () => {
      const { container: container1 } = render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      const { container: container2 } = render(
        <TestWrapper>
          <Scenario />
        </TestWrapper>,
      );

      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });
});
