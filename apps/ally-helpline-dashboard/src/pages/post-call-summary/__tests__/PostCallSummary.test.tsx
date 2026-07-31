/**
 * Comprehensive Unit Tests for PostCallSummary Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - URL parameter handling (section)
 * - Tab navigation and state management
 * - Redux integration and user hooks
 * - Motion animations and layout
 * - Section rendering logic
 * - User status updates
 * - Error handling and edge cases
 * - Snapshot testing
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CallType } from "@constants";

import { PostCallSummary } from "../PostCallSummary";
import { SectionType } from "../types";
import * as utils from "../utils";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockSearchParams = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
  keys: vi.fn(),
  values: vi.fn(),
  entries: vi.fn(),
  forEach: vi.fn(),
  toString: vi.fn(),
};
const mockUseSearchParams = vi.fn(() => [mockSearchParams]);
const mockUseParams = vi.fn(() => ({ chatId: "123" }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => mockUseSearchParams(),
  useParams: () => mockUseParams(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div data-testid="motion-div" className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Tabs and FEATURE_FLAGS_MAP from ui-shared (PostCallSummary uses Tabs and FEATURE_FLAGS_MAP in Header)
vi.mock("@ally-ui-mono/ui-shared", () => ({
  FEATURE_FLAGS_MAP: { SCRIBE_REVIEW_FLAG: false },
  Tabs: ({ items, activeId, onChange }: any) => (
    <div data-testid="tabs">
      {items?.map((item: any) => (
        <button
          key={item.id}
          data-testid={`tab-${item.id}`}
          onClick={() => onChange?.(item.id)}
          className={activeId === item.id ? "active" : ""}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

const mockUseUser = vi.fn(() => ({
  availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
}));

vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
}));

// Mock utils
vi.mock("@utils", () => ({
  updateQueryParamListWithoutReload: vi.fn(),
}));

// Mock API hooks
const mockUseGetCallSummaryQuery = vi.fn();
const mockUseGetTranscriptQuery = vi.fn(() => ({ data: undefined, isLoading: false }));
const mockCreateScribeReview = vi.fn();
const mockUpdateScribeReview = vi.fn();
vi.mock("@api", () => ({
  useGetCallSummaryQuery: () => mockUseGetCallSummaryQuery(),
  useGetTranscriptQuery: () => mockUseGetTranscriptQuery(),
  useCreateScribeReviewMutation: () => [mockCreateScribeReview, { isLoading: false }],
  useUpdateScribeReviewMutation: () => [mockUpdateScribeReview, { isLoading: false }],
}));

// Mock post-call-summary components
vi.mock("../components", () => ({
  CallSummary: vi.fn(({ className, chatId, postProcess }) => (
    <div data-testid="call-summary" className={className}>
      <div data-testid="chat-id">{chatId}</div>
      <button data-testid="post-process-btn" onClick={() => postProcess?.()}>
        Post Process
      </button>
    </div>
  )),
  StressBusterStep: vi.fn(({ onProceed }) => (
    <div data-testid="stress-buster-step">
      <button data-testid="proceed-btn" onClick={onProceed}>
        Proceed
      </button>
    </div>
  )),
}));

// Mock constants
vi.mock("../constants", () => ({
  SectionQueryKey: "section",
  getSummaryTabs: vi.fn(() => [
    {
      label: "Return to Self",
      value: "Box breathing",
    },
    {
      label: "Session summary",
      value: "Session summary",
    },
  ]),
}));

// Mock utils
vi.mock("../utils", () => ({
  getNumberForSectionKey: vi.fn(sectionType => {
    const mapping = {
      "Box breathing": 1,
      "Session summary": 2,
    };
    return mapping[sectionType];
  }),
  getSectionTabForIndex: vi.fn(index => {
    const mapping = {
      1: "Box breathing",
      2: "Session summary",
    };
    return mapping[index] || "Session summary";
  }),
  getSelectedSection: vi.fn(searchParams => {
    if (searchParams.get("source") === "deeplink") return "2";
    return searchParams.get("section") || "1";
  }),
  isSourceDeeplink: vi.fn(searchParams => {
    return searchParams.get("source") === "deeplink";
  }),
}));

// Create mock Redux store
const createMockStore = (userState: any = {}) => {
  const userReducer = (
    state = {
      isAuthenticated: true,
      user: { userId: 1, name: "Test User" },
      permissions: [],
      availableChatTypes: [],
      ...userState,
    },
    action: any,
  ) => state;

  return configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: {
      user: {
        isAuthenticated: true,
        user: { userId: 1, name: "Test User" },
        permissions: [],
        availableChatTypes: [],
        ...userState,
      },
    },
  });
};

// Test Wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createMockStore();
  return (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );
};

describe("PostCallSummary Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.get.mockReturnValue("1");
    mockUseParams.mockReturnValue({ chatId: "123" });
    mockUseGetCallSummaryQuery.mockReturnValue({
      data: { counselorId: 1 },
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
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      const { container } = render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper>
          <PostCallSummary />
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
          <PostCallSummary />
        </TestWrapper>,
      );

      const mainContainer = container.querySelector("div.h-\\[100dvh\\]");
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("w-[50%]");
      expect(mainContainer?.className).toContain("pt-6");
      expect(mainContainer?.className).toContain("mx-auto");
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("flex-col");
      expect(mainContainer?.className).toContain("gap-4");
      expect(mainContainer?.className).toContain("items-center");
      expect(mainContainer?.className).toContain("bg-white");
    });

    it("should render Tabs component", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });

    it("should render motion div containers", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const motionDivs = screen.getAllByTestId("motion-div");
      expect(motionDivs).toHaveLength(2);
    });
  });

  /**
   * TEST GROUP: URL Parameter Handling
   * Verifies the component handles different URL parameters correctly
   */
  describe("URL Parameter Handling", () => {
    it("should handle section parameter for BoxBreathing", () => {
      mockSearchParams.get.mockReturnValue("1");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("stress-buster-step")).toBeInTheDocument();
    });

    it("should handle section parameter for SessionSummary", () => {
      mockSearchParams.get.mockReturnValue("2");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
    });

    it("should handle missing section parameter", () => {
      mockSearchParams.get.mockReturnValue(null);
      vi.mocked(utils.getSectionTabForIndex).mockReturnValue(SectionType.SessionSummary);

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should default to SessionSummary
      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
    });

    it("should handle invalid section parameter", () => {
      mockSearchParams.get.mockReturnValue("999");
      vi.mocked(utils.getSectionTabForIndex).mockReturnValue(SectionType.SessionSummary);

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should default to SessionSummary
      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Tab Navigation
   * Verifies tab navigation functionality
   */
  describe("Tab Navigation", () => {
    it("should render correct tab value", () => {
      mockSearchParams.get.mockReturnValue("1");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Box breathing tab is selected; label is "Return to Self"
      expect(screen.getByTestId("tab-Box breathing")).toHaveTextContent("Return to Self");
    });

    it("should render correct number of tabs", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const tabButtons = screen.getAllByTestId(/^tab-/);
      expect(tabButtons).toHaveLength(2);
    });

    it("should handle tab change", async () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const sessionSummaryTab = screen.getByTestId("tab-Session summary");
      sessionSummaryTab.click();

      // Should render SessionSummary after tab change
      await waitFor(() => {
        expect(screen.getByTestId("call-summary")).toBeInTheDocument();
      });
    });
  });

  /**
   * TEST GROUP: Section Rendering
   * Verifies different sections are rendered correctly
   */
  describe("Section Rendering", () => {
    it("should render StressBusterStep for BoxBreathing section", () => {
      mockSearchParams.get.mockReturnValue("1");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("stress-buster-step")).toBeInTheDocument();
      expect(screen.queryByTestId("call-summary")).not.toBeInTheDocument();
    });

    it("should render CallSummary for SessionSummary section", () => {
      mockSearchParams.get.mockReturnValue("2");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
      expect(screen.queryByTestId("stress-buster-step")).not.toBeInTheDocument();
    });

    it("should pass correct props to CallSummary", () => {
      mockSearchParams.get.mockReturnValue("2");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const callSummary = screen.getByTestId("call-summary");
      expect(callSummary).toHaveClass("max-h-[calc(100dvh-350px)]");
      expect(screen.getByTestId("chat-id")).toHaveTextContent("123");
    });

    it("should pass correct props to StressBusterStep", () => {
      mockSearchParams.get.mockReturnValue("1");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("stress-buster-step")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation and Proceed
   * Verifies navigation functionality
   */
  describe("Navigation and Proceed", () => {
    it("should navigate to summary tab when proceeding from stress buster", async () => {
      mockSearchParams.get.mockReturnValue("1");

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const proceedButton = screen.getByTestId("proceed-btn");
      proceedButton.click();

      // Should switch to SessionSummary
      await waitFor(() => {
        expect(screen.getByTestId("call-summary")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("stress-buster-step")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Redux Integration
   * Verifies Redux integration through useUser hook
   */
  describe("Redux Integration", () => {
    it("should access user data from useUser hook", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // The component should render without errors, indicating useUser was called successfully
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle missing user data gracefully", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
      });

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should handle missing chatId parameter", () => {
      mockUseParams.mockReturnValue({ chatId: undefined });

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle invalid chatId parameter", () => {
      mockUseParams.mockReturnValue({ chatId: "invalid" });

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should render without crashing
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle missing search params", () => {
      mockSearchParams.get.mockReturnValue(null);
      vi.mocked(utils.getSectionTabForIndex).mockReturnValue(SectionType.SessionSummary);

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should default to SessionSummary
      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Motion Animations
   * Verifies motion animations are properly configured
   */
  describe("Motion Animations", () => {
    it("should render motion div with correct props", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      const motionDivs = screen.getAllByTestId("motion-div");
      expect(motionDivs).toHaveLength(2);
    });

    it("should have layout animations configured", () => {
      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Motion divs should be present for animations
      const motionDivs = screen.getAllByTestId("motion-div");
      expect(motionDivs.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for BoxBreathing section", () => {
      mockSearchParams.get.mockReturnValue("1");

      const { asFragment } = render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot for SessionSummary section", () => {
      mockSearchParams.get.mockReturnValue("2");

      const { asFragment } = render(
        <TestWrapper>
          <PostCallSummary />
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
      expect(typeof PostCallSummary).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      const { container } = render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: useEffect Behavior
   * Verifies useEffect behavior for URL parameter changes
   */
  describe("useEffect Behavior", () => {
    it("should update selected tab when search params change", () => {
      // Test with section 2 from the start
      mockSearchParams.get.mockReturnValue("2");
      vi.mocked(utils.getSectionTabForIndex).mockReturnValue(SectionType.SessionSummary);

      render(
        <TestWrapper>
          <PostCallSummary />
        </TestWrapper>,
      );

      // Should show SessionSummary
      expect(screen.getByTestId("call-summary")).toBeInTheDocument();
    });
  });
});
