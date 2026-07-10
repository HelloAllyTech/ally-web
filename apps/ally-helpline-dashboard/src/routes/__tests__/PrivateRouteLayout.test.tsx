import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { UserRole } from "@types";

import PrivateRouteLayout from "../PrivateRouteLayout";

// Mock the useUser hook
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
  useAutoActiveCallRedirect: vi.fn(),
  useAchievementBadgeModal: () => ({
    currentBadge: null,
    closeModal: vi.fn(),
    resetModal: vi.fn(),
    BadgeModal: null,
    isLoading: false,
  }),
}));

// Mock the useGetChatTypesQuery hook
const mockUseGetChatTypesQuery = vi.fn();
vi.mock("@api", () => ({
  useGetChatTypesQuery: () => mockUseGetChatTypesQuery(),
}));

// Mock assets
vi.mock("@assets", () => ({
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
}));

// Mock the pages
vi.mock("@pages", () => ({
  Calls: () => <div data-testid="calls-page">Calls Page</div>,
  Archives: () => <div data-testid="archives-page">Archives Page</div>,
  Analytics: () => <div data-testid="analytics-page">Analytics Page</div>,
  AudioCall: () => <div data-testid="audio-call-page">Audio Call Page</div>,
  PostCallSummary: () => <div data-testid="post-call-summary-page">Post Call Summary Page</div>,
  Search: () => <div data-testid="search-page">Search Page</div>,
  StressBuster: () => <div data-testid="stress-buster-page">Stress Buster Page</div>,
  Simulation: () => <div data-testid="simulation-page">Simulation Page</div>,
  PostSimulationSummary: () => (
    <div data-testid="post-simulation-summary-page">Post Simulation Summary Page</div>
  ),
  Leaderboard: () => <div data-testid="leaderboard-page">Leaderboard Page</div>,
  Review: () => <div data-testid="review-page">Review Page</div>,
  AchievementsViewAll: () => (
    <div data-testid="achievements-view-all-page">Achievements View All Page</div>
  ),
  OrganizationSettings: () => (
    <div data-testid="organization-settings-page">Organization Settings Page</div>
  ),
}));

// Mock the reducer actions
vi.mock("@reducer", () => ({
  setAvailableChatTypes: (types: any[]) => ({ type: "SET_AVAILABLE_CHAT_TYPES", payload: types }),
  unauthenticate: () => ({ type: "UNAUTHENTICATE" }),
}));

// Mock the store
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
  },
}));

// Mock the components
vi.mock("../components", () => ({
  NavbarWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navbar-wrapper">{children}</div>
  ),
  PermissionGuardedRoute: ({ element }: { element: React.ReactNode }) => element,
}));

// Mock constants
vi.mock("@constants", () => ({
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "access_token",
    REFRESH_TOKEN: "refresh_token",
  },
  AUTH_RETRY_CONFIG: {
    MAX_ATTEMPTS: 3,
    RETRY_DELAY_MS: 0,
  },
  Permissions: {
    VIEW_SCENARIO_SESSION: "view:scenario-session",
    VIEW_ADMIN_SCENARIO_SESSION: "view:admin:scenario-session",
    VIEW_SCENARIO_SESSION_SUMMARY: "view:scenario-session:summary",
    START_MICROPHONE_CHAT: "start:microphone-chat",
    START_CLOUD_TELEPHONY_CHAT: "start:cloud-telephony-chat",
    VIEW_CHAT_TYPES: "view:settings:chat-types",
  },
  CALL_PERMISSIONS: ["start:cloud-telephony-chat", "start:microphone-chat"],
  ROUTES: {
    LOGIN: "/login",
    ANALYTICS: "/analytics",
    LEARN: "/learn",
    SCRIBE_LOGS: "/scribe-logs",
    ROLEPLAY_LOGS: "/roleplay-logs",
    ARCHIVES: "/archives",
    HOME: "/",
    AUDIO_CALL: "/audio-call",
    STRESS_BUSTER: "/stress-buster",
    SUMMARY: "/summary/:chatId",
    SEARCH: "/search",
    SIMULATION: "/simulation/:id",
    SIMULATION_SUMMARY_FULL: "/simulation-summary/:sessionId",
    REVIEW: "/review",
  },
  TAG_TYPES: {
    REVIEW: "REVIEW",
  },
}));

