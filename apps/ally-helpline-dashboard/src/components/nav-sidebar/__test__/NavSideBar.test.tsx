import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

// --- Mocks Setup ---

// Mock useUser hook
const { mockUser, mockPermissions, mockLogout, mockUseUser } = vi.hoisted(() => {
  const user = {
    id: 123,
    name: "Test User",
    email: "test@example.com",
    role: "standard" as any,
    userId: 123,
    profileImageUrl: "",
  };

  const permissions = ["VIEW_CALL_LOGS", "VIEW_ANALYTICS_DASHBOARD"];
  const logout = vi.fn();

  const useUserMock = vi.fn(() => ({
    user,
    permissions,
    logout,
  }));

  return {
    mockUser: user,
    mockPermissions: permissions,
    mockLogout: logout,
    mockUseUser: useUserMock,
  };
});

vi.mock("@hooks", () => ({
  useUser: mockUseUser,
  // Exhaustive mock: NavSideBar reads the streak pill from this hook.
  usePracticeStreakSummary: () => ({ summary: undefined }),
  // Exhaustive mock: NavSideBar gates the Character Library tab on this hook.
  // Not visible by default — the mocked `navBarOptions` below has no
  // CHARACTER_LIBRARY entry anyway, so this only needs to exist, not vary.
  useCanViewCharacterLibrary: () => ({ canView: false, isLoading: false }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock @api
vi.mock("@api", () => ({
  useGetLogoUrlQuery: vi.fn(() => ({ data: null })),
  useUploadProfileImageMutation: vi.fn(() => [vi.fn()]),
  useGetUnreadReviewCountQuery: vi.fn(() => ({ data: { count: 0 } })),
}));

vi.mock("@assets", () => ({
  Ally: ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="ally-logo" />
  ),
  DockToRight: (props: any) => <svg {...props} data-testid="dock-to-right" />,
  RedirectIcon: (props: any) => <svg {...props} data-testid="redirect-icon" />,
  LogoutIllustration: (props: any) => <svg data-testid="logout-illustration" {...props} />,
  WarningTriangle: (props: any) => <svg {...props} data-testid="warning-triangle-icon" />,
}));

vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => children,
  ConfirmationDialog: vi.fn(
    ({ isOpen, onClose, onButtonClick, title, content, buttonText, icon, ...props }: any) => {
      if (!isOpen) return null;
      return (
        <div data-testid="mock-confirmation-dialog" {...props}>
          <div data-testid="dialog-title-normal">{title?.normal}</div>
          <div data-testid="dialog-title-italic">{title?.italic}</div>
          <div data-testid="dialog-content">{content}</div>
          <button data-testid="dialog-close-button" onClick={onClose}>
            Close
          </button>
          <button data-testid="dialog-confirm-button" onClick={onButtonClick}>
            {buttonText}
          </button>
          {icon && <div data-testid="dialog-icon">{icon}</div>}
        </div>
      );
    },
  ),
  UserInfo: vi.fn(({ user, onLogout, isExpanded }: any) => (
    <div data-testid="mock-user-info" data-expanded={isExpanded}>
      <div data-testid="user-name">{user?.name}</div>
      <button data-testid="logout-button" onClick={onLogout}>
        Logout
      </button>
    </div>
  )),
  ProfileSettings: vi.fn(({ isOpen }: any) =>
    isOpen ? <div data-testid="mock-profile-settings">Profile Settings</div> : null,
  ),
  ReportProblemModal: vi.fn(({ open }: any) =>
    open ? <div data-testid="mock-report-problem-modal">Report a problem</div> : null,
  ),
  CarouselVariant: { LIGHT: "LIGHT", DARK: "DARK" },
  CarouselSize: { SMALL: "SMALL", LARGE: "LARGE" },
}));

