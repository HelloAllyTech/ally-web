import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter } from "react-router-dom";

import NavSideBar from "../NavSideBar";
import { NavSideBarProps } from "../types";

// --- Mocks Setup ---

// Mock useUser hook
const mockUser = {
  id: 123,
  name: "Test User",
  email: "test@example.com",
  role: "standard" as any,
  userId: 123,
  profileImageUrl: "",
};

const mockPermissions = ["VIEW_CALL_LOGS", "VIEW_ANALYTICS_DASHBOARD"];
const mockLogout = vi.fn();

const mockUseUser = vi.fn(() => ({
  user: mockUser,
  permissions: mockPermissions,
  logout: mockLogout,
}));

vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
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
}));

// Mock @assets
vi.mock("@assets", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    Ally: ({ className, ...props }: any) => (
      <svg className={className} {...props} data-testid="ally-logo" />
    ),
    DockToRight: (props: any) => <svg {...props} data-testid="dock-to-right" />,
    LogoutIllustration: (props: any) => <svg data-testid="logout-illustration" {...props} />,
    Carousel1: (props: any) => <svg data-testid="carousel-1" {...props} />,
    Carousel2: (props: any) => <svg data-testid="carousel-2" {...props} />,
    Carousel3: (props: any) => <svg data-testid="carousel-3" {...props} />,
    Carousel4: (props: any) => <svg data-testid="carousel-4" {...props} />,
  };
});

// Mock @mui/icons-material/OpenInNew
vi.mock("@mui/icons-material/OpenInNew", () => ({
  __esModule: true,
  default: ({ className, ...props }: any) => (
    <svg data-testid="open-in-new-icon" className={className} {...props} />
  ),
}));

// Mock @components
vi.mock("@components", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;

  const MockCarousel = vi.fn(({ slides, variant, size }: any) => (
    <div data-testid="mock-carousel" data-variant={variant} data-size={size}>
      Carousel
    </div>
  ));

  const MockConfirmationDialog = vi.fn(
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
  );

  const MockUserInfo = vi.fn(
    ({ user, onLogout, isExpanded, onProfileSettings, profileUrl }: any) => (
      <div data-testid="mock-user-info" data-expanded={isExpanded}>
        <div data-testid="user-name">{user?.name}</div>
        <button data-testid="logout-button" onClick={onLogout}>
          Logout
        </button>
      </div>
    ),
  );

  const MockProfileSettings = vi.fn(
    ({ isOpen, onClose, userData, formMethods, onButtonClick }: any) => {
      if (!isOpen) return null;
      return <div data-testid="mock-profile-settings">Profile Settings</div>;
    },
  );

  return {
    ...original,
    Carousel: MockCarousel,
    ConfirmationDialog: MockConfirmationDialog,
    UserInfo: MockUserInfo,
    ProfileSettings: MockProfileSettings,
    CarouselVariant: {
      LIGHT: "LIGHT",
      DARK: "DARK",
    },
    CarouselSize: {
      SMALL: "SMALL",
      LARGE: "LARGE",
    },
  };
});

// Mock @constants
vi.mock("@constants", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  const TabId = original.TabId as typeof import("@constants").TabId;

  const mockNavBarOptions = [
    {
      id: TabId.CALLS,
      title: "Sessions",
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
      Icon: ({ className, ...props }: any) => (
        <svg className={className} {...props} data-testid="analytics-icon" />
      ),
      path: "/analytics",
      activePages: [],
      permissions: ["VIEW_ANALYTICS_DASHBOARD"],
    },
  ];

  const mockCarouselSlides = [
    { id: 1, content: "Slide 1" },
    { id: 2, content: "Slide 2" },
  ];

  return {
    ...original,
    TabId,
    navBarOptions: mockNavBarOptions,
    CAROUSEL_SLIDES: mockCarouselSlides,
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
}

const mockOnTabChange = vi.fn();
const mockOnClose = vi.fn();

// Import TabId after mocks are set up
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
    vi.clearAllMocks();
    // Reset window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Rendering Tests ---

  it("should render the sidebar container", () => {
    renderComponent();
    const sidebar = screen.getByTestId("nav-sidebar");
    expect(sidebar).toBeInTheDocument();
  });

  it("should render the Ally logo", () => {
    renderComponent();
    expect(screen.getByTestId("ally-logo")).toBeInTheDocument();
  });

  it("should render the DockToRight toggle button", () => {
    renderComponent();
    const toggleButton = screen.getByTitle("Collapse sidebar");
    expect(toggleButton).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-toggle")).toBeInTheDocument();
  });

  it("should render tabs based on permissions", () => {
    renderComponent();
    expect(screen.getByTestId("nav-tab-icon-CALLS")).toBeInTheDocument();
    expect(screen.getByTestId("nav-tab-icon-ANALYTICS")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Statistics")).toBeInTheDocument();
  });

  it("should render UserInfo component", () => {
    renderComponent();
    expect(screen.getByTestId("mock-user-info")).toBeInTheDocument();
    expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");
  });

  it("should render Carousel when sidebar is expanded", () => {
    renderComponent();
    expect(screen.getByTestId("mock-carousel")).toBeInTheDocument();
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
    mockUseUser.mockReturnValueOnce({
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
    mockUseUser.mockReturnValueOnce({
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

  // --- Carousel Props Tests ---

  it("should pass correct props to Carousel component", () => {
    renderComponent();
    const carousel = screen.getByTestId("mock-carousel");
    expect(carousel).toHaveAttribute("data-variant", "DARK");
    expect(carousel).toHaveAttribute("data-size", "SMALL");
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
});
