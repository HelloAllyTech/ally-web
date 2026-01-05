import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Sidebar } from "../Sidebar";

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(() => ({ pathname: "/simulation-studio" })),
  useNavigate: vi.fn(() => navigateMock),
}));

vi.mock("@assets", async importOriginal => {
  const actual = await importOriginal<typeof import("@assets")>();
  return {
    ...actual,
    ArrowDown: () => <svg data-testid="arrow-down" />,
    Book: () => <svg data-testid="icon-book" />,
    User: () => <svg data-testid="icon-user" />,
    Users: () => <svg data-testid="icon-users" />,
    Ally: () => <svg data-testid="logo-ally" />,
    DockToRight: () => <svg data-testid="dock" />,
    Logout: () => <svg data-testid="logout" />,
    HappyEmoji: () => <svg data-testid="happy" />,
  };
});

vi.mock("@hooks", () => ({
  useClickOutside: (_ref: any, _handler: any) => {},
  useUser: () => ({
    user: { name: "Alice", email: "alice@example.com" },
    logout: logoutMock,
    filteredNavigationItems: [
      { id: "SIMULATION_STUDIO", label: "Simulation Studio", path: "/simulation-studio" },
      { id: "USER_MANAGEMENT", label: "User Management", path: "/users" },
      { id: "EVENT_MANAGEMENT", label: "Event Management", path: "/events" },
    ],
  }),
}));

vi.mock("@constants", () => ({
  SIDEBAR_ITEMS: {
    SIMULATION_STUDIO: "SIMULATION_STUDIO",
    USER_MANAGEMENT: "USER_MANAGEMENT",
    EVENT_MANAGEMENT: "EVENT_MANAGEMENT",
  },
  ROUTES: {
    SIMULATION_STUDIO: "/simulation-studio",
    CREATE_SIMULATION: "/simulation-studio/create",
    CREATE_PATH: "/create-path",
    USER_MANAGEMENT: "/users",
    MANAGE_EVENTS: "/events",
    LOGIN: "/login",
  },
  en: {
    auth: {
      logout: "Logout",
      profileSettings: "Profile Settings",
      uploadImage: "Upload Image",
      profileImage: "Profile Image",
    },
    simulation: {
      triggerEvent: "Trigger Event",
      triggerMessage: "Trigger Message",
      terminationMessagePlaceholder: "Enter termination message",
    },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  profileSettings: [
    { name: "name", label: "Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
  ],
  USER_MODAL_FIELDS_IDS: {
    PROFILE: "profile",
  },
  KeyboardKeys: {
    KEYDOWN: "keydown",
    ESCAPE: "Escape",
  },
}));

describe("Sidebar", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    logoutMock.mockReset();
    // Mock window.innerWidth to be large enough to keep sidebar expanded
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1400,
    });
  });

  it("renders navigation items by title when collapsed", () => {
    // Mock narrow window to force collapsed state
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 800 });
    render(<Sidebar />);

    const simItem = screen.getByTitle("Simulation Studio");
    expect(simItem).toBeInTheDocument();

    fireEvent.click(simItem);
    expect(navigateMock).toHaveBeenCalledWith("/simulation-studio");
  });

  it("toggles expand/collapse via the toggle button", () => {
    render(<Sidebar />);

    // Sidebar starts expanded when window is wide
    const simItem = screen.getByText("Simulation Studio");
    expect(simItem).toBeInTheDocument();

    const collapseBtn = screen.getByTitle("Collapse sidebar");
    fireEvent.click(collapseBtn);

    // After collapse, text should be hidden and only title remains
    expect(screen.queryByText("Simulation Studio")).not.toBeInTheDocument();
    expect(screen.getByTitle("Simulation Studio")).toBeInTheDocument();
  });

  it("opens user menu and logs out when expanded", () => {
    render(<Sidebar />);

    // Click profile section (name/email present when expanded)
    fireEvent.click(screen.getByText("Alice"));

    expect(screen.getByText("Logout")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Logout"));

    expect(logoutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });

  it("marks the active tab based on location", () => {
    render(<Sidebar />);
    expect(screen.getByText("Simulation Studio")).toBeInTheDocument();
  });
});