// Stands in for the real hasAllyAdminAccess (unit-tested against real roles in
// src/constants/__tests__/user.test.ts); here it just lets each test drive the
// Ally Admin tab's visibility.
const mockHasAllyAdminAccess = vi.hoisted(() => vi.fn(() => false));

vi.mock("@constants", () => {
  const TabId = {
    LEARN: "LEARN",
    LEADERBOARD: "LEADERBOARD",
    CALLS: "CALLS",
    ANALYTICS: "ANALYTICS",
    SEARCH: "SEARCH",
    ALLY_ADMIN: "ALLY_ADMIN",
    REPORT_PROBLEM: "REPORT_PROBLEM",
  };
  return {
    TabId,
    hasAllyAdminAccess: mockHasAllyAdminAccess,
    adminAppUrl: "https://admin.example.test",
    TooltipLocation: {
      LEARN_TAB: "learn_tab",
      REVIEW_TAB: "review_tab",
      BADGES_TAB: "badges_tab",
      COMMUNITY_TAB: "community_tab",
      SESSIONS_TAB: "sessions_tab",
      STATISTICS_TAB: "statistics_tab",
      SEARCH_TAB: "search_tab",
      LANGUAGE_SELECTOR: "language_selector",
    },
    TOOLTIP_LIGHT_PROPS: { test: "light-props" },
    navBarOptions: [
      {
        id: TabId.CALLS,
        title: "Sessions",
        key: "nav.tabs.sessions",
        Icon: ({ className, ...props }: any) => (
          <svg className={className} {...props} data-testid="calls-icon" />
        ),
        path: "/calls",
        activePages: [],
        permissions: ["VIEW_CALL_LOGS"],
      },
      {
        id: TabId.ANALYTICS,
        title: "Statistics",
        key: "nav.tabs.statistics",
        Icon: ({ className, ...props }: any) => (
          <svg className={className} {...props} data-testid="analytics-icon" />
        ),
        path: "/analytics",
        activePages: [],
        permissions: ["VIEW_ANALYTICS_DASHBOARD"],
      },
    ],
    CAROUSEL_SLIDES: [
      { id: 1, content: "Slide 1" },
      { id: 2, content: "Slide 2" },
    ],
    Permissions: {
      VIEW_ANALYTICS_DASHBOARD: "view:analytics:dashboard",
      START_MICROPHONE_CHAT: "start:microphone-chat",
      START_CLOUD_TELEPHONY_CHAT: "start:cloud-telephony-chat",
      VIEW_REFERNCE_DOCUMENT: "view:reference-document",
      EDIT_SCENARIO_SESSION: "edit:scenario-session",
      VIEW_SCENARIO_PATHS: "view:scenario-paths",
      VIEW_SCENARIO_PATH: "view:scenario-path",
      EDIT_SCENARIO_PATH: "edit:scenario-path",
      VIEW_CALL_LOGS: "view:call:logs",
      VIEW_CONSOLIDATED_LOGS: "view:call:logs-summary",
      VIEW_SCENARIO_SESSION: "view:scenario-session",
      VIEW_ADMIN_SCENARIO_SESSION: "view:admin:scenario-session",
      VIEW_SCENARIO_SESSION_SUMMARY: "view:scenario-session:summary",
      VIEW_AUDIO_UPLOAD: "view:audio-upload-url",
      DELETE_CHAT: "delete:chat",
      EXPORT_SUMMARY: "export:summary",
      EDIT_CALL_INFO: "edit:call:info",
      EDIT_CALL_DETAILS: "edit:call:details",
      VIEW_SIMULATION_CREDITS: "view:simulation-credits",
      VIEW_CHAT_DETAILS: "view:chat:details",
      VIEW_TRANSCRIPTION: "view:messages",
      VIEW_CHAT_TYPES: "view:settings:chat-types",
      VIEW_SUMMARY_FIELDS: "view:settings:summary-fields",
      VIEW_LEADERBOARD: "view:community:leaderboard",
      VIEW_SIMULATION_REVIEWS: "view:simulation-reviews",
      VIEW_SCRIBE_REVIEWS: "view:scribe-reviews",
      VIEW_SIMULATION_REVIEW: "view:simulation-review",
      VIEW_SCRIBE_REVIEW: "view:scribe-review",
      VIEW_BADGES: "view:user:badges",
      ARCHIVE_CALL_LOG: "archive:call-log",
      ARCHIVE_CHAT: "ARCHIVE_CHAT",
      VIEW_CUSTOM_FIELD_DEFINITIONS: "view:custom-field:definitions",
      MANAGE_CUSTOM_FIELD_DEFINITIONS: "manage:custom-field:definitions",
      EDIT_CUSTOM_FIELD_VALUES: "edit:custom-field:values",
    },
  };
});

