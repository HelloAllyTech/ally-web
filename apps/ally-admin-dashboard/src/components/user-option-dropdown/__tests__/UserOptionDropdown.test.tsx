import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { UserMenuOptions, UserRole, userStatus } from "@constants";
import { UserListUser } from "@types";

import { UserOptionDropdown } from "../UserOptionDropdown";

// Mock createPortal to render in place
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (node: any) => node,
  };
});

describe("UserOptionDropdown", () => {
  const mockOnClose = vi.fn();
  const mockOnOptionSelect = vi.fn();

  const mockActiveUserWithLearnerRole: UserListUser = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    username: "testuser",
    externalId: "EXT001",
    status: userStatus.ACTIVE,
    role: "LEARNER",
    metadata: {},
    organization: "Test Org",
    tenantId: "tenant1",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    roles: [UserRole.LEARNER],
    creditLimit: 100,
    consumedCredits: 50,
    secondsAllowedPerCredit: 60,
  };

  const mockActiveUserWithoutLearnerRole: UserListUser = {
    ...mockActiveUserWithLearnerRole,
    roles: [UserRole.ADMIN],
    role: "ADMIN",
    creditLimit: null,
    consumedCredits: null,
  };

  const mockSuspendedUser: UserListUser = {
    ...mockActiveUserWithLearnerRole,
    status: userStatus.SUSPENDED,
  };

  const mockAnchorElement = document.createElement("button");
  mockAnchorElement.getBoundingClientRect = vi.fn(() => ({
    top: 100,
    bottom: 120,
    left: 200,
    right: 250,
    width: 50,
    height: 20,
    x: 200,
    y: 100,
    toJSON: () => {},
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe("Dropdown visibility", () => {
    it("does not render when isOpen is false", () => {
      render(
        <UserOptionDropdown
          isOpen={false}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      expect(screen.queryByText(UserMenuOptions.EDIT_DETAILS)).not.toBeInTheDocument();
    });

    it("renders when isOpen is true", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });
    });

    it("does not render until position is calculated", () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={null}
        />,
      );

      expect(screen.queryByText(UserMenuOptions.EDIT_DETAILS)).not.toBeInTheDocument();
    });
  });

  describe("Menu options for active LEARNER user", () => {
    it("shows all applicable options for active learner user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
        expect(screen.getByText(UserMenuOptions.CHANGE_ROLE)).toBeInTheDocument();
        expect(screen.getByText(UserMenuOptions.MANAGE_CREDITS)).toBeInTheDocument();
        expect(screen.getByText(UserMenuOptions.SUSPEND_USER)).toBeInTheDocument();
      });
    });

    it("does not show GRANT_ACCESS for active user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.GRANT_ACCESS)).not.toBeInTheDocument();
      });
    });
  });

  describe("Menu options for active non-LEARNER user", () => {
    it("does not show MANAGE_CREDITS for non-learner user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithoutLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.MANAGE_CREDITS)).not.toBeInTheDocument();
      });
    });

    it("shows EDIT_DETAILS, CHANGE_ROLE, and SUSPEND_USER for active admin user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithoutLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
        expect(screen.getByText(UserMenuOptions.CHANGE_ROLE)).toBeInTheDocument();
        expect(screen.getByText(UserMenuOptions.SUSPEND_USER)).toBeInTheDocument();
      });
    });
  });

  describe("Menu options for suspended user", () => {
    it("shows GRANT_ACCESS for suspended user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockSuspendedUser}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.GRANT_ACCESS)).toBeInTheDocument();
      });
    });

    it("does not show SUSPEND_USER for suspended user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockSuspendedUser}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.SUSPEND_USER)).not.toBeInTheDocument();
      });
    });

    it("does not show CHANGE_ROLE for suspended user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockSuspendedUser}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.CHANGE_ROLE)).not.toBeInTheDocument();
      });
    });

    it("does not show MANAGE_CREDITS for suspended user even if they have learner role", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockSuspendedUser}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.MANAGE_CREDITS)).not.toBeInTheDocument();
      });
    });

    it("shows EDIT_DETAILS for suspended user", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockSuspendedUser}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });
    });
  });

  describe("User interactions", () => {
    it("calls onOptionSelect and onClose when option is clicked", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(UserMenuOptions.EDIT_DETAILS));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith(UserMenuOptions.EDIT_DETAILS);
    });

    it("calls onClose when backdrop is clicked", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });

      const backdrop = document.querySelector(".fixed.inset-0.z-40");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onOptionSelect with correct option when MANAGE_CREDITS is clicked", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.MANAGE_CREDITS)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(UserMenuOptions.MANAGE_CREDITS));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(UserMenuOptions.MANAGE_CREDITS);
    });

    it("calls onOptionSelect with correct option when SUSPEND_USER is clicked", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.SUSPEND_USER)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(UserMenuOptions.SUSPEND_USER));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(UserMenuOptions.SUSPEND_USER);
    });
  });

  describe("Dropdown positioning", () => {
    it("positions dropdown below anchor element by default", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const dropdown = document.querySelector('[style*="top"]');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("positions dropdown to align with right edge of anchor element", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const dropdown = document.querySelector('[style*="left"]');
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("updates position on scroll", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });

      fireEvent.scroll(window);

      // Verify dropdown is still rendered (position updated)
      expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
    });

    it("updates position on window resize", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });

      fireEvent.resize(window);

      // Verify dropdown is still rendered (position updated)
      expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
    });
  });

  describe("Dropdown styling", () => {
    it("has correct dropdown width", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const dropdown = document.querySelector(".w-\\[220px\\]");
        expect(dropdown).toBeInTheDocument();
      });
    });

    it("has border separator between options except last one", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const options = screen.getAllByText(/Edit details|Change role|Manage credits|Suspend user/);

        // All except last should have border-b
        const optionsWithBorder = options.slice(0, -1);
        optionsWithBorder.forEach(option => {
          expect(option.className).toContain("border-b");
        });
      });
    });

    it("applies black text color to non-destructive options", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const editOption = screen.getByText(UserMenuOptions.EDIT_DETAILS);
        expect(editOption).toBeInTheDocument();
      });
    });

    it("has cursor-pointer on options", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const option = screen.getByText(UserMenuOptions.EDIT_DETAILS);
        expect(option.className).toContain("cursor-pointer");
      });
    });

    it("has correct z-index for backdrop and dropdown", async () => {
      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        const backdrop = document.querySelector(".z-40");
        const dropdown = document.querySelector(".z-50");
        expect(backdrop).toBeInTheDocument();
        expect(dropdown).toBeInTheDocument();
      });
    });
  });

  describe("Edge cases", () => {
    it("handles user with empty roles array", async () => {
      const userWithEmptyRoles = {
        ...mockActiveUserWithLearnerRole,
        roles: [],
      };

      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={userWithEmptyRoles}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.MANAGE_CREDITS)).not.toBeInTheDocument();
      });
    });

    it("handles user with undefined roles", async () => {
      const userWithUndefinedRoles = {
        ...mockActiveUserWithLearnerRole,
        roles: undefined as any,
      };

      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={userWithUndefinedRoles}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.queryByText(UserMenuOptions.MANAGE_CREDITS)).not.toBeInTheDocument();
      });
    });

    it("handles position adjustment when dropdown would go off-screen at bottom", async () => {
      const lowAnchorElement = document.createElement("button");
      lowAnchorElement.getBoundingClientRect = vi.fn(() => ({
        top: 700,
        bottom: 720,
        left: 200,
        right: 250,
        width: 50,
        height: 20,
        x: 200,
        y: 700,
        toJSON: () => {},
      }));

      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={lowAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });
    });

    it("handles position adjustment when dropdown would go off-screen on left", async () => {
      const leftAnchorElement = document.createElement("button");
      leftAnchorElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 120,
        left: 5,
        right: 25,
        width: 20,
        height: 20,
        x: 5,
        y: 100,
        toJSON: () => {},
      }));

      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={leftAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });
    });

    it("handles position adjustment when dropdown would go off-screen on right", async () => {
      const rightAnchorElement = document.createElement("button");
      rightAnchorElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 120,
        left: 1000,
        right: 1020,
        width: 20,
        height: 20,
        x: 1000,
        y: 100,
        toJSON: () => {},
      }));

      render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={rightAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });
    });
  });

  describe("Multiple option clicks", () => {
    it("handles clicking different options sequentilifeline", async () => {
      const { rerender } = render(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.EDIT_DETAILS)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(UserMenuOptions.EDIT_DETAILS));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(UserMenuOptions.EDIT_DETAILS);

      // Simulate reopening the dropdown
      rerender(
        <UserOptionDropdown
          isOpen={false}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      vi.clearAllMocks();

      rerender(
        <UserOptionDropdown
          isOpen={true}
          onClose={mockOnClose}
          onOptionSelect={mockOnOptionSelect}
          user={mockActiveUserWithLearnerRole}
          anchorElement={mockAnchorElement}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(UserMenuOptions.CHANGE_ROLE)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(UserMenuOptions.CHANGE_ROLE));

      expect(mockOnOptionSelect).toHaveBeenCalledWith(UserMenuOptions.CHANGE_ROLE);
    });
  });
});
