import { render, screen, waitFor, act } from "@testing-library/react";
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
let mockStartTime = Date.now();
let mockEvents: any[] = [];
let mockScore = 0;
let mockError: any = null;

// Mock wake lock
const mockWakeLockRelease = vi.fn().mockResolvedValue(undefined);
const mockWakeLockRequest = vi.fn().mockResolvedValue({
  release: mockWakeLockRelease,
});

// --- MODULE MOCKS ---

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
  }),
}));

vi.mock("@livekit/components-react", () => ({
  RoomContext: {
    Provider: ({ children }: any) => <div data-testid="room-context-provider">{children}</div>,
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@ally-ui-mono/ui-shared/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components
vi.mock("../components", () => ({
  SimulationControls: ({ isMuted, onEndSessionClick, onMuteClick }: any) => (
    <div data-testid="simulation-controls">
      <button data-testid="mute-button" onClick={onMuteClick}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
      <button data-testid="end-session-button" onClick={onEndSessionClick}>
        End Session
      </button>
    </div>
  ),
  SimulationEvents: ({ events }: any) => (
    <div data-testid="simulation-events">Events: {events.length}</div>
  ),
  SimulationInterface: ({ roomStatus }: any) => (
    <div data-testid="simulation-interface">Status: {roomStatus}</div>
  ),
  SimulationScoreMeter: ({ score }: any) => (
    <div data-testid="simulation-score-meter">Score: {score}</div>
  ),
  SimulationTimer: ({ startTime, onWarning, onTimeLimit, isWarning }: any) => (
    <div data-testid="simulation-timer">
      <span>Start Time: {startTime}</span>
      <button data-testid="trigger-warning" onClick={onWarning}>
        Trigger Warning
      </button>
      <button data-testid="trigger-time-limit" onClick={onTimeLimit}>
        Trigger Time Limit
      </button>
      {isWarning && <span data-testid="timer-warning">Warning Active</span>}
    </div>
  ),
}));

vi.mock("@components", () => ({
  ConfirmationDialog: ({
    isOpen,
    onClose,
    onButtonClick,
    onSecondaryButtonClick,
    title,
    content,
  }: any) =>
    isOpen ? (
      <div data-testid="confirmation-dialog">
        <h2>
          {title.normal} {title.italic}
        </h2>
        <p>{content}</p>
        <button data-testid="dialog-primary-button" onClick={onButtonClick}>
          Continue
        </button>
        <button data-testid="dialog-secondary-button" onClick={onSecondaryButtonClick}>
          End
        </button>
        <button data-testid="dialog-close-button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
  ButtonVariant: {
    PRIMARY: "primary",
  },
}));

vi.mock("../utils", () => ({
  getSimulationEvents: (events: any[]) => events,
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
    mockStartTime = Date.now();
    mockEvents = [];
    mockScore = 0;
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

  test("should render all main components", () => {
    render(<Simulation />);

    expect(screen.getByTestId("room-context-provider")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-interface")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-events")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-score-meter")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-timer")).toBeInTheDocument();
    expect(screen.getByTestId("simulation-controls")).toBeInTheDocument();
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    expect(screen.getByText("Your data is safe")).toBeInTheDocument();
  });

  test("should pass correct props to child components", () => {
    mockScore = 85;
    mockEvents = [{ id: "1" }, { id: "2" }];

    render(<Simulation />);

    expect(screen.getByText("Status: connected")).toBeInTheDocument();
    expect(screen.getByText("Events: 2")).toBeInTheDocument();
    expect(screen.getByText("Score: 85")).toBeInTheDocument();
    expect(screen.getByText(`Start Time: ${mockStartTime}`)).toBeInTheDocument();
  });

  test("should handle wake lock not supported", () => {
    Object.defineProperty(navigator, "wakeLock", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    render(<Simulation />);

    expect(screen.getByTestId("simulation-interface")).toBeInTheDocument();
    expect(mockWakeLockRequest).not.toHaveBeenCalled();
  });

  test("should not request wake lock when room is not connected", () => {
    mockRoomStatus = RoomStatus.DISCONNECTED;

    render(<Simulation />);

    expect(mockWakeLockRequest).not.toHaveBeenCalled();
  });
});
