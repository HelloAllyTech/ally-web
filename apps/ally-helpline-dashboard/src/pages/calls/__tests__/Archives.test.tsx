/**
 * Comprehensive Unit Tests for Archives Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - Navigation state handling (sessionUserGroup)
 * - Redux integration and filter updates
 * - Button interactions (back, refresh)
 * - Motion animations
 * - Component integration with ArchivesLogsTable
 * - Error handling and edge cases
 * - Snapshot testing
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SessionType } from "@types";

import { Archives } from "../Archives";
import { SessionUserGroup } from "../constants";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn(() => ({
  state: null,
  key: "",
  pathname: "/archives",
  search: "",
  hash: "",
}));

import type { ReactNode } from "react";

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
  BrowserRouter: ({ children }: { children: ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock assets
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    LeftArrow: ({ className }: any) => (
      <div data-testid="left-arrow-icon" className={className}>
        LeftArrow
      </div>
    ),
    Refresh: ({ className, onClick, "data-testid": dataTestId }: any) => (
      <div data-testid={dataTestId || "refresh-icon"} className={className} onClick={onClick}>
        Refresh
      </div>
    ),
  };
});

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    ROUTES: {
      SCRIBE_LOGS: "/scribe-logs",
    },
  };
});

// Mock reducer
vi.mock("@reducer", () => ({
  updateFilters: (filters: any) => ({ type: "calls/updateFilters", payload: filters }),
}));

// Mock child component
vi.mock("../components", () => ({
  ArchivesLogsTable: ({ sessionType, className, refreshKey, sessionUserGroup }: any) => (
    <div
      data-testid="archives-logs-table"
      data-session-type={sessionType}
      data-class-name={className}
      data-refresh-key={refreshKey}
      data-session-user-group={sessionUserGroup}
    >
      Archives Logs Table
    </div>
  ),
}));

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      calls: (state = { filters: { offset: 0, limit: 25 } }, action: any) => {
        if (action.type === "calls/updateFilters") {
          return { ...state, filters: { ...state.filters, ...action.payload } };
        }
        return state;
      },
      user: (state = { user: null }) => state,
    },
    preloadedState: initialState,
  });
};

// Test wrapper component with Redux Provider and Router
const TestWrapper = ({
  children,
  store = createMockStore(),
  locationState = null,
}: {
  children: React.ReactNode;
  store?: any;
  locationState?: any;
}) => {
  mockUseLocation.mockReturnValue({
    state: locationState,
    key: "",
    pathname: "/archives",
    search: "",
    hash: "",
  });

  return (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );
};

describe("Archives Component", () => {
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createMockStore({
      calls: {
        filters: {
          offset: 0,
          limit: 25,
        },
      },
      user: {
        user: null,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-page")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(
          <TestWrapper store={mockStore}>
            <Archives />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Archives />
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
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector('[data-testid="archives-page"]');
      expect(mainContainer).toHaveClass("px-6", "pb-6", "h-full", "flex", "flex-col");
    });

    it("should render archives header", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-header")).toBeInTheDocument();
    });

    it("should render archives title", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-title")).toBeInTheDocument();
      expect(screen.getByText("Archives")).toBeInTheDocument();
    });

    it("should render back button", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-back-button")).toBeInTheDocument();
    });

    it("should render refresh button", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-refresh-button")).toBeInTheDocument();
    });

    it("should render ArchivesLogsTable component", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-logs-table")).toBeInTheDocument();
    });

    it("should render archives content section", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(screen.getByTestId("archives-content")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation State Handling
   * Verifies sessionUserGroup handling from location state
   */
  describe("Navigation State Handling", () => {
    it("should default to MY_LOGS when no sessionUserGroup in location state", () => {
      render(
        <TestWrapper store={mockStore} locationState={null}>
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-session-user-group", SessionUserGroup.MY_LOGS);
    });

    it("should use MY_LOGS from location state", () => {
      render(
        <TestWrapper
          store={mockStore}
          locationState={{ sessionUserGroup: SessionUserGroup.MY_LOGS }}
        >
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-session-user-group", SessionUserGroup.MY_LOGS);
    });

    it("should use ORG_LOGS from location state", () => {
      render(
        <TestWrapper
          store={mockStore}
          locationState={{ sessionUserGroup: SessionUserGroup.ORG_LOGS }}
        >
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-session-user-group", SessionUserGroup.ORG_LOGS);
    });

    it("should handle location state without sessionUserGroup", () => {
      render(
        <TestWrapper store={mockStore} locationState={{ otherData: "test" }}>
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-session-user-group", SessionUserGroup.MY_LOGS);
    });
  });

  /**
   * TEST GROUP: ArchivesLogsTable Props
   * Verifies correct props are passed to ArchivesLogsTable
   */
  describe("ArchivesLogsTable Props", () => {
    it("should pass correct sessionType to ArchivesLogsTable", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-session-type", SessionType.CALL);
    });

    it("should pass correct className to ArchivesLogsTable", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-class-name", "max-h-[calc(100dvh-140px)]");
    });

    it("should pass refreshKey to ArchivesLogsTable", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-refresh-key", "0");
    });
  });

  /**
   * TEST GROUP: Button Interactions
   * Verifies button click handlers and interactions
   */
  describe("Button Interactions", () => {
    it("should navigate to calls page when back button is clicked", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("archives-back-button");
      fireEvent.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith("/scribe-logs");
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("should handle refresh button click", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const refreshButton = screen.getByTestId("archives-refresh-button");
      fireEvent.click(refreshButton);

      // Refresh key should increment
      const table = screen.getByTestId("archives-logs-table");
      expect(table).toHaveAttribute("data-refresh-key", "1");
    });

    it("should increment refresh key on multiple refresh clicks", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const refreshButton = screen.getByTestId("archives-refresh-button");
      const table = screen.getByTestId("archives-logs-table");

      // Initial state
      expect(table).toHaveAttribute("data-refresh-key", "0");

      // First refresh
      fireEvent.click(refreshButton);
      expect(table).toHaveAttribute("data-refresh-key", "1");

      // Second refresh
      fireEvent.click(refreshButton);
      expect(table).toHaveAttribute("data-refresh-key", "2");
    });

    it("should have correct aria-label on back button", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("archives-back-button");
      expect(backButton).toHaveAttribute("aria-label", "Go back");
    });
  });

  /**
   * TEST GROUP: Redux Integration
   * Verifies Redux state management and actions
   */
  describe("Redux Integration", () => {
    it("should read filters from Redux store", () => {
      const storeWithFilters = createMockStore({
        calls: {
          filters: {
            offset: 10,
            limit: 25,
          },
        },
      });

      render(
        <TestWrapper store={storeWithFilters}>
          <Archives />
        </TestWrapper>,
      );

      // Component should render without errors
      expect(screen.getByTestId("archives-page")).toBeInTheDocument();
    });

    it("should dispatch updateFilters on refresh", () => {
      const store = createMockStore({
        calls: {
          filters: {
            offset: 10,
            limit: 25,
          },
        },
      });

      const dispatchSpy = vi.spyOn(store, "dispatch");

      render(
        <TestWrapper store={store}>
          <Archives />
        </TestWrapper>,
      );

      const refreshButton = screen.getByTestId("archives-refresh-button");
      fireEvent.click(refreshButton);

      // Verify dispatch was called
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  /**
   * TEST GROUP: Motion Animations
   * Verifies framer-motion integration
   */
  describe("Motion Animations", () => {
    it("should render motion.div with correct props", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const header = screen.getByTestId("archives-header");
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass("relative", "mt-[10px]", "font-secondary");
    });

    it("should render header content with correct structure", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const headerContent = screen.getByTestId("archives-header-content");
      expect(headerContent).toBeInTheDocument();
      expect(headerContent).toHaveClass(
        "sm:p-4",
        "p-0",
        "rounded-lg",
        "flex",
        "gap-4",
        "sm:justify-between",
        "justify-start",
        "bg-transparent",
        "items-center",
      );
    });
  });

  /**
   * TEST GROUP: Icon Rendering
   * Verifies icons are rendered correctly
   */
  describe("Icon Rendering", () => {
    it("should render LeftArrow icon", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      expect(screen.getByTestId("left-arrow-icon")).toBeInTheDocument();
    });

    it("should render Refresh icon", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      expect(screen.getByTestId("archives-refresh-button")).toBeInTheDocument();
    });

    it("should render Refresh icon with correct classes", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const refreshButton = screen.getByTestId("archives-refresh-button");
      expect(refreshButton).toHaveClass("w-6", "h-6", "cursor-pointer");
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling and edge cases
   */
  describe("Error Handling", () => {
    it("should handle missing location state gracefully", () => {
      mockUseLocation.mockReturnValue({
        state: undefined,
        key: "",
        pathname: "/archives",
        search: "",
        hash: "",
      });

      expect(() => {
        render(
          <TestWrapper store={mockStore}>
            <Archives />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should handle empty filters in Redux store", () => {
      const storeWithEmptyFilters = createMockStore({
        calls: {
          filters: {},
        },
      });

      expect(() => {
        render(
          <TestWrapper store={storeWithEmptyFilters}>
            <Archives />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("archives-back-button");
      expect(backButton).toHaveAttribute("type", "button");
    });

    it("should have proper aria-label on back button", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      const backButton = screen.getByTestId("archives-back-button");
      expect(backButton).toHaveAttribute("aria-label", "Go back");
    });

    it("should have proper data-testid attributes", () => {
      render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );

      expect(screen.getByTestId("archives-page")).toBeInTheDocument();
      expect(screen.getByTestId("archives-header")).toBeInTheDocument();
      expect(screen.getByTestId("archives-header-content")).toBeInTheDocument();
      expect(screen.getByTestId("archives-title")).toBeInTheDocument();
      expect(screen.getByTestId("archives-back-button")).toBeInTheDocument();
      expect(screen.getByTestId("archives-refresh-button")).toBeInTheDocument();
      expect(screen.getByTestId("archives-content")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot with default props", () => {
      const { asFragment } = render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with MY_LOGS sessionUserGroup", () => {
      const { asFragment } = render(
        <TestWrapper
          store={mockStore}
          locationState={{ sessionUserGroup: SessionUserGroup.MY_LOGS }}
        >
          <Archives />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with ORG_LOGS sessionUserGroup", () => {
      const { asFragment } = render(
        <TestWrapper
          store={mockStore}
          locationState={{ sessionUserGroup: SessionUserGroup.ORG_LOGS }}
        >
          <Archives />
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
      expect(typeof Archives).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Archives />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(
          <TestWrapper store={mockStore}>
            <Archives />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });
});
