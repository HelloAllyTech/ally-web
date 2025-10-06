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
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  Refresh: ({ className, onClick }: any) => (
    <div data-testid="refresh-icon" className={className} onClick={onClick}>
      Refresh
    </div>
  ),
  StartSession: () => <div data-testid="start-session-icon">StartSession</div>,
  UploadIcon: () => <div data-testid="upload-icon">Upload</div>,
}));

// Mock components
vi.mock("@components", () => ({
  Button: ({ children, onClick, variant, className, disabled }: any) => (
    <button
      data-testid="mock-button"
      onClick={onClick}
      data-variant={variant}
      className={className}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  ToggleButtonGroup: ({ items = [], value, onValueChange }: any) => (
    <div data-testid="toggle-button-group">
      {items.map((item: any) => (
        <button
          key={item.value}
          data-testid={`toggle-option-${item.value}`}
          onClick={() => onValueChange(item.value)}
          className={value === item.value ? "active" : ""}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
  PermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

// Mock child components
vi.mock("../components", () => ({
  CallLogsTable: ({ refreshKey, sessionType }: any) => (
    <div
      data-testid="call-logs-table"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      Call Logs Table
    </div>
  ),
  ConsolidatedLogs: ({ refreshKey, sessionType }: any) => (
    <div
      data-testid="consolidated-logs"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      Consolidated Logs
    </div>
  ),
  StartSessionDialog: ({ isOpen, onClose }: any) => (
    <div data-testid="start-session-dialog" data-is-open={isOpen}>
      <button data-testid="close-dialog" onClick={onClose}>
        Close Dialog
      </button>
    </div>
  ),
  AudioUploadDialog: ({ isOpen, onClose }: any) => (
    <div data-testid="audio-upload-dialog" data-is-open={isOpen}>
      <button data-testid="close-audio-dialog" onClick={onClose}>
        Close Audio Dialog
      </button>
    </div>
  ),
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

// Mock constants
vi.mock("@constants", () => ({
  CallType: {
    WEBRTC_CHAT: "WEBRTC_CHAT",
    MICROPHONE_CHAT: "MICROPHONE_CHAT",
    EXOTEL_CONFERENCE_CHAT: "EXOTEL_CONFERENCE_CHAT",
  },
  Permissions: {
    VIEW_AUDIO_UPLOAD: "VIEW_AUDIO_UPLOAD",
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

    it("should render call logs table", () => {
      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should render consolidated logs for admin role", () => {
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

    it("should render Session Logs heading", () => {
      render(<Calls />);
      expect(screen.getByText("Session Logs")).toBeInTheDocument();
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

    it("should handle single session type option", () => {
      mockGetPermittedSessionTypeOptions.mockReturnValue([
        {
          label: "Call",
          value: SessionType.CALL,
          permissionList: [],
        },
      ]);

      render(<Calls />);

      // Toggle button group should not be rendered
      expect(screen.queryByTestId("toggle-button-group")).not.toBeInTheDocument();
    });

    it("should render toggle button group with multiple options", () => {
      render(<Calls />);

      // Toggle button group should be rendered
      expect(screen.getByTestId("toggle-button-group")).toBeInTheDocument();
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

    it("should show Start Session button for non-admin with MICROPHONE_CHAT", () => {
      render(<Calls />);
      expect(screen.getByText("Start Session")).toBeInTheDocument();
    });

    it("should not show Start Session button for admin", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: vi.fn(),
        user: { ...mockUser, role: UserRole.ADMIN },
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);
      expect(screen.queryByText("Start Session")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Button Interactions
   * Verifies button click handlers and interactions
   */
  describe("Button Interactions", () => {
    it("should handle start session button click", () => {
      render(<Calls />);

      const startSessionButton = screen.getByText("Start Session");
      fireEvent.click(startSessionButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "true");
    });

    it("should handle refresh button click", () => {
      render(<Calls />);

      const refreshIcon = screen.getByTestId("refresh-icon");
      fireEvent.click(refreshIcon);

      // Refresh key should increment
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key", "1");
    });

    it("should handle user status toggle from AVAILABLE to OFFLINE", () => {
      const mockUpdateUserStatus = vi.fn();
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: mockUpdateUserStatus,
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);

      const statusButton = screen.getByText("Mark Away");
      fireEvent.click(statusButton);

      expect(mockUpdateUserStatus).toHaveBeenCalledWith(UserStatus.OFFLINE);
    });

    it("should handle user status toggle from OFFLINE to AVAILABLE", () => {
      const mockUpdateUserStatus = vi.fn();
      mockUseUser.mockReturnValue({
        availableChatTypes: ["WEBRTC_CHAT", "MICROPHONE_CHAT"],
        updateUserStatus: mockUpdateUserStatus,
        user: mockUser,
        userStatus: UserStatus.OFFLINE,
        permissions: mockPermissions,
      });

      render(<Calls />);

      const statusButton = screen.getByText("Mark Available");
      fireEvent.click(statusButton);

      expect(mockUpdateUserStatus).toHaveBeenCalledWith(UserStatus.AVAILABLE);
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

      const startSessionButton = screen.getByText("Start Session");
      fireEvent.click(startSessionButton);

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
    it("should pass session type to child components", () => {
      render(<Calls />);

      expect(screen.getByTestId("call-logs-table")).toHaveAttribute(
        "data-session-type",
        SessionType.CALL,
      );
    });

    it("should update session type when toggle is clicked", () => {
      render(<Calls />);

      const simulationToggle = screen.getByTestId(`toggle-option-${SessionType.SIMULATION}`);
      fireEvent.click(simulationToggle);

      expect(screen.getByTestId("call-logs-table")).toHaveAttribute(
        "data-session-type",
        SessionType.SIMULATION,
      );
    });
  });

  /**
   * TEST GROUP: Refresh Functionality
   * Verifies refresh mechanism
   */
  describe("Refresh Functionality", () => {
    it("should increment refresh key on refresh", () => {
      render(<Calls />);

      const refreshIcon = screen.getByTestId("refresh-icon");

      // Initial state
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key", "0");

      // First refresh
      fireEvent.click(refreshIcon);
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key", "1");

      // Second refresh
      fireEvent.click(refreshIcon);
      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key", "2");
    });

    it("should pass refresh key to child components", () => {
      render(<Calls />);

      expect(screen.getByTestId("call-logs-table")).toHaveAttribute("data-refresh-key");
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling and edge cases
   */
  describe("Error Handling", () => {
    it("should handle empty permissions", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        updateUserStatus: vi.fn(),
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: {},
      });
      mockGetPermittedSessionTypeOptions.mockReturnValue([]);

      render(<Calls />);
      expect(screen.getByTestId("call-logs-table")).toBeInTheDocument();
    });

    it("should handle null user", () => {
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

    it("should handle empty available chat types", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        updateUserStatus: vi.fn(),
        user: mockUser,
        userStatus: UserStatus.AVAILABLE,
        permissions: mockPermissions,
      });

      render(<Calls />);
      expect(screen.queryByText("Start Session")).not.toBeInTheDocument();
      expect(screen.queryByText("Mark Away")).not.toBeInTheDocument();
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
