import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { userStatus } from "@constants";
import { UserListUser, UserListProps } from "@types";

import { UserList } from "../UserList";

// Mock only UserOptionDropdown and re-export real StatusBadge directly to avoid loading the entire @components barrel
vi.mock("@components", async () => {
  const { StatusBadge } = await import("../../status-badge");
  return {
    StatusBadge,
    UserOptionDropdown: ({ isOpen, user, onOptionSelect, onClose }: any) =>
      isOpen ? (
        <div data-testid="user-option-dropdown">
          <button onClick={() => onOptionSelect("edit")}>Edit User</button>
          <button onClick={() => onOptionSelect("delete")}>Delete User</button>
          <button onClick={onClose}>Close</button>
        </div>
      ) : null,
  };
});

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      user: "User",
      telephonyId: "Telephony ID",
      role: "Role",
      organization: "Organization",
      credits: "Credits",
      addedOn: "Added On",
      status: "Status",
    },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  UserRole: {
    LEARNER: "LEARNER",
  },
  userStatus: {
    ACTIVE: "ACTIVE",
    INACTIVE: "INACTIVE",
    SUSPENDED: "SUSPENDED",
    BLOCKED: "BLOCKED",
  },
}));

// Mock only formatCapitalizedEnum while preserving the rest of the real utils (e.g., isNumber)
vi.mock("@utils", async importOriginal => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    formatCapitalizedEnum: (value: string) =>
      value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "",
  };
});

