import React from "react"; // Import React for component typing

import { configureStore } from "@reduxjs/toolkit"; // For mock store
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux"; // For Redux context
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { isPathExcluded } from "@utils"; // 💡 Import isPathExcluded for mocking

import NavbarWrapper from "../components/NavbarWrapper";

// Mock the useUser hook
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
  useAchievementBadgeModal: () => ({
    currentBadge: null,
    closeModal: vi.fn(),
    resetModal: vi.fn(),
    BadgeModal: null,
    isLoading: false,
  }),
}));

// Mock the NavSideBar component
vi.mock("@components", () => ({
  NavSideBar: ({ isOpen, onClose, activeTab, onTabChange }: any) => (
    <div data-testid="nav-sidebar" data-is-open={isOpen.toString()}>
      {" "}
      {/* Convert boolean to string */}
      <button onClick={onClose} data-testid="close-sidebar">
        Close
      </button>
      <div data-testid="active-tab">{activeTab}</div>
      <button onClick={() => onTabChange("/test-path")} data-testid="tab-change">
        Change Tab
      </button>
    </div>
  ),
}));

// Mock constants
vi.mock("@constants", () => ({
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "access_token",
  },
  excludeNavBar: ["/audio-call", "/summary", "/stress-buster"],
  navBarOptions: [
    {
      id: "calls",
      path: "/calls",
      activePages: ["/calls"],
    },
    {
      id: "analytics",
      path: "/analytics",
      activePages: ["/analytics"],
    },
  ],
  TabId: {
    CALLS: "calls",
    ANALYTICS: "analytics",
  },
  // 💡 FIX 1: Add the missing Permissions export
  Permissions: {
    VIEW_CALL_LOGS: "VIEW_CALL_LOGS",
    VIEW_ANALYTICS_DASHBOARD: "VIEW_ANALYTICS_DASHBOARD",
  },
}));

// Mock utils
vi.mock("@utils", () => ({
  isPathExcluded: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockLocation = { pathname: "/calls" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock the UploadProgressDialog to avoid complex Redux logic in its own file
vi.mock("../components/UploadProgressDialog", () => ({
  default: () => <div data-testid="upload-progress-dialog" />,
}));

// ----------------------------------------------------------------------
// 💡 FIX 2: Redux Mock Setup for the Global Wrapper
// ----------------------------------------------------------------------

// 1. Create a minimal mock store that satisfies the required structure (s.calls.audioUpload)
const createMockStore = (initialState: any = {}) => {
  return configureStore({
    reducer: {
      calls: (state = { audioUpload: [] }, action) => state,
    } as any,
    preloadedState: initialState,
  });
};

// 2. Update the rendering utility to include Redux Provider
const renderWithProviders = (
  component: React.ReactElement,
  // Initial state should include the 'calls' slice to satisfy UploadProgressDialog
  initialState: any = { calls: { audioUpload: [] } },
) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>,
  );
};

// ----------------------------------------------------------------------

describe("NavbarWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // 💡 FIX 3: Set default mock value for isPathExcluded
    // Assumes most paths are NOT excluded, so navbar should show if user is present.
    vi.mocked(isPathExcluded).mockReturnValue(false);
  });

  // NOTE: Swapped renderWithRouter with renderWithProviders in all tests

  it("renders without crashing", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(screen.getByTestId("upload-progress-dialog")).toBeInTheDocument();
  });

  it("renders children when user is not present", () => {
    mockUseUser.mockReturnValue({
      user: null,
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div data-testid="test-content">Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.getByTestId("test-content")).toBeInTheDocument();
    expect(screen.queryByTestId("nav-sidebar")).not.toBeInTheDocument();
  });

  it("renders NavSideBar when user is present", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.getByTestId("nav-sidebar")).toBeInTheDocument();
  });

  it("does not render NavSideBar when user is not present", () => {
    mockUseUser.mockReturnValue({
      user: null,
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.queryByTestId("nav-sidebar")).not.toBeInTheDocument();
  });

  // Test for excluded path (using the now-mocked isPathExcluded utility)
  it("does not render NavSideBar when path is excluded", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });
    // Override mock to return true (path is excluded)
    vi.mocked(isPathExcluded).mockReturnValue(true);

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.queryByTestId("nav-sidebar")).not.toBeInTheDocument();
  });

  it("calls checkAuth when access token is present", async () => {
    const mockCheckAuth = vi.fn();
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: mockCheckAuth,
    });

    localStorage.setItem("access_token", "test-token");

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it("does not call checkAuth when access token is not present", async () => {
    const mockCheckAuth = vi.fn();
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: mockCheckAuth,
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    // Wait slightly to ensure useEffect had time to run (or not run)
    await waitFor(
      () => {
        expect(mockCheckAuth).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("toggles sidebar when menu button is clicked", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const menuButton = screen.getByTestId("nav-sidebar-hamburger");
    expect(menuButton).toBeInTheDocument();

    // Initially sidebar should be closed
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "false");

    // Click to open sidebar
    fireEvent.click(menuButton!);
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "true");

    // Click to close sidebar
    fireEvent.click(menuButton!);
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "false");
  });

  it("handles tab change correctly", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const tabChangeButton = screen.getByTestId("tab-change");
    fireEvent.click(tabChangeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/test-path");
  });

  it("sets correct active tab based on pathname", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    // Should show the active tab (calls based on pathname /calls)
    expect(screen.getByTestId("active-tab")).toHaveTextContent("calls");
  });

  it("renders menu button only on mobile", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const menuButton = screen.getByTestId("nav-sidebar-hamburger");
    expect(menuButton.parentElement).toHaveClass("md:hidden");
  });

  it("applies correct classes to main content area", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    const { container } = renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const mainContent = container.querySelector(
      ".flex-1.min-h-screen.overflow-auto.bg-white.custom-scrollbar",
    );
    expect(mainContent).toBeInTheDocument();
  });

  it("applies height constraint when navbar is shown", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    const { container } = renderWithProviders(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const innerDiv = container.querySelector(".h-\\[calc\\(100vh-56px\\)\\]");
    expect(innerDiv).toBeInTheDocument();
  });
});
