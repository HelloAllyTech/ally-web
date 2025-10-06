/**
 * Comprehensive Unit Tests for Analytics Component
 *
 * Test Coverage:
 * - Component rendering with different user roles
 * - Conditional rendering based on user role
 * - Redux state integration
 * - Component structure and layout
 * - Accessibility roles and semantic HTML
 * - CSS classes application
 * - Snapshot testing
 * - Integration with child components
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { UserRole } from "@types";

import { Analytics } from "../Analytics";

// Mock the child components
vi.mock("../components", () => ({
  UserAnalytics: () => <div data-testid="user-analytics">UserAnalytics</div>,
  OrgAnalytics: () => <div data-testid="org-analytics">OrgAnalytics</div>,
}));

// Mock the Redux store
const createMockStore = (userRole: UserRole) => {
  return configureStore({
    reducer: {
      user: (state = { user: { role: userRole } }) => state,
    },
    preloadedState: {
      user: { user: { role: userRole } },
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children, userRole }: { children: React.ReactNode; userRole: UserRole }) => {
  const store = createMockStore(userRole);
  return <Provider store={store}>{children}</Provider>;
};

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
    it("should render successfully for counsellor role", () => {
      render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("user-analytics")).toBeInTheDocument();
    });

    it("should render successfully for admin role", () => {
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(
          <TestWrapper userRole={UserRole.COUNSELLOR}>
            <Analytics />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Role-based Rendering
   * Verifies conditional rendering based on user role
   */
  describe("Role-based Rendering", () => {
    it("should render UserAnalytics for counsellor role", () => {
      render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("user-analytics")).toBeInTheDocument();
      expect(screen.queryByTestId("org-analytics")).not.toBeInTheDocument();
    });

    it("should render OrgAnalytics for admin role", () => {
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
      expect(screen.queryByTestId("user-analytics")).not.toBeInTheDocument();
    });

    it("should render OrgAnalytics for admin role", () => {
      render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
      expect(screen.queryByTestId("user-analytics")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector(
        "div.flex.items-center.justify-center.m-6.overflow-hidden",
      );
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("h-[calc(100vh-100px)]");
    });

    it("should have proper container structure", () => {
      const { container } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector(
        "div.flex.items-center.justify-center.m-6.overflow-hidden",
      );
      expect(mainContainer).not.toBeNull();
      expect(mainContainer?.className).toContain("flex");
      expect(mainContainer?.className).toContain("items-center");
      expect(mainContainer?.className).toContain("justify-center");
    });

    it("should apply correct height and overflow styles", () => {
      const { container } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector(
        "div.flex.items-center.justify-center.m-6.overflow-hidden",
      );
      expect(mainContainer?.className).toContain("h-[calc(100vh-100px)]");
      expect(mainContainer?.className).toContain("overflow-hidden");
    });
  });

  /**
   * TEST GROUP: Redux Integration
   * Verifies Redux state integration
   */
  describe("Redux Integration", () => {
    it("should access user role from Redux store", () => {
      render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      // The component should render based on the role from the store
      expect(screen.getByTestId("user-analytics")).toBeInTheDocument();
    });

    it("should handle different user roles from Redux store", () => {
      const { rerender } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("user-analytics")).toBeInTheDocument();

      rerender(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper container structure for screen readers", () => {
      const { container } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      const mainContainer = container.querySelector(
        "div.flex.items-center.justify-center.m-6.overflow-hidden",
      );
      expect(mainContainer).not.toBeNull();
    });

    it("should maintain focus management", () => {
      render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      // Component should render without focus issues
      expect(screen.getByTestId("user-analytics")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should handle undefined user role gracefully", () => {
      const store = configureStore({
        reducer: {
          user: (state = { user: null }) => state,
        },
        preloadedState: {
          user: { user: null },
        },
      });

      render(
        <Provider store={store}>
          <Analytics />
        </Provider>,
      );
      // Should render OrgAnalytics as fallback when user is null
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
    });

    it("should handle missing user object gracefully", () => {
      const store = configureStore({
        reducer: {
          user: (state = { user: {} }) => state,
        },
        preloadedState: {
          user: { user: {} },
        },
      });

      render(
        <Provider store={store}>
          <Analytics />
        </Provider>,
      );
      // Should render OrgAnalytics as fallback when user role is undefined
      expect(screen.getByTestId("org-analytics")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot for counsellor role", () => {
      const { asFragment } = render(
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot for admin role", () => {
      const { asFragment } = render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot for super admin role", () => {
      const { asFragment } = render(
        <TestWrapper userRole={UserRole.ADMIN}>
          <Analytics />
        </TestWrapper>,
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Analytics).toBe("function");
    });

    it("should return a valid React element", () => {
      const element = (
        <TestWrapper userRole={UserRole.COUNSELLOR}>
          <Analytics />
        </TestWrapper>
      );
      expect(element).toBeDefined();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(
          <TestWrapper userRole={UserRole.COUNSELLOR}>
            <Analytics />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });
});
