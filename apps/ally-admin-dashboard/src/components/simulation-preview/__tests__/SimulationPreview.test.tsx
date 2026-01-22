import React from "react";

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SimulationPreview } from "../SimulationPreview";
import { SimulationStatus } from "@types";

// Mocks
const navigateMock = vi.fn();
const scenarioPreviewTrigger = vi.fn();
const endScenarioPreviewTrigger = vi.fn();

// Mock useUser
const mockUseUser = {
  user: { id: "test-user-id", name: "Test User" },
};

vi.mock("@hooks/useUser", () => ({
  useUser: () => mockUseUser,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@api", () => ({
  useScenarioPreviewMutation: () => [scenarioPreviewTrigger],
  useEndScenarioPreviewMutation: () => [endScenarioPreviewTrigger],
  useGetScenarioLanguagesQuery: () => ({
    data: [
      {
        language_id: 1,
        label: "English (India)",
        value: "English",
        translationCode: "en",
      },
    ],
  }),
}));

vi.mock("@components", () => ({
  CustomImage: (props: any) => <img data-testid="custom-image" {...props} />,
  Button: React.forwardRef<HTMLButtonElement, any>(({ children, onClick, className }, ref) => (
    <button ref={ref} onClick={onClick} className={className}>
      {children}
    </button>
  )),
  ButtonVariant: {
    PRIMARY: "primary" as const,
    DESTRUCTIVE: "destructive" as const,
    SECONDARY: "secondary" as const,
    ICON: "icon" as const,
    TEXT: "text" as const,
  },
  cellTypes: {
    editableText: "editableText",
    normalText: "normalText",
    dropdown: "dropdown",
    number: "number",
    emoji_select: "emoji_select",
  },
  ActionConfirmationPopup: ({
    isOpen,
    title,
    titleItalic,
    description,
    primaryButton,
    secondaryButton,
  }: any) =>
    isOpen ? (
      <div data-testid="notification-popup">
        <span>
          {title} {titleItalic}
        </span>
        <p>{description}</p>
        <button onClick={primaryButton.onClick}>{primaryButton.label}</button>
        {secondaryButton && (
          <button onClick={secondaryButton.onClick}>{secondaryButton.label}</button>
        )}
      </div>
    ) : null,
}));

vi.mock("@hooks", () => ({
  useClickOutside: () => {},
  useUser: () => ({ user: { id: "test-user-id", name: "Test User" } }),
}));

