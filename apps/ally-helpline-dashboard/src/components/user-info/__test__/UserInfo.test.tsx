import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { User } from "@types";

import UserInfo from "../UserInfo";

// --- MOCKS ---

// Mock hooks
const mockUseSimulationCredits = vi.fn();
const mockUseUser = vi.fn();

vi.mock("@hooks", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSimulationCredits: () => mockUseSimulationCredits(),
    useUser: () => mockUseUser(),
  };
});

// Mock PermissionGuard to render children without permission checks
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock external dependencies using importOriginal to preserve other exports
vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    AccountCircle: (props: any) => <div data-testid="account-icon" {...props}></div>,
    Arrow: (props: any) => <div data-testid="arrow-icon" className={props.className}></div>,
    Logout: (props: any) => <div data-testid="logout-icon" {...props}></div>,
    Bolt: (props: any) => <div data-testid="bolt-icon" {...props}></div>,
  };
});

// Mock constants
vi.mock("@constants", () => ({
  Permissions: {
    VIEW_SIMULATION_CREDITS: "VIEW_SIMULATION_CREDITS",
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
  const renderComponent = (user = mockUser) => {
    return render(
      <TestWrapper>
        <UserInfo user={user} onLogout={mockOnLogout} />
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
    it("should render user name and email", () => {
      renderComponent();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("jane.doe@example.com")).toBeInTheDocument();
      expect(screen.getByTestId("account-icon")).toBeInTheDocument();
      expect(screen.getByTestId("arrow-icon")).toBeInTheDocument();
    });

    it("should initially hide the logout menu", () => {
      renderComponent();
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  describe("Toggle Menu Behavior", () => {
    it("should show the logout menu when the user info area is clicked", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should apply the rotation class to the arrow icon when the menu is open", () => {
      renderComponent();

      const arrowIcon = screen.getByTestId("arrow-icon");

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

      expect(screen.getByTestId("bolt-icon")).toBeInTheDocument();
    });

    it("should show blue progress bar when limit not reached", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const progressBar = document.querySelector(".bg-blue-600");
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: "50%" });
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
    it("should position the menu absolutely to the left when open", () => {
      renderComponent();

      fireEvent.click(screen.getByText("Jane Doe"));

      const menu = document.querySelector(".absolute.bottom-3.left-full");
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

      expect(screen.getByTestId("account-icon")).toBeInTheDocument();
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
    it("should apply transition classes to arrow icon", () => {
      renderComponent();

      const arrowIcon = screen.getByTestId("arrow-icon");
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
});