// Mock @utils
const mockOpenLinkInNewTab = vi.fn();

vi.mock("@utils", () => ({
  openLinkInNewTab: (url: string) => mockOpenLinkInNewTab(url),
}));

// Mock ButtonVariant
vi.mock("../button", () => ({
  ButtonVariant: {
    DESTRUCTIVE: "destructive",
  },
}));

// --- Test Setup ---

// Define TabId enum locally to match the real one
enum TabId {
  ANALYTICS = "ANALYTICS",
  CALENDER = "CALENDER",
  CALLS = "CALLS",
  LEARN = "LEARN",
  SEARCH = "SEARCH",
  SETTINGS = "SETTINGS",
  STRESS_BUSTERS = "STRESS BUSTERS",
  ALLY_ADMIN = "ALLY_ADMIN",
  REPORT_PROBLEM = "REPORT_PROBLEM",
}

const mockOnTabChange = vi.fn();
const mockOnClose = vi.fn();

// Import component and types after mocks are set up
import NavSideBar from "../NavSideBar";
import { NavSideBarProps } from "../types";

const getDefaultProps = (): NavSideBarProps => {
  return {
    activeTab: TabId.CALLS,
    onTabChange: mockOnTabChange,
    isOpen: false,
    onClose: mockOnClose,
  };
};

const renderComponent = (props: Partial<NavSideBarProps> = {}) => {
  const defaultProps = getDefaultProps();
  return render(
    <BrowserRouter>
      <NavSideBar {...defaultProps} {...props} />
    </BrowserRouter>,
  );
};

