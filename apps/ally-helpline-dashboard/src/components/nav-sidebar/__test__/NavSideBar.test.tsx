import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

// --- Mocks Setup ---

// Mock useUser hook
const { mockUser, mockPermissions, mockLogout, mockUseUser, mockUseCanViewAnalytics } = vi.hoisted(
  () => {
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
    const useCanViewAnalyticsMock = vi.fn(() => ({ canView: true, isGateLoading: false }));

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
      mockUseCanViewAnalytics: useCanViewAnalyticsMock,
    };
  },
);

vi.mock("@hooks", () => ({
  // Exhaustive mock: NavSideBar gates the Progress tab and its level ring on this hook.
  useProgressSummary: () => ({ summary: undefined, canViewProgress: false }),
  useUser: mockUseUser,
  // Exhaustive mock: NavSideBar reads the streak pill from this hook.
  usePracticeStreakSummary: () => ({ summary: undefined }),
  // Exhaustive mock: NavSideBar gates the Character Library tab on this hook.
  // Not visible by default — the mocked `navBarOptions` below has no
  // CHARACTER_LIBRARY entry anyway, so this only needs to exist, not vary.
  useCanViewCharacterLibrary: () => ({ canView: false, isLoading: false }),
  useCanUseTextHelpline: () => ({ canView: false, isLoading: false }),
  // useAnalytics reads the role from the Redux store; this suite renders without one.
  useAnalytics: () => ({ track: vi.fn() }),
  // Exhaustive mock: NavSideBar gates the Statistics tab on this hook, which
  // combines VIEW_ANALYTICS_DASHBOARD with the tenant actually having something
  // to show. Visible by default so the routing tests below still have a tab.
  useCanViewAnalytics: mockUseCanViewAnalytics,
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
  // NavSideBar renders NotificationBell, which reads this. A `vi.mock` factory replaces the
  // WHOLE module, so a hook the sidebar only reaches transitively still has to be listed here
  // or every test in this file dies on render — which is how master went red.
  useGetUnreadNotificationCountQuery: vi.fn(() => ({ data: { count: 0 } })),
}));

vi.mock("@assets", () => ({
  ProgressLadderIcon: () => <svg data-testid="progress-ladder-icon" />,
  Ally: ({ className, ...props }: any) => (
    <svg className={className} {...props} data-testid="ally-logo" />
  ),
  DockToRight: (props: any) => <svg {...props} data-testid="dock-to-right" />,
  RedirectIcon: (props: any) => <svg {...props} data-testid="redirect-icon" />,
  LogoutIllustration: (props: any) => <svg data-testid="logout-illustration" {...props} />,
  ReportProblemNavIcon: (props: any) => <svg {...props} data-testid="report-problem-icon" />,
}));

vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => children,
  ConfirmationDialog: vi.fn(
    ({
      isOpen,
      onClose,
      onButtonClick,
      title,
      content,
      buttonText,
      icon,
      buttonVariant,
      ...props
    }: any) => {
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
          {icon && <div data-testid="dialog-icon">{icon({})}</div>}
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
    ANALYTICS_EVENTS: {
      ACCOUNT_LOGGED_OUT: "user.logged_out",
      PROFILE_UPDATED: "profile.updated",
    },
    ANALYTICS_PROPS: { NAME_CHANGED: "name_changed", IMAGE_CHANGED: "image_changed" },
    hasAllyAdminAccess: mockHasAllyAdminAccess,
    adminAppUrl: "https://admin.example.test",
    LOCAL_STORAGE_KEYS: { NAV_SIDEBAR_PINNED: "navSidebarPinned" },
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

const PINNED_KEY = "navSidebarPinned";

// The desktop rail starts collapsed, where tabs are bare icons. Tests about a
// tab's visible label render it the way a user who pinned it open sees it.
const renderPinned = (props: Partial<NavSideBarProps> = {}) => {
  localStorage.setItem(PINNED_KEY, "true");
  return renderComponent(props);
};

describe("NavSideBar", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockNavigate.mockClear();
    mockOnTabChange.mockClear();
    mockOnClose.mockClear();
    mockHasAllyAdminAccess.mockReset();
    mockHasAllyAdminAccess.mockReturnValue(false);
    mockUseCanViewAnalytics.mockReturnValue({ canView: true, isGateLoading: false });
    localStorage.clear();
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
    const toggleButton = screen.getByTitle("Expand sidebar");
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
    const sidebar = screen.getByTestId("nav-sidebar");

    // Initially collapsed
    expect(sidebar).toHaveClass("w-24");

    fireEvent.click(screen.getByTitle("Expand sidebar"));

    // Pinned open, and the button now collapses it
    await waitFor(() => {
      expect(sidebar).toHaveClass("w-64");
    });
    fireEvent.click(screen.getByTitle("Collapse sidebar"));

    await waitFor(() => {
      expect(sidebar).toHaveClass("w-24");
    });
    expect(screen.getByTitle("Expand sidebar")).toBeInTheDocument();
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
    // useCanViewAnalytics folds the missing VIEW_ANALYTICS_DASHBOARD into its
    // own answer — the tab no longer consults `permissions` directly.
    mockUseCanViewAnalytics.mockReturnValue({ canView: false, isGateLoading: false });

    renderPinned();

    // Sessions should render (has VIEW_CALL_LOGS permission)
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    // Statistics should not render (requires VIEW_ANALYTICS_DASHBOARD)
    expect(screen.queryByText("Statistics")).not.toBeInTheDocument();
  });

  it("hides Statistics when the tenant has no analytics configured", () => {
    // Holds the permission, but the tenant has no dashboard and no native org
    // metrics — the page would render nothing but its empty state, so the tab
    // shouldn't be there to click.
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: ["VIEW_CALL_LOGS", "VIEW_ANALYTICS_DASHBOARD"],
      logout: mockLogout,
    });
    mockUseCanViewAnalytics.mockReturnValue({ canView: false, isGateLoading: false });

    renderPinned();

    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.queryByTestId(`nav-tab-${TabId.ANALYTICS}`)).not.toBeInTheDocument();
  });

  it("shows Statistics when the tenant has analytics to show", () => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: ["VIEW_CALL_LOGS", "VIEW_ANALYTICS_DASHBOARD"],
      logout: mockLogout,
    });
    mockUseCanViewAnalytics.mockReturnValue({ canView: true, isGateLoading: false });

    renderComponent();

    expect(screen.getByTestId(`nav-tab-${TabId.ANALYTICS}`)).toBeInTheDocument();
  });

  // --- Resize Tests ---

  it("starts collapsed at every desktop width, wide screens included", () => {
    renderComponent();
    expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-24");
    expect(screen.getByTestId("nav-sidebar-rail")).toHaveClass("md:w-24");
  });

  it("always opens expanded as the phone drawer, pinned or not", async () => {
    renderComponent();
    expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-24");

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-64");
    });
  });

  // --- Pinning ---

  describe("pinning", () => {
    it("opens pinned when the pin was left on, and the rail reserves full width", () => {
      localStorage.setItem(PINNED_KEY, "true");
      renderComponent();

      expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-64");
      expect(screen.getByTestId("nav-sidebar-rail")).toHaveClass("md:w-64");
      expect(screen.getByTitle("Collapse sidebar")).toBeInTheDocument();
    });

    it("remembers the choice across loads", () => {
      const { unmount } = renderComponent();
      fireEvent.click(screen.getByTitle("Expand sidebar"));
      expect(localStorage.getItem(PINNED_KEY)).toBe("true");
      unmount();

      renderComponent();
      expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-64");
      fireEvent.click(screen.getByTitle("Collapse sidebar"));
      expect(localStorage.getItem(PINNED_KEY)).toBe("false");
    });

    it("still works when storage is unavailable", () => {
      // Throws for the pin's key only: the expanded rail mounts other storage
      // readers (the language selector, when its flag is on) that are not
      // under test here.
      const { getItem: realGet, setItem: realSet } = Storage.prototype;
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (
        this: Storage,
        key: string,
      ) {
        if (key === PINNED_KEY) throw new Error("SecurityError");
        return realGet.call(this, key);
      });
      const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
        this: Storage,
        key: string,
        value: string,
      ) {
        if (key === PINNED_KEY) throw new Error("SecurityError");
        realSet.call(this, key, value);
      });

      try {
        renderComponent();
        expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-24");
        fireEvent.click(screen.getByTitle("Expand sidebar"));
        expect(screen.getByTestId("nav-sidebar")).toHaveClass("w-64");
      } finally {
        getItem.mockRestore();
        setItem.mockRestore();
      }
    });
  });

  // --- Hover to peek ---

  describe("hover to peek", () => {
    const sidebar = () => screen.getByTestId("nav-sidebar");
    const hover = () => fireEvent.pointerEnter(sidebar(), { pointerType: "mouse" });
    const unhover = () => fireEvent.pointerLeave(sidebar(), { pointerType: "mouse" });
    const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

    // jsdom has no PointerEvent, so fireEvent would build a plain Event and drop
    // `pointerType` — leaving the touch case untestable.
    const hadPointerEvent = "PointerEvent" in window;
    beforeAll(() => {
      if (hadPointerEvent) return;
      class PointerEventStub extends MouseEvent {
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerType = init.pointerType ?? "";
        }
      }
      (window as any).PointerEvent = PointerEventStub;
    });

    afterAll(() => {
      if (!hadPointerEvent) delete (window as any).PointerEvent;
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("opens over the page shortly after the cursor arrives, without reserving width", () => {
      renderComponent();
      hover();

      advance(99);
      expect(sidebar()).toHaveClass("w-24");

      advance(1);
      expect(sidebar()).toHaveClass("w-64");
      expect(sidebar()).toHaveAttribute("data-peeking", "true");
      expect(sidebar()).toHaveClass("md:shadow-xl");
      // The page keeps its layout: only the collapsed rail is reserved.
      expect(screen.getByTestId("nav-sidebar-rail")).toHaveClass("md:w-24");
      expect(screen.getByTestId(`nav-tab-title-${TabId.CALLS}`)).toHaveTextContent("Sessions");
    });

    it("doesn't open for a cursor that only passes over it", () => {
      renderComponent();
      hover();
      advance(50);
      unhover();
      advance(500);

      expect(sidebar()).toHaveClass("w-24");
    });

    it("collapses shortly after the cursor leaves, forgiving a brief slip", () => {
      renderComponent();
      hover();
      advance(100);

      unhover();
      advance(100);
      expect(sidebar()).toHaveClass("w-64");
      // Back inside before the grace runs out: stays open.
      hover();
      advance(500);
      expect(sidebar()).toHaveClass("w-64");

      unhover();
      advance(150);
      expect(sidebar()).toHaveClass("w-24");
      expect(sidebar()).toHaveAttribute("data-peeking", "false");
    });

    it("offers to keep it open, and pinning holds it open after the cursor leaves", () => {
      renderComponent();
      hover();
      advance(100);

      fireEvent.click(screen.getByTitle("Keep sidebar open"));
      unhover();
      advance(500);

      expect(sidebar()).toHaveClass("w-64");
      expect(sidebar()).not.toHaveClass("md:shadow-xl");
      expect(screen.getByTestId("nav-sidebar-rail")).toHaveClass("md:w-64");
      expect(localStorage.getItem(PINNED_KEY)).toBe("true");
    });

    it("collapses at once when unpinned, even with the cursor still on it", () => {
      localStorage.setItem(PINNED_KEY, "true");
      renderComponent();
      hover();
      advance(100);

      fireEvent.click(screen.getByTitle("Collapse sidebar"));

      expect(sidebar()).toHaveClass("w-24");
      advance(500);
      expect(sidebar()).toHaveClass("w-24");
    });

    it("ignores touch, which only hovers for the instant of a tap", () => {
      renderComponent();
      fireEvent.pointerEnter(sidebar(), { pointerType: "touch" });
      advance(500);

      expect(sidebar()).toHaveClass("w-24");
    });

    it("opens for keyboard focus at once, but not for focus left by a mouse click", () => {
      const realMatches = Element.prototype.matches;
      let keyboard = false;
      const matches = vi.spyOn(Element.prototype, "matches").mockImplementation(function (
        this: Element,
        selector: string,
      ) {
        return selector === ":focus-visible" ? keyboard : realMatches.call(this, selector);
      });
      renderComponent();
      const tab = screen.getByTestId(`nav-tab-${TabId.CALLS}`);

      // A clicked tab keeps focus; that must not hold the rail open.
      fireEvent.focus(tab);
      advance(500);
      expect(sidebar()).toHaveClass("w-24");
      fireEvent.blur(tab, { relatedTarget: document.body });

      keyboard = true;
      fireEvent.focus(tab);
      advance(0);
      expect(sidebar()).toHaveClass("w-64");

      // Moving between items inside keeps it open; tabbing out closes it.
      fireEvent.blur(tab, { relatedTarget: screen.getByTestId(`nav-tab-${TabId.ANALYTICS}`) });
      advance(500);
      expect(sidebar()).toHaveClass("w-64");
      fireEvent.blur(tab, { relatedTarget: document.body });
      advance(150);
      expect(sidebar()).toHaveClass("w-24");

      matches.mockRestore();
    });

    it("names collapsed tabs for assistive tech, and drops the name once the label shows", () => {
      renderComponent();
      expect(screen.getByTestId(`nav-tab-${TabId.CALLS}`)).toHaveAttribute(
        "aria-label",
        "Sessions",
      );

      hover();
      advance(100);
      expect(screen.getByTestId(`nav-tab-${TabId.CALLS}`)).not.toHaveAttribute("aria-label");
    });
  });

  // --- Edge Cases ---

  it("should handle empty permissions array", () => {
    mockUseUser.mockReturnValue({
      user: mockUser,
      permissions: [],
      logout: mockLogout,
    });
    // Statistics is gated by useCanViewAnalytics rather than the permissions
    // array, so an empty permissions array has to be reflected there too.
    mockUseCanViewAnalytics.mockReturnValue({ canView: false, isGateLoading: false });

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
      renderPinned();
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
      renderPinned();
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
