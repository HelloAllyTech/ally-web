import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom"; // Added import
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { User } from "@types";

import UserInfo from "../UserInfo";

// --- MOCKS ---

// Mock hooks
const mockUseSimulationCredits = vi.fn();
const mockUseUser = vi.fn();

vi.mock("@hooks", () => ({
  useSimulationCredits: () => mockUseSimulationCredits(),
  useUser: () => mockUseUser(),
}));

vi.mock("@components", () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AppTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@assets", () => ({
  AccountCircle: (props: any) => <div {...props}></div>,
  Arrow: (props: any) => <div className={props.className} {...props}></div>,
  Logout: (props: any) => <div {...props}></div>,
  Bolt: (props: any) => <div {...props}></div>,
  Ally: (props: any) => <svg data-testid="ally-logo" {...props} />,
  DataPolicy: (props: any) => <svg data-testid="data-policy" {...props} />,
  ManageAccount: (props: any) => <svg data-testid="manage-account" {...props} />,
  WarningTriangle: (props: any) => <svg data-testid="warning-triangle" {...props} />,
}));

// Mock constants
vi.mock("@constants", () => ({
  Permissions: {
    VIEW_SIMULATION_CREDITS: "VIEW_SIMULATION_CREDITS",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
  TooltipLocation: {
    PROFILE_MENU: "profile_menu",
    LOGOUT_BUTTON: "logout_button",
  },
}));

// --- SETUP DATA ---

const mockUser: User = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  id: 123,
  role: "standard" as any,
  userId: 123,
};

const mockOnLogout = vi.fn();

// Create a mock Redux store (in case the hook needs Redux)
const createMockStore = () => {
  const userReducer = (
    state = {
      isAuthenticated: true,
      availableChatTypes: [],
      user: mockUser,
      permissions: [],
    },
    action: any,
  ) => state;

  return configureStore({
    reducer: {
      user: userReducer,
    },
  });
};

// Test wrapper component with Redux Provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createMockStore()}>{children}</Provider>
);

// --- TEST SUITE ---

