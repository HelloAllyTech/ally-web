import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import NavbarWrapper from "../components/NavbarWrapper";

// Mock the useUser hook
const mockUseUser = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => mockUseUser(),
}));

// Mock the NavSideBar component
vi.mock("@components", () => ({
  NavSideBar: ({ isOpen, onClose, activeTab, onTabChange }: any) => (
    <div data-testid="nav-sidebar" data-is-open={isOpen}>
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("NavbarWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders without crashing", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithRouter(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders children when user is not present", () => {
    mockUseUser.mockReturnValue({
      user: null,
      checkAuth: vi.fn(),
    });

    renderWithRouter(
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

    renderWithRouter(
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

    renderWithRouter(
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

    renderWithRouter(
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

    renderWithRouter(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    await waitFor(() => {
      expect(mockCheckAuth).not.toHaveBeenCalled();
    });
  });

  it("toggles sidebar when menu button is clicked", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithRouter(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const menuButton = screen
      .getAllByRole("button")
      .find(button => button.className.includes("md:hidden"));
    expect(menuButton).toBeInTheDocument();

    // Initially sidebar should be closed
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "false");

    // Click to open sidebar
    fireEvent.click(menuButton);
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "true");

    // Click to close sidebar
    fireEvent.click(menuButton);
    expect(screen.getByTestId("nav-sidebar")).toHaveAttribute("data-is-open", "false");
  });

  it("handles tab change correctly", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    renderWithRouter(
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

    renderWithRouter(
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

    renderWithRouter(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const menuButton = screen
      .getAllByRole("button")
      .find(button => button.className.includes("md:hidden"));
    expect(menuButton).toHaveClass("md:hidden");
  });

  it("applies correct classes to main content area", () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, name: "Test User" },
      checkAuth: vi.fn(),
    });

    const { container } = renderWithRouter(
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

    const { container } = renderWithRouter(
      <NavbarWrapper>
        <div>Test Content</div>
      </NavbarWrapper>,
    );

    const innerDiv = container.querySelector(".h-\\[100vh\\]");
    expect(innerDiv).toBeInTheDocument();
  });
});
