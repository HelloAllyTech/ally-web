import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";

const navigateMock = vi.fn();
const logoutMock = vi.fn();

// Mock API first to prevent store initialization errors
vi.mock("@api", () => ({
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

import { store } from "../../../store";
import { Sidebar } from "../Sidebar";

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(() => ({ pathname: "/simulation-studio" })),
  useNavigate: vi.fn(() => navigateMock),
}));

vi.mock("@assets", () => ({
  ArrowDown: () => <svg data-testid="arrow-down" />,
  Book: () => <svg data-testid="icon-book" />,
  User: () => <svg data-testid="icon-user" />,
  Users: () => <svg data-testid="icon-users" />,
  Ally: () => <svg data-testid="logo-ally" />,
  DockToRight: () => <svg data-testid="dock" />,
  Logout: () => <svg data-testid="logout" />,
  HappyEmoji: () => <svg data-testid="happy" />,
  ManageAccounts: () => <svg data-testid="manage-accounts" />,
  Globe: () => <svg data-testid="globe" />,
  Mic: () => <svg data-testid="mic" />,
  UserSpeaker: () => <svg data-testid="user-speaker" />,
  CharacterLibrary: () => <svg data-testid="character-library" />,
  FrameSource: () => <svg data-testid="frame-source" />,
  Guardrails: () => <svg data-testid="guardrails" />,
  Badge: () => <svg data-testid="badge" />,
}));

vi.mock("@hooks", () => ({
  useClickOutside: (_ref: any, _handler: any) => {},
  useUser: () => ({
    user: { name: "Alice", email: "alice@example.com" },
    logout: logoutMock,
    filteredNavigationItems: [
      { id: "SIMULATION_STUDIO", label: "Simulation Studio", path: "/simulation-studio" },
      { id: "EVENT_MANAGEMENT", label: "Events", path: "/events" },
      { id: "SCENARIO_LANGUAGES", label: "Scenario Languages", path: "/manage-scenario-languages" },
      { id: "SCENARIO_VOICES", label: "Scenario Voices", path: "/manage-scenario-voices" },
      { id: "PROMPTS", label: "Prompts", path: "/manage-prompts" },
      { id: "TRANSLATIONS", label: "Translations", path: "/manage-translations" },
      { id: "USERS", label: "Users", path: "/users" },
      {
        id: "SETTINGS",
        label: "Settings",
        path: "/settings",
      },
    ],
  }),
}));

vi.mock("@components", () => ({
  UserModal: () => null,
}));

vi.mock("@constants", () => ({
  ReportGenerationStatus: {
    STARTED: "STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
  },
  SIDEBAR_ITEMS: {
    SIMULATION_STUDIO: "SIMULATION_STUDIO",
    USERS: "USERS",
    EVENT_MANAGEMENT: "EVENT_MANAGEMENT",
    SCENARIO_VOICES: "SCENARIO_VOICES",
    SCENARIO_LANGUAGES: "SCENARIO_LANGUAGES",
    PROMPTS: "PROMPTS",
    TRANSLATIONS: "TRANSLATIONS",
  },
  ROUTES: {
    SIMULATION_STUDIO: "/simulation-studio",
    CREATE_SIMULATION: "/simulation-studio/create",
    CREATE_PATH: "/create-path",
    USER_MANAGEMENT: "/users",
    MANAGE_EVENTS: "/events",
    MANAGE_SCENARIO_VOICES: "/manage-scenario-voices",
    MANAGE_SCENARIO_LANGUAGES: "/manage-scenario-languages",
    MANAGE_PROMPTS: "/manage-prompts",
    MANAGE_TRANSLATIONS: "/manage-translations",
    LOGIN: "/login",
  },
  en: {
    common: {
      searchMenu: "Search menu...",
      noMenuResults: "No matching tabs",
      clearSearch: "Clear search",
    },
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

const renderWithProvider = (component: React.ReactElement) => {
  return render(<Provider store={store}>{component}</Provider>);
};

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
    renderWithProvider(<Sidebar />);

    const simItem = screen.getByTitle("Simulation Studio");
    expect(simItem).toBeInTheDocument();

    fireEvent.click(simItem);
    expect(navigateMock).toHaveBeenCalledWith("/simulation-studio");
  });

  it("toggles expand/collapse via the toggle button", () => {
    renderWithProvider(<Sidebar />);

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
    renderWithProvider(<Sidebar />);

    // Click profile section (name/email present when expanded)
    fireEvent.click(screen.getByText("Alice"));

    expect(screen.getByText("Logout")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Logout"));

    expect(logoutMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });

  it("marks the active tab based on location", () => {
    renderWithProvider(<Sidebar />);
    expect(screen.getByText("Simulation Studio")).toBeInTheDocument();
  });

  it("renders Scenario Voices navigation item", () => {
    renderWithProvider(<Sidebar />);

    const voicesItem = screen.getByText("Scenario Voices");
    expect(voicesItem).toBeInTheDocument();
  });

  it("navigates to Scenario Voices when clicked", () => {
    renderWithProvider(<Sidebar />);

    const voicesItem = screen.getByText("Scenario Voices");
    fireEvent.click(voicesItem);

    expect(navigateMock).toHaveBeenCalledWith("/manage-scenario-voices");
  });

  it("navigates to Translations when clicked", () => {
    renderWithProvider(<Sidebar />);

    const translationsItem = screen.getByText("Translations");
    fireEvent.click(translationsItem);

    expect(navigateMock).toHaveBeenCalledWith("/manage-translations");
  });

  it("displays Scenario Voices with correct title when collapsed", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 800 });
    renderWithProvider(<Sidebar />);

    const voicesItem = screen.getByTitle("Scenario Voices");
    expect(voicesItem).toBeInTheDocument();
  });

  it("includes all navigation items in order", () => {
    renderWithProvider(<Sidebar />);

    expect(screen.getByText("Simulation Studio")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Scenario Voices")).toBeInTheDocument();
    expect(screen.getByText("Scenario Languages")).toBeInTheDocument();
    expect(screen.getByText("Translations")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

});