describe("UserInfo", () => {
  const renderComponent = (user = mockUser, isExpanded = true) => {
    return render(
      <TestWrapper>
        <UserInfo user={user} isExpanded={isExpanded} onLogout={mockOnLogout} />
      </TestWrapper>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSimulationCredits.mockReturnValue({
      credits: {
        consumedCredits: 5,
        creditLimit: 10,
      },
      limitReached: false,
      CreditPercentage: 50,
    });

    mockUseUser.mockReturnValue({
      permissions: [],
      user: mockUser,
      isAuthenticated: true,
    });
  });

  // Helper to simulate a click outside the component area
  const simulateClickOutside = () => {
    fireEvent.mouseDown(document.body);
  };

  describe("Initial Rendering", () => {
    it("should render user name and email when expanded", () => {
      renderComponent(mockUser, true);
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane.doe@example.com")).toBeInTheDocument();
      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();
      expect(screen.getByTestId("user-info-toggle-arrow")).toBeInTheDocument();
    });

    it("should not render user name and email when collapsed", () => {
      renderComponent(mockUser, false);
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("jane.doe@example.com")).not.toBeInTheDocument();
      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();
    });

    it("should not render arrow icon when collapsed", () => {
      renderComponent(mockUser, false);
      expect(screen.queryByTestId("user-info-toggle-arrow")).not.toBeInTheDocument();
    });

    it("should initially hide the logout menu", () => {
      renderComponent();
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  describe("isExpanded Prop Behavior", () => {
    it("should show user details when isExpanded is true", () => {
      renderComponent(mockUser, true);
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane.doe@example.com")).toBeInTheDocument();
      expect(screen.getByTestId("user-info-toggle-arrow")).toBeInTheDocument();
    });

    it("should hide user details when isExpanded is false", () => {
      renderComponent(mockUser, false);
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("jane.doe@example.com")).not.toBeInTheDocument();
      expect(screen.queryByTestId("user-info-toggle-arrow")).not.toBeInTheDocument();
    });

    it("should show account icon regardless of isExpanded state", () => {
      const { rerender } = renderComponent(mockUser, true);
      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <UserInfo user={mockUser} isExpanded={false} onLogout={mockOnLogout} />
        </TestWrapper>,
      );
      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();
    });

    it("should allow menu toggle when collapsed", () => {
      renderComponent(mockUser, false);

      const accountIcon = screen.getByTestId("user-info-avatar");
      fireEvent.click(accountIcon.parentElement?.parentElement?.parentElement || accountIcon);

      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });

  describe("Toggle Menu Behavior", () => {
    it("should show the logout menu when the user info area is clicked (expanded)", () => {
      renderComponent(mockUser, true);

      fireEvent.click(screen.getByText("Jane Doe"));

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should show the logout menu when the icon area is clicked (collapsed)", () => {
      const { container } = renderComponent(mockUser, false);

      const clickableArea = container.querySelector(".cursor-pointer");
      fireEvent.click(clickableArea!);

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should apply the rotation class to the arrow icon when the menu is open and expanded", () => {
      renderComponent(mockUser, true);

      const arrowIcon = screen.getByTestId("user-info-toggle-arrow");

      expect(arrowIcon).not.toHaveClass("-rotate-90");

      fireEvent.click(screen.getByText("Jane Doe"));

      expect(arrowIcon).toHaveClass("-rotate-90");
    });
  });

  describe("Click Outside Logic", () => {
    it("should hide the logout menu when a click occurs outside the component", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();

      simulateClickOutside();

      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });

    it("should NOT hide the logout menu when a click occurs inside the component", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Logout/i }));

      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    it("should call the onLogout prop when the Logout button is clicked", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      fireEvent.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Credit Display", () => {
    it("should display credit usage information when menu is open", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      expect(screen.getByText("Credit usage")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("/10")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should display Bolt icon in credit section", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      expect(screen.getByTestId("user-info-credits-icon")).toBeInTheDocument();
    });

    it("should show red progress bar when limit is reached", () => {
      mockUseSimulationCredits.mockReturnValue({
        credits: {
          consumedCredits: 10,
          creditLimit: 10,
        },
        limitReached: true,
        CreditPercentage: 100,
      });

      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const progressBar = document.querySelector(".bg-red-500");
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: "100%" });
    });

    it("should handle missing credits data gracefully", () => {
      mockUseSimulationCredits.mockReturnValue({
        credits: null,
        limitReached: false,
        CreditPercentage: 0,
      });

      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      expect(screen.getAllByText("0")[0]).toBeInTheDocument();
      expect(screen.getByText("/0")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("Menu Positioning", () => {
    it("should position the menu at left-[240px] when expanded", () => {
      const { container } = renderComponent(mockUser, true);

      fireEvent.click(screen.getByText("Jane Doe"));

      const menu = container.querySelector(".left-\\[240px\\]");
      expect(menu).toBeInTheDocument();
    });

    it("should position the menu at left-[80px] when collapsed", () => {
      const { container } = renderComponent(mockUser, false);

      const clickableArea = container.querySelector(".cursor-pointer");
      fireEvent.click(clickableArea!);

      const menu = container.querySelector(".left-\\[80px\\]");
      expect(menu).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should render without user data", () => {
      render(
        <TestWrapper>
          <UserInfo user={undefined} onLogout={mockOnLogout} />
        </TestWrapper>,
      );

      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();
    });

    it("should toggle menu multiple times", () => {
      renderComponent();

      // First toggle - open
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();

      // Second toggle - close
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();

      // Third toggle - open again
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });

    it("should handle isExpanded being undefined", () => {
      render(
        <TestWrapper>
          <UserInfo user={mockUser} onLogout={mockOnLogout} />
        </TestWrapper>,
      );

      // Should behave as if collapsed when undefined
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.getByTestId("user-info-avatar")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper button role for logout", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should have cursor pointer on clickable area", () => {
      const { container } = renderComponent();

      const clickableArea = container.querySelector(".cursor-pointer");
      expect(clickableArea).toBeInTheDocument();
    });
  });

  describe("Styling and Animation", () => {
    it("should apply transition classes to arrow icon when expanded", () => {
      renderComponent(mockUser, true);

      const arrowIcon = screen.getByTestId("user-info-toggle-arrow");
      expect(arrowIcon.className).toContain("transition-transform");
      expect(arrowIcon.className).toContain("duration-300");
    });

    it("should apply hover styles to logout button", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton.className).toContain("hover:bg-gray-100");
    });

    it("should apply transition to progress bar", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const progressBar = document.querySelector(".transition-all.duration-300");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("Credit Ring Display", () => {
    it("should not apply background style when CreditPercentage is invalid", () => {
      mockUseSimulationCredits.mockReturnValue({
        credits: null,
        limitReached: false,
        CreditPercentage: undefined,
      });

      renderComponent(mockUser, true);

      const ringElement = screen.getByTestId("user-info-avatar-ring");
      expect(ringElement).toBeInTheDocument();
      expect(ringElement).not.toHaveAttribute("style");
    });
  });
});