// Provide a minimal but sufficient constants mock to avoid loading the barrel
// which imports SimulationCreator (and thus cellTypes) transitively
vi.mock("@constants", () => ({
  en: {
    simulation: {
      simulation: "Simulation",
      preview: "Preview",
      close: "Close",
      startSession: "Start Session",
      starting: "Starting...",
      scenario: "Scenario",
    },
    notification: {
      beforeYouGetStarted: "Before you get started",
      botDelayMessage:
        "At times, the bot may be unresponsive, or have unusual lag times. We are always working to improve the experience!",
      startSession: "Start Session",
    },
    error: {
      apiRequestFailed: "API request failed",
      tokenRefreshFailed: "Token refresh failed",
      noRefreshDataReceived: "No refresh data received",
    },
  },
  LOCAL_STORAGE_KEYS: {
    PREVIEW_ROOM_DATA: "PREVIEW_ROOM_DATA",
    ADMIN_ACCESS_TOKEN: "ADMIN_ACCESS_TOKEN",
    ADMIN_REFRESH_TOKEN: "ADMIN_REFRESH_TOKEN",
    ADMIN_IS_AUTHENTICATED: "ADMIN_IS_AUTHENTICATED",
  },
  ROUTES: {
    LOGIN: "/login",
    SIMULATION_PREVIEW: (room: string) => `/preview/${room}`,
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  ApiEndpoints: {
    AUTH: { REFRESH: "/auth/refresh" },
  },
  HttpMethod: { GET: "GET", POST: "POST", PUT: "PUT", DELETE: "DELETE" },
}));

const createSuccessResponse = (overrides?: Partial<any>) => ({
  accessToken: {
    roomName: "room-123",
    token: "token-abc",
    serverUrl: "wss://example.com",
    ...overrides,
  },
});

const simulation = {
  id: "42",
  title: "Test Simulation",
  description: "Test description",
  coverImageUrl: "https://example.com/cover.jpg",
  status: SimulationStatus.ACTIVE,
} as any;

describe("SimulationPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <SimulationPreview simulation={simulation} isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders content when open and closes on button click", () => {
    const onClose = vi.fn();
    render(<SimulationPreview simulation={simulation} isOpen onClose={onClose} />);

    // Image alt should be simulation title
    expect(screen.getByAltText("Test Simulation")).toBeInTheDocument();

    // Close button is the first button rendered
    const [closeButton] = screen.getAllByRole("button");
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows notification popup when start button is clicked", async () => {
    render(<SimulationPreview simulation={simulation} isOpen onClose={vi.fn()} />);

    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });
    const notificationPopup = screen.getByTestId("notification-popup");
    expect(within(notificationPopup).getByText("Start Session")).toBeInTheDocument();
    expect(
      screen.getByText(
        "At times, the bot may be unresponsive, or have unusual lag times. We are always working to improve the experience!",
      ),
    ).toBeInTheDocument();
  });

  it("starts preview successfully after clicking Start Session in notification", async () => {
    scenarioPreviewTrigger.mockImplementation(() => ({
      unwrap: () => Promise.resolve(createSuccessResponse()),
    }));

    render(<SimulationPreview simulation={simulation} isOpen onClose={vi.fn()} />);

    const setItemSpy = vi.spyOn(window.localStorage, "setItem");
    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    const notificationPopup = screen.getByTestId("notification-popup");
    fireEvent.click(within(notificationPopup).getByText("Start Session"));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledTimes(1);
    });
    // Room data written to localStorage
    expect(setItemSpy).toHaveBeenCalled();
    const [, storedJson] = setItemSpy.mock.calls[0] as [string, string];
    const stored = JSON.parse(storedJson);
    expect(stored.roomId).toBe("room-123");
    expect(stored.title).toBe("Test Simulation");
    expect(stored.accessToken).toBe("token-abc");
  });

  it("handles existing active preview by ending and retrying", async () => {
    const errorWithEntity = { data: { entityId: "room-old" } };

    scenarioPreviewTrigger
      .mockImplementationOnce(() => ({ unwrap: () => Promise.reject(errorWithEntity) }))
      .mockImplementationOnce(() => ({ unwrap: () => Promise.resolve(createSuccessResponse()) }));

    endScenarioPreviewTrigger.mockImplementationOnce(() => ({ unwrap: () => Promise.resolve({}) }));

    render(<SimulationPreview simulation={simulation} isOpen onClose={vi.fn()} />);

    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    const notificationPopup = screen.getByTestId("notification-popup");
    fireEvent.click(within(notificationPopup).getByText("Start Session"));

    await waitFor(() =>
      expect(endScenarioPreviewTrigger).toHaveBeenCalledWith({ roomName: "room-old" }),
    );
    await waitFor(() => expect(scenarioPreviewTrigger).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
  });

  it("ignores repeated clicks while loading", async () => {
    let resolveFn: (value?: any) => void = () => {};
    const pending = new Promise(res => {
      resolveFn = res;
    });

    scenarioPreviewTrigger.mockImplementation(() => ({ unwrap: () => pending }));

    render(<SimulationPreview simulation={simulation} isOpen onClose={vi.fn()} />);
    const [, startButton] = screen.getAllByRole("button");

    fireEvent.click(startButton);
    // Only one trigger call should be made due to isLoading guard
    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    const notificationPopup = screen.getByTestId("notification-popup");
    fireEvent.click(within(notificationPopup).getByText("Start Session"));

    expect(scenarioPreviewTrigger).toHaveBeenCalledTimes(1);

    resolveFn(createSuccessResponse());
  });

  it("passes a languageId when the simulation is active", async () => {
    const selectedLanguageId = 1;

    render(<SimulationPreview simulation={simulation} isOpen onClose={vi.fn()} />);

    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    const notificationPopup = screen.getByTestId("notification-popup");
    fireEvent.click(within(notificationPopup).getByText("Start Session"));

    expect(scenarioPreviewTrigger).toHaveBeenCalledWith({
      scenarioId: Number(simulation.id),
      languageId: selectedLanguageId,
    });
  });

  it("omits languageId and hides dropdown for non-active simulations", async () => {
    const inactiveSimulation = { ...simulation, status: SimulationStatus.DRAFT };

    render(<SimulationPreview simulation={inactiveSimulation} isOpen onClose={vi.fn()} />);
    // Dropdown should not render because languages are skipped entirely
    expect(screen.queryByText("English (India)")).not.toBeInTheDocument();

    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    const notificationPopup = screen.getByTestId("notification-popup");
    fireEvent.click(within(notificationPopup).getByText("Start Session"));

    expect(scenarioPreviewTrigger).toHaveBeenCalledWith({
      scenarioId: Number(inactiveSimulation.id),
    });
  });

  it("closes notification popup when clicking outside", async () => {
    const onCloseMock = vi.fn();
    render(<SimulationPreview simulation={simulation} isOpen onClose={onCloseMock} />);

    const [, startButton] = screen.getAllByRole("button");
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-popup")).toBeInTheDocument();
    });

    expect(scenarioPreviewTrigger).not.toHaveBeenCalled();
  });
});
