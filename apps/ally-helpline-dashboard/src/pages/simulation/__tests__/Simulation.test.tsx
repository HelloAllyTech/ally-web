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
let mockStartTime = new Date();
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

vi.mock("@lifeline-ui-mono/ui-shared/logger", () => ({
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

vi.mock("@lifeline-ui-mono/ui-shared", () => ({
  SimulationPage: ({ children, ...props }: any) => (
    <div data-testid="simulation-page" {...props}>
      Simulation Page
    </div>
  ),
  getSimulationEvents: (events: any[]) => events,
  logger: {
    info: vi.fn(),
    error: vi.fn(),
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

  test("should render simulation page", () => {
    render(<Simulation />);
    expect(screen.getByTestId("simulation-page")).toBeInTheDocument();
    expect(screen.getByText("Simulation Page")).toBeInTheDocument();
  });
});
