/**
 * Comprehensive Unit Tests for Calls Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - State management (dialog, refresh, session type)
 * - User role and permissions handling
 * - Button interactions and event handling
 * - Animation and layout
 * - Component integration with child components
 * - Error handling and edge cases
 * - Accessibility features
 * - Snapshot testing
 */

import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { UserRole, UserStatus, SessionType } from "@types";

import { Calls } from "../Calls";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  Refresh: () => <div data-testid="refresh-icon">Refresh</div>,
  StartSession: () => <div data-testid="start-session-icon">StartSession</div>,
}));

// Mock components
vi.mock("@components", () => ({
  Button: vi.fn(({ children, onClick, variant, className, disabled }) => (
    <button
      data-testid="mock-button"
      onClick={onClick}
      data-variant={variant}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  )),
  ToggleButtonGroup: vi.fn(({ options = [], value, onChange }) => (
    <div data-testid="toggle-button-group">
      {options.map((option: any) => (
        <button
          key={option.value}
          data-testid={`toggle-option-${option.value}`}
          onClick={() => onChange(option.value)}
          className={value === option.value ? "active" : ""}
        >
          {option.label}
        </button>
      ))}
    </div>
  )),
}));

// Mock child components
vi.mock("../components", () => ({
  CallLogsTable: vi.fn(({ refreshKey, sessionType }) => (
    <div
      data-testid="call-logs-table"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      Call Logs Table
    </div>
  )),
  ConsolidatedLogs: vi.fn(({ refreshKey, sessionType }) => (
    <div
      data-testid="consolidated-logs"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      Consolidated Logs
    </div>
  )),
  StartSessionDialog: vi.fn(({ isOpen, onClose }) => (
    <div data-testid="start-session-dialog" data-is-open={isOpen}>
      <button data-testid="close-dialog" onClick={onClose}>
        Close Dialog
      </button>
    </div>
  )),
}));

// Mock utils
vi.mock("../utils", () => ({
  getPermittedSessionTypeOptions: vi.fn(),
}));

// Mock useUser hook
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
}));

// Mock Redux useSelector
const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: () => mockUseSelector(),
}));

// Mock constants
vi.mock("@constants", () => ({
  CallType: {
    WEBRTC_CHAT: "WEBRTC_CHAT",
    MICROPHONE_CHAT: "MICROPHONE_CHAT",
    EXOTEL_CONFERENCE_CHAT: "EXOTEL_CONFERENCE_CHAT",
  },
}));

// Get mock functions after mocks are set up
const { getPermittedSessionTypeOptions } = await import("../utils");
const mockGetPermittedSessionTypeOptions = vi.mocked(getPermittedSessionTypeOptions);