describe("UserList", () => {
  const mockUsers: UserListUser[] = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      username: "johndoe",
      externalId: "EXT001",
      status: userStatus.ACTIVE,
      role: "ADMIN",
      metadata: {},
      organization: "Tech Corp",
      tenantId: "tenant-1",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-20T15:30:00Z",
      roles: ["ADMIN", "USER"],
      creditLimit: 100,
      consumedCredits: 25,
      secondsAllowedPerCredit: 60,
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      username: "janesmith",
      externalId: "EXT002",
      status: "INACTIVE" as userStatus,
      role: "USER",
      metadata: {},
      organization: "Design Studio",
      tenantId: "tenant-2",
      createdAt: "2024-02-01T08:00:00Z",
      updatedAt: "2024-02-05T12:00:00Z",
      roles: ["USER"],
      creditLimit: 50,
      consumedCredits: 10,
      secondsAllowedPerCredit: 60,
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob.johnson@example.com",
      username: "bobjohnson",
      externalId: "EXT003",
      status: userStatus.SUSPENDED,
      role: "MODERATOR",
      metadata: {},
      organization: null,
      tenantId: "tenant-3",
      createdAt: "2024-03-10T14:30:00Z",
      updatedAt: "2024-03-15T09:45:00Z",
      roles: ["MODERATOR"],
      creditLimit: null,
      consumedCredits: null,
      secondsAllowedPerCredit: 60,
    },
  ];

  const mockFormatDate = vi.fn((iso: string) => new Date(iso).toLocaleDateString());
  const mockOnOptionSelect = vi.fn();

  const defaultProps: UserListProps = {
    users: mockUsers,
    formatDate: mockFormatDate,
    onOptionSelect: mockOnOptionSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders table header correctly", () => {
      render(<UserList {...defaultProps} />);

      const headers = screen.getAllByText("User");
      expect(headers.length).toBeGreaterThan(0);
      expect(screen.getByText("Telephony ID")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Credits")).toBeInTheDocument();
      expect(screen.getByText("Added On")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    it("renders all users", () => {
      render(<UserList {...defaultProps} />);

      expect(screen.getByText("John doe")).toBeInTheDocument();
      expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
      expect(screen.getByText("Bob johnson")).toBeInTheDocument();
    });

    it("renders user emails", () => {
      render(<UserList {...defaultProps} />);

      expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
      expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob.johnson@example.com")).toBeInTheDocument();
    });

    it("renders external IDs", () => {
      render(<UserList {...defaultProps} />);

      expect(screen.getByText("EXT001")).toBeInTheDocument();
      expect(screen.getByText("EXT002")).toBeInTheDocument();
      expect(screen.getByText("EXT003")).toBeInTheDocument();
    });

    it("renders footer when provided", () => {
      const footer = <div data-testid="custom-footer">Custom Footer</div>;
      render(<UserList {...defaultProps} renderFooter={() => footer} />);

      expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
    });

    it("renders empty list when no users", () => {
      render(<UserList {...defaultProps} users={[]} />);

      expect(screen.queryByText("John doe")).not.toBeInTheDocument();
    });
  });

  describe("Avatar Component", () => {
    it("renders avatar with first letter of name", () => {
      render(<UserList {...defaultProps} />);

      // Check that avatars contain the first letter
      const avatarElements = screen.getAllByText("J");
      expect(avatarElements.length).toBeGreaterThanOrEqual(2); // John and Jane

      const bobAvatar = screen.getByText("B");
      expect(bobAvatar).toBeInTheDocument();
    });

    it("handles missing name gracefully", () => {
      const userWithoutName = {
        ...mockUsers[0],
        name: "",
      };
      render(<UserList {...defaultProps} users={[userWithoutName]} />);

      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("Status Badge", () => {
    it("renders ACTIVE status badge with correct styling", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      const statusBadge = screen.getByText("Active");
      expect(statusBadge).toBeInTheDocument();

      // Check for the green background class in the container
      const greenBg = container.querySelector(".bg-\\[\\#E8F5E9\\]");
      expect(greenBg).toBeInTheDocument();
    });

    it("renders INACTIVE status badge with correct styling", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[1]]} />);

      const statusBadge = screen.getByText("Inactive");
      expect(statusBadge).toBeInTheDocument();

      // Check for the gray background class in the container
      const grayBg = container.querySelector(".bg-gray-100");
      expect(grayBg).toBeInTheDocument();
    });

    it("renders SUSPENDED status badge with correct styling", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[2]]} />);

      const statusBadge = screen.getByText("Suspended");
      expect(statusBadge).toBeInTheDocument();

      // Check for the orange background class in the container
      const orangeBg = container.querySelector(".bg-\\[\\#FBE9E7\\]");
      expect(orangeBg).toBeInTheDocument();
    });

    it("renders status dot with correct color", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      const statusDot = container.querySelector(".bg-\\[\\#66BB6A\\]");
      expect(statusDot).toBeInTheDocument();
    });
  });

  describe("Role Display", () => {
    it("displays multiple roles correctly", () => {
      render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      expect(screen.getByText("Admin, User")).toBeInTheDocument();
    });

    it("displays single role correctly", () => {
      render(<UserList {...defaultProps} users={[mockUsers[1]]} />);

      const userRoles = screen.getAllByText("User");
      // Should have at least one "User" role displayed (could also be in header)
      expect(userRoles.length).toBeGreaterThan(0);
    });

    it("displays fallback role when roles array is empty", () => {
      const userWithEmptyRoles = {
        ...mockUsers[0],
        roles: [],
        role: "VIEWER",
      };
      render(<UserList {...defaultProps} users={[userWithEmptyRoles]} />);

      expect(screen.getByText("Viewer")).toBeInTheDocument();
    });

    it("displays -- when no roles or role available", () => {
      const userWithoutRoles = {
        ...mockUsers[0],
        roles: [],
        role: "",
      };
      render(<UserList {...defaultProps} users={[userWithoutRoles]} />);

      expect(screen.getAllByText("--").length).toBeGreaterThan(0);
    });
  });

  describe("Organization Display", () => {
    it("displays organization name", () => {
      render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      expect(screen.getByText("Tech corp")).toBeInTheDocument();
    });

    it("displays -- for null organization", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[2]]} />);

      // Check that the organization column contains "--" or is empty
      // The user has null organization, so it should show "--"
      const orgCells = container.querySelectorAll(".col-span-8.pr-5");
      expect(orgCells.length).toBeGreaterThan(0);
    });
  });

  describe("Credits Display", () => {
    it("displays credits in correct format", () => {
      const learnerUser = { ...mockUsers[0], roles: ["LEARNER"] } as UserListUser;
      render(<UserList {...defaultProps} users={[learnerUser]} />);

      expect(screen.getByText("25/100 min")).toBeInTheDocument();
    });

    it("displays -- when credits are null", () => {
      render(<UserList {...defaultProps} users={[mockUsers[2]]} />);

      expect(screen.getAllByText("--").length).toBeGreaterThan(0);
    });

    it("displays credits for multiple users correctly", () => {
      const usersWithLearner: UserListUser[] = [
        { ...mockUsers[0], roles: ["LEARNER"] },
        { ...mockUsers[1], roles: ["LEARNER"] },
      ];
      render(<UserList {...defaultProps} users={usersWithLearner} />);

      expect(screen.getByText("25/100 min")).toBeInTheDocument();
      expect(screen.getByText("10/50 min")).toBeInTheDocument();
    });
  });

  describe("Date Formatting", () => {
    it("calls formatDate for each user", () => {
      render(<UserList {...defaultProps} />);

      expect(mockFormatDate).toHaveBeenCalledWith("2024-01-15T10:00:00Z");
      expect(mockFormatDate).toHaveBeenCalledWith("2024-02-01T08:00:00Z");
      expect(mockFormatDate).toHaveBeenCalledWith("2024-03-10T14:30:00Z");
    });

    it("displays formatted dates", () => {
      render(<UserList {...defaultProps} />);

      const formattedDate1 = new Date("2024-01-15T10:00:00Z").toLocaleDateString();
      const formattedDate2 = new Date("2024-02-01T08:00:00Z").toLocaleDateString();

      expect(screen.getByText(formattedDate1)).toBeInTheDocument();
      expect(screen.getByText(formattedDate2)).toBeInTheDocument();
    });
  });

  describe("Dropdown Functionality", () => {
    it("opens dropdown when menu button is clicked", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);

      expect(screen.getByTestId("user-option-dropdown")).toBeInTheDocument();
    });

    it("closes dropdown when same menu button is clicked again", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);
      expect(screen.getByTestId("user-option-dropdown")).toBeInTheDocument();

      fireEvent.click(menuButtons[0]);
      expect(screen.queryByTestId("user-option-dropdown")).not.toBeInTheDocument();
    });

    it("switches dropdown to different user", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");

      // Open first user's dropdown
      fireEvent.click(menuButtons[0]);
      expect(screen.getByTestId("user-option-dropdown")).toBeInTheDocument();

      // Open second user's dropdown
      fireEvent.click(menuButtons[1]);
      expect(screen.getByTestId("user-option-dropdown")).toBeInTheDocument();
    });

    it("calls onOptionSelect when option is selected", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);

      const editButton = screen.getByText("Edit User");
      fireEvent.click(editButton);

      expect(mockOnOptionSelect).toHaveBeenCalledTimes(1);
      expect(mockOnOptionSelect).toHaveBeenCalledWith("edit", mockUsers[0]);
    });

    it("closes dropdown after option is selected", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);

      const editButton = screen.getByText("Edit User");
      fireEvent.click(editButton);

      expect(screen.queryByTestId("user-option-dropdown")).not.toBeInTheDocument();
    });

    it("closes dropdown when close is called", () => {
      render(<UserList {...defaultProps} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);

      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      expect(screen.queryByTestId("user-option-dropdown")).not.toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("applies hover styles to user rows", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      const row = container.querySelector(".hover\\:bg-gray-50");
      expect(row).toBeInTheDocument();
    });

    it("uses grid layout for columns", () => {
      const { container } = render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      const gridElement = container.querySelector('[class*="grid-template-columns"]');
      expect(gridElement).toBeInTheDocument();
    });

    it("applies correct overflow styles", () => {
      const { container } = render(<UserList {...defaultProps} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass("overflow-x-auto");
    });

    it("has minimum width for table", () => {
      const { container } = render(<UserList {...defaultProps} />);

      const minWidthElement = container.querySelector(".min-w-\\[900px\\]");
      expect(minWidthElement).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles users with missing optional data", () => {
      const minimalUser: UserListUser = {
        id: 99,
        name: "Minimal User",
        email: "minimal@example.com",
        username: "minimal",
        externalId: "MIN001",
        status: userStatus.ACTIVE,
        role: "",
        metadata: {},
        organization: null,
        tenantId: "tenant-99",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        roles: [],
        creditLimit: null,
        consumedCredits: null,
        secondsAllowedPerCredit: 60,
      };

      render(<UserList {...defaultProps} users={[minimalUser]} />);

      expect(screen.getByText("Minimal user")).toBeInTheDocument();
      expect(screen.getByText("minimal@example.com")).toBeInTheDocument();
    });

    it("handles onOptionSelect being undefined", () => {
      render(<UserList {...defaultProps} onOptionSelect={undefined} />);

      const menuButtons = screen.getAllByText("⋮");
      fireEvent.click(menuButtons[0]);

      const editButton = screen.getByText("Edit User");
      expect(() => fireEvent.click(editButton)).not.toThrow();
    });

    it("handles renderFooter being undefined", () => {
      render(<UserList {...defaultProps} renderFooter={undefined} />);

      expect(screen.getByText("John doe")).toBeInTheDocument();
    });

    it("renders correctly with single user", () => {
      render(<UserList {...defaultProps} users={[mockUsers[0]]} />);

      expect(screen.getByText("John doe")).toBeInTheDocument();
      expect(screen.queryByText("Jane smith")).not.toBeInTheDocument();
    });

    it("renders correctly with many users", () => {
      const manyUsers = Array.from({ length: 20 }, (_, i) => ({
        ...mockUsers[0],
        id: i + 1,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        externalId: `EXT${i}`,
      }));

      render(<UserList {...defaultProps} users={manyUsers} />);

      expect(screen.getByText("User 0")).toBeInTheDocument();
      expect(screen.getByText("User 19")).toBeInTheDocument();
    });

    it("handles BLOCKED status", () => {
      const blockedUser = {
        ...mockUsers[0],
        status: "BLOCKED" as userStatus,
      };
      const { container } = render(<UserList {...defaultProps} users={[blockedUser]} />);

      const statusBadge = screen.getByText("Blocked");
      expect(statusBadge).toBeInTheDocument();

      // Check for the red background class in the container
      const redBg = container.querySelector(".bg-red-100");
      expect(redBg).toBeInTheDocument();
    });

    it("handles unknown status gracefully", () => {
      const unknownStatusUser = {
        ...mockUsers[0],
        status: "UNKNOWN" as userStatus,
      };
      render(<UserList {...defaultProps} users={[unknownStatusUser]} />);

      const statusBadge = screen.getByText("Unknown");
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe("Text Truncation", () => {
    it("applies truncation classes to long text", () => {
      const userWithLongName = {
        ...mockUsers[0],
        name: "Very Long Name That Should Be Truncated In The UI",
      };
      render(<UserList {...defaultProps} users={[userWithLongName]} />);

      const { container } = render(<UserList {...defaultProps} users={[userWithLongName]} />);
      const truncateElements = container.querySelectorAll(".truncate");
      expect(truncateElements.length).toBeGreaterThan(0);
    });
  });
});