describe("NavSideBar", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockNavigate.mockClear();
    mockOnTabChange.mockClear();
    mockOnClose.mockClear();
    mockHasAllyAdminAccess.mockReset();
    mockHasAllyAdminAccess.mockReturnValue(false);
    // Reset window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  // --- Rendering Tests ---

  it("should render the sidebar container", () => {
    renderComponent();
    const sidebar = screen.getByTestId("nav-sidebar");
    expect(sidebar).toBeInTheDocument();
  });

  it("should render the DockToRight toggle button", () => {
    renderComponent();
    const toggleButton = screen.getByTitle("Collapse sidebar");
    expect(toggleButton).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-toggle")).toBeInTheDocument();
  });

  it("should render tabs based on permissions", () => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: ["VIEW_CALL_LOGS", "VIEW_ANALYTICS_DASHBOARD"],
      logout: mockLogout,
    });

    renderComponent();

    // Verify sidebar renders
    expect(screen.getByTestId("nav-sidebar")).toBeInTheDocument();
    // Verify tabs container renders
    expect(screen.getByTestId("nav-sidebar-tabs")).toBeInTheDocument();
  });

  it("should render UserInfo component", () => {
    renderComponent();
    expect(screen.getByTestId("mock-user-info")).toBeInTheDocument();
    expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");
  });

  it("should render overlay when isOpen is true", () => {
    renderComponent({ isOpen: true });
    const overlay = screen.getByTestId("nav-sidebar-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("should not render overlay when isOpen is false", () => {
    renderComponent({ isOpen: false });
    const overlay = screen.queryByTestId("nav-sidebar-overlay");
    expect(overlay).not.toBeInTheDocument();
  });

  // --- Interaction Tests ---

  it("should call onTabChange when a tab is clicked", () => {
    renderComponent({ activeTab: TabId.ANALYTICS });
    const sessionsTab = screen.getByTestId("nav-tab-CALLS");

    fireEvent.click(sessionsTab);
    expect(mockOnTabChange).toHaveBeenCalledWith("/calls");
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should toggle sidebar expansion when toggle button is clicked", async () => {
    renderComponent();
    const toggleButton = screen.getByTitle("Collapse sidebar");

    // Initially expanded
    const sidebar = screen.getByTestId("nav-sidebar");
    expect(sidebar).toHaveClass("w-64");

    fireEvent.click(toggleButton);

    // After toggle, should be collapsed
    await waitFor(() => {
      expect(sidebar).toHaveClass("w-24");
    });

    // Button title should change
    const expandButton = screen.getByTitle("Expand sidebar");
    expect(expandButton).toBeInTheDocument();
  });

  it("should close logout dialog when close button is clicked", async () => {
    renderComponent();
    const logoutButton = screen.getByTestId("logout-button");

    fireEvent.click(logoutButton);
    expect(screen.getByTestId("mock-confirmation-dialog")).toBeInTheDocument();

    const closeButton = screen.getByTestId("dialog-close-button");
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId("mock-confirmation-dialog")).not.toBeInTheDocument();
    });
  });

  it("should call logout and navigate when confirm logout is clicked", () => {
    renderComponent();
    const logoutButton = screen.getByTestId("logout-button");

    fireEvent.click(logoutButton);

    const confirmButton = screen.getByTestId("dialog-confirm-button");
    fireEvent.click(confirmButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should call onClose when overlay is clicked", () => {
    renderComponent({ isOpen: true });
    const overlay = screen.getByTestId("nav-sidebar-overlay");

    fireEvent.click(overlay);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // --- Permission Filtering Tests ---

  it("should filter tabs based on user permissions", () => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: ["VIEW_CALL_LOGS"], // Only one permission
      logout: mockLogout,
    });

    renderComponent();

    // Sessions should render (has VIEW_CALL_LOGS permission)
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    // Statistics should not render (requires VIEW_ANALYTICS_DASHBOARD)
    expect(screen.queryByText("Statistics")).not.toBeInTheDocument();
  });

  // --- Resize Tests ---

  it("should collapse sidebar when window width is less than EXPANDED_WIDTH", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 800,
    });

    renderComponent();

    // Trigger resize event
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      const sidebar = screen.getByTestId("nav-sidebar");
      expect(sidebar).toHaveClass("w-24");
    });
  });

  // --- Styling Tests ---

  it("should apply correct classes when expanded", () => {
    renderComponent();
    const sidebar = screen.getByTestId("nav-sidebar");
    expect(sidebar).toHaveClass("w-64");
  });

  it("should apply correct classes when collapsed", async () => {
    renderComponent();
    const toggleButton = screen.getByTitle("Collapse sidebar");
    fireEvent.click(toggleButton);

    await waitFor(() => {
      const sidebar = screen.getByTestId("nav-sidebar");
      expect(sidebar).toHaveClass("w-24");
    });
  });

  // --- Edge Cases ---

  it("should handle empty permissions array", () => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: [],
      logout: mockLogout,
    });

    renderComponent();
    expect(screen.getByTestId("mock-user-info")).toBeInTheDocument();
    // No tabs should be visible if they all require permissions
    expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
    expect(screen.queryByText("Statistics")).not.toBeInTheDocument();
  });

  it("should handle user being null", () => {
    mockUseUser.mockReturnValueOnce({
      user: null,
      permissions: mockPermissions,
      logout: mockLogout,
    });

    renderComponent();
    expect(screen.getByTestId("mock-user-info")).toBeInTheDocument();
  });

  // --- ConfirmationDialog Props Tests ---

  it("should pass correct props to ConfirmationDialog", () => {
    renderComponent();
    const logoutButton = screen.getByTestId("logout-button");
    fireEvent.click(logoutButton);

    expect(screen.getByTestId("mock-confirmation-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-content")).toHaveTextContent(
      "Are you sure you want to log out? You will need to enter secure OTP to login again.",
    );
    expect(screen.getByTestId("dialog-confirm-button")).toHaveTextContent(
      "Logout & lock my Ally account",
    );
  });

  // --- Report a problem tab ---

  describe("Report a problem tab", () => {
    const reportProblemTab = () => screen.getByTestId(`nav-tab-${TabId.REPORT_PROBLEM}`);

    it("is always visible, in the primary tab list", () => {
      renderComponent();
      expect(reportProblemTab()).toBeInTheDocument();
      expect(screen.getByTestId(`nav-tab-title-${TabId.REPORT_PROBLEM}`)).toHaveTextContent(
        "Report a problem",
      );
    });

    it("opens the modal on click without routing, and dismisses the mobile drawer", () => {
      renderComponent({ isOpen: true });

      fireEvent.click(reportProblemTab());

      expect(mockOnTabChange).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
      expect(screen.getByTestId("mock-report-problem-modal")).toBeInTheDocument();
    });
  });

  // --- Ally Admin external link ---

  describe("Ally Admin link", () => {
    const allyAdminTab = () => screen.queryByTestId(`nav-tab-${TabId.ALLY_ADMIN}`);

    beforeEach(() => {
      // Earlier tests in this file leave mockUseUser pointed at their own
      // return values, so pin it back rather than inheriting whatever ran last.
      mockUseUser.mockReturnValue({
        user: mockUser,
        permissions: mockPermissions,
        logout: mockLogout,
      });
    });

    it("is hidden for an account without admin-console access", () => {
      mockHasAllyAdminAccess.mockReturnValue(false);
      renderComponent();
      expect(allyAdminTab()).not.toBeInTheDocument();
    });

    it("is shown for an account that also has admin-console access", () => {
      mockHasAllyAdminAccess.mockReturnValue(true);
      renderComponent();
      expect(allyAdminTab()).toBeInTheDocument();
      expect(screen.getByTestId(`nav-tab-title-${TabId.ALLY_ADMIN}`)).toHaveTextContent(
        "Ally Admin",
      );
    });

    it("is gated on the logged-in user, not on permissions", () => {
      mockHasAllyAdminAccess.mockReturnValue(true);
      renderComponent();
      expect(mockHasAllyAdminAccess).toHaveBeenCalledWith(mockUser);
    });

    it("renders as an anchor opening the admin console in a new tab", () => {
      mockHasAllyAdminAccess.mockReturnValue(true);
      renderComponent();

      const link = allyAdminTab();
      expect(link?.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "https://admin.example.test");
      expect(link).toHaveAttribute("target", "_blank");
      // Denies the opened tab access to window.opener.
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("does not route in-app when clicked, and dismisses the mobile drawer", () => {
      mockHasAllyAdminAccess.mockReturnValue(true);
      renderComponent({ isOpen: true });

      fireEvent.click(allyAdminTab() as HTMLElement);

      // The anchor navigates; the router must not be involved at all, or the
      // click would also push a bogus in-app route behind the new tab.
      expect(mockOnTabChange).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("still routes in-app for ordinary tabs", () => {
      mockHasAllyAdminAccess.mockReturnValue(true);
      renderComponent();

      fireEvent.click(screen.getByTestId(`nav-tab-${TabId.ANALYTICS}`));

      expect(mockOnTabChange).toHaveBeenCalledWith("/analytics");
      expect(screen.getByTestId(`nav-tab-${TabId.ANALYTICS}`).tagName).toBe("DIV");
    });
  });
});