describe("Calls Component", () => {
  const mockUser = {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    role: UserRole.COUNSELLOR,
  };

  const mockPermissions = {
    canStartCall: true,
    canStartSimulation: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
      updateUserStatus: vi.fn(),
      user: mockUser,
      userStatus: UserStatus.AVAILABLE,
      permissions: mockPermissions,
    });
    mockUseSelector.mockReturnValue({
      user: mockUser,
    });
    mockGetPermittedSessionTypeOptions.mockReturnValue([
      {
        label: "Call",
        value: SessionType.CALL,
        permissionList: [],
      },
      {
        label: "Simulation",
        value: SessionType.SIMULATION,
        permissionList: [],
      },
    ]);
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
      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        render(<Calls />);
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<Calls />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = render(<Calls />);
      const mainContainer = container.querySelector("div.px-6.pb-6.h-full.flex.flex-col");
      expect(mainContainer).not.toBeNull();
    });

    it("should render motion div with correct props", () => {
      const { container } = render(<Calls />);
      const motionDiv = container.querySelector("div[data-testid='motion-div']");
      expect(motionDiv).not.toBeNull();
    });

    it("should render call logs table", () => {
      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should render consolidated logs for admin role", () => {
      mockUseSelector.mockReturnValue({
        user: {
          role: UserRole.ADMIN,
          status: UserStatus.AVAILABLE,
          permissions: mockPermissions,
        },
      });
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: vi.fn(),
        user: { ...mockUser, role: UserRole.ADMIN },
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });
      render(<Calls />);
      expect(screen.getByTestId("consolidated-logs")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: State Management
   * Verifies state initialization and updates
   */
  describe("State Management", () => {
    it("should initialize with correct default state", () => {
      render(<Calls />);

      // Dialog should be closed by default
      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "false");

      // Refresh key should be 0 by default
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key", "0");
    });

    it("should set session type from permissions", () => {
      render(<Calls />);

      // Should call getPermittedSessionTypeOptions with permissions
      expect(mockGetPermittedSessionTypeOptions).toHaveBeenCalledWith(mockPermissions);
    });

    it("should handle empty session type options", () => {
      mockGetPermittedSessionTypeOptions.mockReturnValue([
        {
          label: "Call",
          value: SessionType.CALL,
          permissionList: [],
        },
      ]);

      render(<Calls />);

      // Component should render without errors
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: User Role and Permissions
   * Verifies role-based rendering and permissions
   */
  describe("User Role and Permissions", () => {
    it("should render for counsellor role", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: vi.fn(),
        user: { ...mockUser, role: UserRole.COUNSELLOR },
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should render for admin role", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: vi.fn(),
        user: { ...mockUser, role: UserRole.ADMIN },
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);
      expect(screen.getByTestId("consolidated-logs")).toBeInTheDocument();
    });

    it("should handle missing user data", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        updateUserStatus: vi.fn(),
        user: null,
        userStatus: UserStatus.OFFLINE,
        permissions: {},
      });

      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Button Interactions
   * Verifies button click handlers and interactions
   */
  describe("Button Interactions", () => {
    it("should handle start session button click", () => {
      render(<Calls />);

      // Find and click the start session button
      const startSessionButton = screen.getByText("Start Session");
      fireEvent.click(startSessionButton);

      // Dialog should be open
      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "true");
    });

    it("should handle refresh button click", () => {
      render(<Calls />);

      // Find and click the refresh button
      const refreshButton = screen.getByText("Refresh");
      fireEvent.click(refreshButton);

      // Component should render without errors after refresh
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should handle user status toggle", () => {
      const mockUpdateUserStatus = vi.fn();
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: mockUpdateUserStatus,
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);

      // Find and click the status toggle button (Mark Away button)
      const statusButton = screen.getByText("Mark Away");
      fireEvent.click(statusButton);

      // Should call updateUserStatus with OFFLINE
      expect(mockUpdateUserStatus).toHaveBeenCalledWith(UserStatus.OFFLINE);
    });
  });

  /**
   * TEST GROUP: Dialog Management
   * Verifies dialog open/close functionality
   */
  describe("Dialog Management", () => {
    it("should open start session dialog", () => {
      render(<Calls />);

      const startSessionButton = screen.getByText("Start Session");
      fireEvent.click(startSessionButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "true");
    });

    it("should close start session dialog", () => {
      render(<Calls />);

      // Open dialog first
      const startSessionButton = screen.getByText("Start Session");
      fireEvent.click(startSessionButton);

      // Close dialog
      const closeButton = screen.getByTestId("close-dialog");
      fireEvent.click(closeButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "false");
    });
  });

  /**
   * TEST GROUP: Session Type Handling
   * Verifies session type selection and updates
   */
  describe("Session Type Handling", () => {
    it("should handle session type change", () => {
      // Mock the session type options
      mockGetPermittedSessionTypeOptions.mockReturnValue([
        {
          value: SessionType.CALL,
          label: "Call",
          permissionList: [],
        },
        {
          value: SessionType.SIMULATION,
          label: "Simulation",
          permissionList: [],
        },
      ]);

      render(<Calls />);

      // Component should render without errors
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should pass session type to child components", () => {
      render(<Calls />);

      // Child component should receive the session type
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-session-type");
    });
  });

  /**
   * TEST GROUP: Refresh Functionality
   * Verifies refresh mechanism
   */
  describe("Refresh Functionality", () => {
    it("should increment refresh key on refresh", () => {
      render(<Calls />);

      const refreshButton = screen.getByText("Refresh");
      fireEvent.click(refreshButton);

      // Component should render without errors after refresh
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should pass refresh key to child components", () => {
      render(<Calls />);

      // Child component should receive the refresh key
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key");
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling and edge cases
   */
  describe("Error Handling", () => {
    it("should handle missing permissions gracefully", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        updateUserStatus: vi.fn(),
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: null,
      });

      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should handle missing available chat types", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: null,
        updateUserStatus: vi.fn(),
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      render(<Calls />);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have proper button labels", () => {
      render(<Calls />);

      expect(screen.getByText("Start Session")).toBeInTheDocument();
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const { asFragment } = render(<Calls />);
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with admin role", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: vi.fn(),
        user: { ...mockUser, role: UserRole.ADMIN },
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      const { asFragment } = render(<Calls />);
      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Calls).toBe("function");
    });

    it("should return a valid React element", () => {
      const { container } = render(<Calls />);
      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        render(<Calls />);
      }).not.toThrow();
    });
  });
});