// Mock types
vi.mock("@types", () => ({
  UserRole: {
    ADMIN: "ADMIN",
    COUNSELLOR: "COUNSELOR",
    LEARNER: "LEARNER",
  },
  SessionType: {
    CALL: "call",
    SIMULATION: "simulation",
  },
  PracticeStreakGroupBy: {
    DAY: "DAY",
    WEEK: "WEEK",
    MONTH: "MONTH",
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock logger and feature flags
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
  },
}));

// Mock utils
vi.mock("@utils", () => ({
  hasAnalyticsPermission: vi.fn((permissions: any[]) => true),
  hasCallPermission: vi.fn((permissions: any[]) => true),
  hasScribeLogsPermission: vi.fn((permissions: any[]) => true),
  hasRoleplayLogsPermission: vi.fn((permissions: any[]) => false),
  hasLearnPermission: vi.fn((permissions: any[]) => false),
  hasPermissions: (permissions: any[], requiredPermission: any) => {
    if (!permissions || !Array.isArray(permissions)) {
      return false;
    }
    return permissions.some(permission => permission === requiredPermission);
  },
  isPathExcluded: vi.fn((currentPath: string, excludedPaths: string[]) => {
    return excludedPaths.includes(currentPath);
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("PrivateRouteLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it("renders without crashing", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.ADMIN }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [{ id: 1, name: "Chat Type 1" }],
    });

    renderWithRouter(<PrivateRouteLayout />);
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("returns empty fragment when user is not present", async () => {
    mockUseUser.mockReturnValue({
      user: null,
      checkAuth: vi.fn().mockResolvedValue(null),
      permissions: [],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    const { container } = renderWithRouter(<PrivateRouteLayout />);
    expect(container.firstChild).toBeNull();

    // Wait for verifyAuth's retry chain to settle before teardown, otherwise
    // it touches localStorage after jsdom is gone.
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("handles chat types when available", async () => {
    const chatTypes = [{ id: 1, name: "Chat Type 1" }];

    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.ADMIN }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: chatTypes,
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render without errors
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("handles authentication failure gracefully", async () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: vi.fn().mockResolvedValue(null),
      permissions: [],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render without crashing even on auth failure
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("renders for ADMIN role", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.ADMIN }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render the navbar wrapper
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("renders for LEARNER role", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.LEARNER },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.LEARNER }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render the navbar wrapper
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("renders for COUNSELLOR role", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.COUNSELLOR },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.COUNSELLOR }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render the navbar wrapper
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("renders all private routes", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: vi.fn().mockResolvedValue({ id: 1, role: UserRole.ADMIN }),
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should have navbar wrapper
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();
  });

  it("handles authentication retry logic", async () => {
    const mockCheckAuth = vi.fn().mockResolvedValue({ id: 1, role: UserRole.ADMIN });

    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: mockCheckAuth,
      permissions: ["view:settings:chat-types"],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should call checkAuth
    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it("handles authentication errors gracefully", async () => {
    const mockCheckAuth = vi.fn().mockRejectedValue(new Error("Network error"));

    mockUseUser.mockReturnValue({
      user: { id: 1, role: UserRole.ADMIN },
      checkAuth: mockCheckAuth,
      permissions: [],
    });

    mockUseGetChatTypesQuery.mockReturnValue({
      data: [],
    });

    renderWithRouter(<PrivateRouteLayout />);

    // Should render without crashing even on auth errors
    expect(screen.getByTestId("navbar-wrapper")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
