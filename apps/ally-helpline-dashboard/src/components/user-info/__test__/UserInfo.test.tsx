import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { User } from "@types";

import UserInfo from "../UserInfo";

// --- MOCKS ---

// Mock external dependencies (icons) using data-testid for easy selection
vi.mock("@assets", () => ({
  AccountCircle: (props: any) => <div data-testid="account-icon" {...props}></div>,
  Arrow: (props: any) => <div data-testid="arrow-icon" className={props.className}></div>,
  Logout: (props: any) => <div data-testid="logout-icon" {...props}></div>,
}));

// --- SETUP DATA ---

const mockUser: User = {
  name: "Jane Doe",
  email: "jane.doe@example.com",
  // Added required properties to satisfy the 'User' type
  id: 123,
  // Cast the 'standard' string to 'any' to satisfy the 'UserRole' type
  // since its definition is not available in the test file scope.
  role: "standard" as any,
  userId: 123,
};

const mockOnLogout = vi.fn();

// --- TEST SUITE ---

describe("UserInfo", () => {
  const renderComponent = (user = mockUser) => {
    return render(<UserInfo user={user} onLogout={mockOnLogout} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to simulate a click outside the component area
  const simulateClickOutside = () => {
    // We use fireEvent.mouseDown on the document since the component listens globally for this event
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
      // Use queryByText to assert that the element is NOT in the document
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  describe("Toggle Menu Behavior", () => {
    it("should show the logout menu when the user info area is clicked", () => {
      renderComponent();

      // Click the element that contains the onClick handler (using the name element inside)
      fireEvent.click(screen.getByText("Jane Doe"));

      // Check if the Logout button is now visible
      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it("should apply the rotation class to the arrow icon when the menu is open", () => {
      renderComponent();

      const arrowIcon = screen.getByTestId("arrow-icon");

      // Initial state (hidden menu)
      expect(arrowIcon).not.toHaveClass("-rotate-90");

      // Click to show menu
      fireEvent.click(screen.getByText("Jane Doe"));

      // State after click (shown menu)
      expect(arrowIcon).toHaveClass("-rotate-90");
    });
  });

  describe("Click Outside Logic", () => {
    it("should hide the logout menu when a click occurs outside the component", () => {
      renderComponent();

      // 1. Click to show menu
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();

      // 2. Simulate click outside
      simulateClickOutside();

      // 3. Verify menu is hidden
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });

    it("should NOT hide the logout menu when a click occurs inside the component", () => {
      renderComponent();

      // 1. Click to show menu
      fireEvent.click(screen.getByText("Jane Doe"));
      expect(screen.getByText("Logout")).toBeInTheDocument();

      // 2. Simulate a click on the visible logout button (which is inside the component's ref area)
      fireEvent.click(screen.getByRole("button", { name: /Logout/i }));

      // 3. Verify menu is still visible (since onLogout is mocked and does not unmount the component)
      expect(screen.getByText("Logout")).toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    it("should call the onLogout prop when the Logout button is clicked", () => {
      renderComponent();

      // 1. Show the menu
      fireEvent.click(screen.getByText("Jane Doe"));

      // 2. Click the Logout button
      const logoutButton = screen.getByRole("button", { name: /Logout/i });
      fireEvent.click(logoutButton);

      // 3. Verify onLogout was called
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });
});
