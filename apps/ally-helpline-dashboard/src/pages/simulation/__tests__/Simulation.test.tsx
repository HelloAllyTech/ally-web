import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";

import { RoomStatus } from "@types";

import { Simulation } from "../Simulation";

// --- MOCK SETUP ---
const mockNavigate = vi.fn();
const mockEndSimulation = vi.fn();
const mockHandleEndSession = vi.fn();
const mockHandleRetryConnection = vi.fn();
const mockSetMicrophoneEnabled = vi.fn();

let mockRoomStatus = RoomStatus.CONNECTED;
let mockRoom: any = {
  localParticipant: {
    setMicrophoneEnabled: mockSetMicrophoneEnabled,
  },
};
let mockStartTime = new Date();
let mockEvents: any[] = [];
let mockScore = 0;
let mockError: any = null;
let mockdetectedEventIds: string[] = [];

// Mock wake lock
const mockWakeLockRelease = vi.fn().mockResolvedValue(undefined);
const mockWakeLockRequest = vi.fn().mockResolvedValue({
  release: mockWakeLockRelease,
});

// --- MODULE MOCKS ---

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "test-session-123" }),
}));

vi.mock("@api", () => ({
  useEndSimulationMutation: () => [mockEndSimulation, { isLoading: false }],
}));

vi.mock("@hooks", () => ({
  useLiveKitRoom: () => ({
    room: mockRoom,
    roomStatus: mockRoomStatus,
    error: mockError,
    startTime: mockStartTime,
    handleEndSession: mockHandleEndSession,
    handleRetryConnection: mockHandleRetryConnection,
    events: mockEvents,
    score: mockScore,
    detectedEventIds: mockdetectedEventIds,
  }),
}));

vi.mock("@livekit/components-react", () => ({
  RoomContext: {
    Provider: ({ children }: any) => <div data-testid="room-context-provider">{children}</div>,
  },
  RoomAudioRenderer: () => <div data-testid="room-audio-renderer" />,
  useRemoteParticipants: () => [],
  useRoomContext: () => ({}),
  useTrack: () => ({}),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  SimulationPage: ({ children, ...props }: any) => (
    <div data-testid="simulation-page">
      <div data-testid="translations">{JSON.stringify(props.translations)}</div>
      <button data-testid="end-simulation-btn" onClick={props.onEndSimulation}>
        End Session
      </button>
      {props.renderWarningDialog({
        isOpen: true,
        onClose: vi.fn(),
        onContinue: vi.fn(),
        onEnd: vi.fn(),
      })}
      Simulation Page
    </div>
  ),
  getSimulationEvents: (events: any[]) => events,
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@components", () => ({
  ConfirmationDialog: ({
    isOpen,
    onClose,
    onButtonClick,
    onSecondaryButtonClick,
    title,
    content,
    buttonText,
    secondaryButtonText,
  }: any) =>
    isOpen ? (
      <div data-testid="confirmation-dialog">
        <h2 data-testid="dialog-title">
          {title?.normal} {title?.italic}
        </h2>
        <p data-testid="dialog-content">{content}</p>
        <button data-testid="dialog-primary-button" onClick={onButtonClick}>
          {buttonText}
        </button>
        {secondaryButtonText && (
          <button data-testid="dialog-secondary-button" onClick={onSecondaryButtonClick}>
            {secondaryButtonText}
          </button>
        )}
        <button data-testid="dialog-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
  ButtonVariant: {
    PRIMARY: "primary",
  },
}));

vi.mock("@assets", () => ({
  SimulationWarningIllustration: "simulation-warning-illustration",
  Warning: ({ className }: any) => <svg data-testid="warning-icon" className={className} />,
}));

vi.mock("@constants", () => ({
  ROUTES: {
    SIMULATION_SUMMARY: "/simulation-summary",
  },
}));

// --- TESTS ---

describe("Simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock state
    mockRoomStatus = RoomStatus.CONNECTED;
    mockStartTime = new Date();
    mockEvents = [];
    mockScore = 0;
    mockdetectedEventIds = [];
    mockError = null;
    mockRoom = {
      localParticipant: {
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
      },
    };

    // Setup wake lock mock
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: {
        request: mockWakeLockRequest,
      },
    });

    mockEndSimulation.mockResolvedValue({});
    mockWakeLockRelease.mockResolvedValue(undefined);
    mockWakeLockRequest.mockResolvedValue({
      release: mockWakeLockRelease,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("should render simulation page and pass translations", () => {
    render(<Simulation />);
    expect(screen.getByTestId("simulation-page")).toBeInTheDocument();

    const translationsDiv = screen.getByTestId("translations");
    const translations = JSON.parse(translationsDiv.textContent || "{}");

    expect(translations.mute).toBe("simulationPage.mute");
    expect(translations.endSession).toBe("simulationPage.endSession");
    expect(translations.sessionChecklist).toBe("simulationPage.sessionChecklist");
  });

  test("should handle end simulation correctly", async () => {
    render(<Simulation />);
    const endBtn = screen.getByTestId("end-simulation-btn");

    await fireEvent.click(endBtn);

    expect(mockEndSimulation).toHaveBeenCalledWith({ sessionId: "test-session-123" });
  });

  test("should render warning dialog with correct translations", () => {
    render(<Simulation />);

    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "simulationPage.warningDialog.titleNormal simulationPage.warningDialog.titleItalic",
    );
    expect(screen.getByTestId("dialog-content")).toHaveTextContent(
      "simulationPage.warningDialog.content",
    );
    expect(screen.getByTestId("dialog-primary-button")).toHaveTextContent(
      "simulationPage.warningDialog.continueSession",
    );
    expect(screen.getByTestId("dialog-secondary-button")).toHaveTextContent(
      "simulationPage.warningDialog.endSession",
    );
  });

  test("should add beforeunload event listener on mount and remove on unmount", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<Simulation />);

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });
});
