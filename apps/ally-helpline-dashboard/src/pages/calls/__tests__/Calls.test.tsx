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
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SessionType, UserRole } from "@types";

import { Calls } from "../Calls";

// Mock feature flags
vi.mock("@ally-ui-mono/ui-shared/featureFlag", () => ({
  FEATURE_FLAGS_MAP: {
    LANGUAGE_CAPABILITY_FLAG: false,
  },
}));

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
  Archive: () => <div data-testid="archive-icon">Archive</div>,
  MoreVertIcon: () => <div data-testid="more-vert-icon">MoreVert</div>,
}));

// Mock components
vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => <>{children}</>,
  Button: ({ children, ...props }: any) => (
    <button data-testid="mock-button" {...props}>
      {children}
    </button>
  ),
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    DESTRUCTIVE: "destructive",
    ICON: "icon",
    TEXT: "text",
  },
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
  PermissionGuard: ({ children, requiredPermissions }: any) => {
    const userData = mockUseUser();
    const permissions = userData?.permissions || [];
    const hasAccess = requiredPermissions.every(
      (permission: string) =>
        permissions && Array.isArray(permissions) && permissions.includes(permission),
    );
    return hasAccess ? children : null;
  },
  CustomMenu: ({ anchorElement, items, onClose }: any) => (
    <div data-testid="custom-menu" style={{ display: anchorElement ? "block" : "none" }}>
      {items?.map((item: any, index: number) => (
        <button
          key={index}
          data-testid={`custom-menu-item-${index}`}
          onClick={() => {
            item.onClick?.();
            onClose?.();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
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
  UserLogsTable: ({ refreshKey, sessionType }: any) => (
    <div
      data-testid="user-logs-table"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      User Logs Table
    </div>
  ),
  AdminLogsTable: ({ refreshKey, sessionType }: any) => (
    <div
      data-testid="admin-logs-table"
      data-refresh-key={refreshKey}
      data-session-type={sessionType}
    >
      Admin Logs Table
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
  CreateNoteDrawer: ({ open, onClose }: any) => (
    <div data-testid="create-note-drawer" data-is-open={open}>
      <button data-testid="close-note-drawer" onClick={onClose}>
        Close Note Drawer
      </button>
    </div>
  ),
}));

// Mock utils
vi.mock("../utils", () => ({
  getPermittedSessionLogList: vi.fn(),
  getFormattedSupportedSessionUserGroups: vi.fn(),
  getSupportedSessionTypeListByUserGroup: vi.fn(),
}));

// Mock useUser hook
const mockUseUser = vi.fn();
const mockUseScribeNoteCreationEnabled = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
  useScribeNoteCreationEnabled: () => mockUseScribeNoteCreationEnabled(),
}));

// Mock constants
vi.mock("@constants", () => ({
  CallType: {
    MICROPHONE_CHAT: "MICROPHONE_CHAT",
    EXOTEL_CONFERENCE_CHAT: "EXOTEL_CONFERENCE_CHAT",
  },
  Permissions: {
    START_MICROPHONE_CHAT: "start:microphone-chat",
    VIEW_AUDIO_UPLOAD: "view:audio-upload-url",
    COUNSELOR_ACCESS: "counselor:access",
  },
  TooltipLocation: {
    START_SESSION_BUTTON: "start_session_button",
    UPLOAD_AUDIO_BUTTON: "upload_audio_button",
  },
}));

// Get mock functions after mocks are set up

// Helper function to render Calls component with Router
const renderCalls = (props = {}) => {
  return render(
    <BrowserRouter>
      <Calls sessionType={SessionType.CALL} {...props} />
    </BrowserRouter>,
  );
};

describe("Calls Component", () => {
  const mockUser = {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    role: UserRole.COUNSELLOR,
  };

  const mockPermissions = ["start:microphone-chat", "view:audio-upload-url"];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUser.mockReturnValue({
      availableChatTypes: ["MICROPHONE_CHAT"],
      user: mockUser,
      permissions: mockPermissions,
    });
    // Tenant toggle OFF by default; individual tests opt in.
    mockUseScribeNoteCreationEnabled.mockReturnValue({ data: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  /**
   * TEST GROUP: Create Note gating
   * Button + drawer require the counsellor permission AND the tenant toggle.
   */
  describe("Create Note gating", () => {
    const counsellorPermissions = ["counselor:access"];

    it("shows the Create Note button and drawer for a counsellor when the tenant toggle is ON", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: mockUser,
        permissions: counsellorPermissions,
      });
      mockUseScribeNoteCreationEnabled.mockReturnValue({ data: true });

      renderCalls();

      expect(screen.getByTestId("calls-create-note-button")).toBeInTheDocument();
      expect(screen.getByTestId("create-note-drawer")).toBeInTheDocument();
    });

    it("hides Create Note for a counsellor when the tenant toggle is OFF", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: mockUser,
        permissions: counsellorPermissions,
      });
      mockUseScribeNoteCreationEnabled.mockReturnValue({ data: false });

      renderCalls();

      expect(screen.queryByTestId("calls-create-note-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("create-note-drawer")).not.toBeInTheDocument();
    });

    it("hides Create Note for a non-counsellor even when the tenant toggle is ON", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: { ...mockUser, role: UserRole.ADMIN },
        permissions: ["view:audio-upload-url"],
      });
      mockUseScribeNoteCreationEnabled.mockReturnValue({ data: true });

      renderCalls();

      expect(screen.queryByTestId("calls-create-note-button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("create-note-drawer")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      renderCalls();
      expect(screen.getByTestId("user-logs-table")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => {
        renderCalls();
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = renderCalls();
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Structure
   * Verifies the overall structure and main sections of the component
   */
  describe("Component Structure", () => {
    it("should render main container with correct classes", () => {
      const { container } = renderCalls();
      const mainContainer = container.querySelector("div.px-6.pb-6.h-full.flex.flex-col");
      expect(mainContainer).not.toBeNull();
    });

    it("should render call logs table", () => {
      renderCalls();
      expect(screen.getByTestId("user-logs-table")).toBeInTheDocument();
    });

    it("should render Scribe Logs heading", () => {
      renderCalls();
      expect(screen.getByText("Scribe Logs")).toBeInTheDocument();
    });

    it("should render Roleplay Logs heading on the roleplay page", () => {
      renderCalls({ sessionType: SessionType.SIMULATION });
      expect(screen.getByText("Roleplay Logs")).toBeInTheDocument();
    });

    it("should not show scribe action buttons on the roleplay page", () => {
      renderCalls({ sessionType: SessionType.SIMULATION });
      expect(screen.queryByText("Start Scribe Mode")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: State Management
   * Verifies state initialization and updates
   */
  describe("State Management", () => {
    it("should initialize with correct default state", () => {
      renderCalls();

      // Dialog should be closed by default
      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "false");

      // Refresh key should be 0 by default
      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key", "0");
    });
  });

  /**
   * TEST GROUP: User Role and Permissions
   * Verifies role-based rendering and permissions
   */
  describe("User Role and Permissions", () => {
    it("should render for counsellor role", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: { ...mockUser, role: UserRole.COUNSELLOR },
        permissions: mockPermissions,
      });

      renderCalls();
      expect(screen.getByTestId("user-logs-table")).toBeInTheDocument();
    });

    it("should show Start Session button for non-admin with MICROPHONE_CHAT", () => {
      renderCalls();
      expect(screen.getByText("Start Scribe Mode")).toBeInTheDocument();
    });

    it("should not show Start Session button for admin", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: { ...mockUser, role: UserRole.ADMIN },
        permissions: [], // Admin users don't have START_MICROPHONE_CHAT permission
      });

      renderCalls();
      expect(screen.queryByText("Start Scribe Mode")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Create Note Button
   * The "Start Dictation Mode" button renders only for counsellors when the tenant
   * toggle is on.
   */
  describe("Create Note Button", () => {
    it("does not show the Create Note button when the tenant toggle is off", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: mockUser,
        permissions: ["counselor:access"],
      });
      mockUseScribeNoteCreationEnabled.mockReturnValue({ data: false });

      renderCalls();
      expect(screen.queryByText("Start Dictation Mode")).not.toBeInTheDocument();
    });

    it("shows the Create Note button for a counsellor when the tenant toggle is on", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: mockUser,
        permissions: ["counselor:access"],
      });
      mockUseScribeNoteCreationEnabled.mockReturnValue({ data: true });

      renderCalls();
      expect(screen.getByText("Start Dictation Mode")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Button Interactions
   * Verifies button click handlers and interactions
   */
  describe("Button Interactions", () => {
    it("should handle start session button click", () => {
      renderCalls();

      const startSessionButton = screen.getByText("Start Scribe Mode");
      fireEvent.click(startSessionButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "true");
    });

    it("should handle refresh button click", () => {
      renderCalls();

      const refreshIcon = screen.getByTestId("refresh-icon");
      fireEvent.click(refreshIcon);

      // Refresh key should increment
      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key", "1");
    });
  });

  /**
   * TEST GROUP: Dialog Management
   * Verifies dialog open/close functionality
   */
  describe("Dialog Management", () => {
    it("should open start session dialog", () => {
      renderCalls();

      const startSessionButton = screen.getByText("Start Scribe Mode");
      fireEvent.click(startSessionButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "true");
    });

    it("should close start session dialog", () => {
      renderCalls();

      const startSessionButton = screen.getByText("Start Scribe Mode");
      fireEvent.click(startSessionButton);

      const closeButton = screen.getByTestId("close-dialog");
      fireEvent.click(closeButton);

      expect(screen.getByTestId("start-session-dialog")).toHaveAttribute("data-is-open", "false");
    });
  });

  /**
   * TEST GROUP: Refresh Functionality
   * Verifies refresh mechanism
   */
  describe("Refresh Functionality", () => {
    it("should increment refresh key on refresh", () => {
      renderCalls();

      const refreshIcon = screen.getByTestId("refresh-icon");

      // Initial state
      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key", "0");

      // First refresh
      fireEvent.click(refreshIcon);
      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key", "1");

      // Second refresh
      fireEvent.click(refreshIcon);
      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key", "2");
    });

    it("should pass refresh key to child components", () => {
      renderCalls();

      expect(screen.getByTestId("user-logs-table")).toHaveAttribute("data-refresh-key");
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
        permissions: {},
      });

      renderCalls();
      expect(screen.getByTestId("user-logs-table")).toBeInTheDocument();
    });

    it("should handle null user", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        user: null,
        permissions: {},
      });

      renderCalls();
      expect(screen.getByTestId("user-logs-table")).toBeInTheDocument();
    });

    it("should handle empty available chat types", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: [],
        user: mockUser,
        permissions: ["edit:summary"], // No permissions when no available chat types
      });

      renderCalls();
      expect(screen.queryByText("Start Scribe Mode")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper button roles", () => {
      renderCalls();

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have proper button labels", () => {
      renderCalls();

      expect(screen.getByText("Start Scribe Mode")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const { asFragment } = renderCalls();
      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with admin role", () => {
      mockUseUser.mockReturnValue({
        availableChatTypes: ["MICROPHONE_CHAT"],
        user: { ...mockUser, role: UserRole.ADMIN },
        permissions: mockPermissions,
      });

      const { asFragment } = renderCalls();
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
      const { container } = renderCalls();
      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => {
        renderCalls();
      }).not.toThrow();
    });
  });
});
