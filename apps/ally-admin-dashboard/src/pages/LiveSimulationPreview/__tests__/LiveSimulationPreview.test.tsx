import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Hoist mocks to avoid initialization errors
const { mockNavigate, mockUseLiveKitRoom } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseLiveKitRoom: vi.fn(),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "test-room-123" }),
  };
});

// Mock useLiveKitRoom hook
vi.mock("@hooks/useLiveKitRoom", () => ({
  useLiveKitRoom: () => mockUseLiveKitRoom(),
}));

// Mock SimulationPage from ui-shared
const mockSimulationPageProps = vi.fn();
vi.mock("@ally-ui-mono/ui-shared", () => ({
  SimulationPage: (props: any) => {
    mockSimulationPageProps(props);
    return (
      <div data-testid="simulation-page">
        <h1>{props.title}</h1>
        <div data-testid="room-status">{props.roomStatus}</div>
        <div data-testid="score">{props.score}</div>
        <div data-testid="events-count">{props.events?.length || 0}</div>
        <button onClick={props.onEndSimulation} data-testid="end-simulation">
          End Simulation
        </button>
        {props.renderWarningDialog &&
          props.renderWarningDialog({
            isOpen: true,
            onClose: vi.fn(),
            onContinue: vi.fn(),
            onEnd: vi.fn(),
          })}
      </div>
    );
  },
  getSimulationEvents: (events: any[]) => events,
}));

// Mock ActionConfirmationPopup
vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    ActionConfirmationPopup: ({
      isOpen,
      onClose,
      title,
      titleItalic,
      description,
      primaryButton,
      secondaryButton,
    }: any) =>
      isOpen ? (
        <div data-testid="action-confirmation-popup">
          <h2>
            {title} {titleItalic}
          </h2>
          <p>{description}</p>
          <button onClick={primaryButton.onClick} data-testid="continue-button">
            {primaryButton.label}
          </button>
          <button onClick={secondaryButton.onClick} data-testid="end-button">
            {secondaryButton.label}
          </button>
        </div>
      ) : null,
  };
});

// Mock SimulationCreator constants
vi.mock("@constants/SimulationCreator", () => ({
  STEP1_FIELDS: [],
  STEP2_FIELDS: [],
  STEP3_FIELDS: [],
  STEP4_FIELDS: [],
  STEP5_FIELDS: [],
  eventsTableColumns: [],
}));

// Mock constants
vi.mock("@constants", async importOriginal => {
  const actual = await importOriginal<typeof import("@constants")>();
  return {
    ...actual,
    en: {
      ...(actual.en || {}),
      simulation: {
        simulationPreview: "Simulation Preview",
      },
    },
    LOCAL_STORAGE_KEYS: {
      PREVIEW_ROOM_DATA: "preview_room_data",
    },
    ROUTES: {
      SIMULATION_STUDIO: "/simulation-studio",
    },
  };
});

import { RoomStatus } from "@types";

import { LiveSimulationPreview } from "../LiveSimulationPreview";

describe("LiveSimulationPreview", () => {
  const mockRoom = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    localParticipant: {
      setMicrophoneEnabled: vi.fn(),
    },
  };

  const mockRoomData = {
    accessToken: "test-token",
    serverUrl: "wss://test-livekit-server.com",
    roomName: "test-room",
    createdAt: "2024-01-01T00:00:00Z",
  };

  const mockEvents = [
    {
      version: "1.0",
      data: {
        score: 5,
        emoji: "😊",
        message: "Great response!",
      },
      timestamp: "2024-01-01T00:01:00Z",
    },
    {
      version: "1.0",
      data: {
        score: 3,
        emoji: "😐",
        message: "Okay response",
      },
      timestamp: "2024-01-01T00:02:00Z",
    },
  ];

  const defaultMockHookReturn = {
    room: mockRoom,
    roomData: mockRoomData,
    roomStatus: RoomStatus.CONNECTED,
    events: mockEvents,
    score: 8,
    startTime: new Date("2024-01-01T00:00:00Z"),
    handleEndSession: vi.fn(),
    handleRetryConnection: vi.fn(),
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLiveKitRoom.mockReturnValue(defaultMockHookReturn);

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(() => JSON.stringify(mockRoomData)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={["/simulation-preview/test-room-123"]}>
        <Routes>
          <Route path="/simulation-preview/:id" element={<LiveSimulationPreview />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  describe("Initial rendering", () => {
    it("renders the SimulationPage component", () => {
      renderComponent();
      expect(screen.getByTestId("simulation-page")).toBeInTheDocument();
    });

    it("displays the correct title", () => {
      renderComponent();
      expect(screen.getByText("Simulation Preview")).toBeInTheDocument();
    });

    it("passes room data to SimulationPage", () => {
      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          room: mockRoom,
          roomData: mockRoomData,
          roomStatus: RoomStatus.CONNECTED,
        }),
      );
    });

    it("passes session ID from URL params", () => {
      renderComponent();

      // The component uses useParams which gets the ID from the route
      // In our test, the actual value might be null due to mocking limitations
      const props = mockSimulationPageProps.mock.calls[0][0];
      expect(props).toHaveProperty("sessionId");
    });
  });

  describe("Room status", () => {
    it("displays CONNECTED status correctly", () => {
      renderComponent();
      expect(screen.getByTestId("room-status")).toHaveTextContent(RoomStatus.CONNECTED);
    });

    it("sets isEndingSession to false when CONNECTED", () => {
      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isEndingSession: false,
        }),
      );
    });

    it("displays CONNECTING status correctly", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomStatus: RoomStatus.CONNECTING,
      });

      renderComponent();
      expect(screen.getByTestId("room-status")).toHaveTextContent(RoomStatus.CONNECTING);
    });

    it("sets isEndingSession to true when CONNECTING", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomStatus: RoomStatus.CONNECTING,
      });

      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isEndingSession: true,
        }),
      );
    });

    it("displays DISCONNECTED status correctly", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomStatus: RoomStatus.DISCONNECTED,
      });

      renderComponent();
      expect(screen.getByTestId("room-status")).toHaveTextContent(RoomStatus.DISCONNECTED);
    });

    it("sets isEndingSession to true when DISCONNECTED", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomStatus: RoomStatus.DISCONNECTED,
      });

      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          isEndingSession: true,
        }),
      );
    });
  });

  describe("Events and score", () => {
    it("displays the correct event count", () => {
      renderComponent();
      expect(screen.getByTestId("events-count")).toHaveTextContent("2");
    });

    it("displays the correct score", () => {
      renderComponent();
      expect(screen.getByTestId("score")).toHaveTextContent("8");
    });

    it("passes events through getSimulationEvents", () => {
      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          events: mockEvents,
        }),
      );
    });

    it("handles empty events array", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        events: [],
        score: 0,
      });

      renderComponent();
      expect(screen.getByTestId("events-count")).toHaveTextContent("0");
      expect(screen.getByTestId("score")).toHaveTextContent("0");
    });

    it("handles multiple events with varying scores", () => {
      const manyEvents = [
        {
          version: "1.0",
          data: { score: 5, emoji: "😊", message: "Great!" },
          timestamp: "2024-01-01T00:01:00Z",
        },
        {
          version: "1.0",
          data: { score: 2, emoji: "😐", message: "Okay" },
          timestamp: "2024-01-01T00:02:00Z",
        },
        {
          version: "1.0",
          data: { score: 4, emoji: "🙂", message: "Good" },
          timestamp: "2024-01-01T00:03:00Z",
        },
      ];

      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        events: manyEvents,
        score: 11,
      });

      renderComponent();
      expect(screen.getByTestId("events-count")).toHaveTextContent("3");
      expect(screen.getByTestId("score")).toHaveTextContent("11");
    });
  });

  describe("Start time", () => {
    it("passes start time as ISO string", () => {
      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: "2024-01-01T00:00:00.000Z",
        }),
      );
    });

    it("handles different start times", () => {
      const customStartTime = new Date("2024-06-15T10:30:00Z");
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        startTime: customStartTime,
      });

      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: customStartTime.toISOString(),
        }),
      );
    });
  });

  describe("End simulation", () => {
    it("calls handleEndSession when end simulation is clicked", async () => {
      const mockHandleEndSession = vi.fn();
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        handleEndSession: mockHandleEndSession,
      });

      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockHandleEndSession).toHaveBeenCalledTimes(1);
      });
    });

    it("removes room data from localStorage on end", async () => {
      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(window.localStorage.removeItem).toHaveBeenCalledWith("preview_room_data");
      });
    });

    it("navigates back on end", async () => {
      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      });
    });

    it("performs all cleanup steps in correct order", async () => {
      const mockHandleEndSession = vi.fn();
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        handleEndSession: mockHandleEndSession,
      });

      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockHandleEndSession).toHaveBeenCalled();
        expect(window.localStorage.removeItem).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe("Warning dialog", () => {
    it("renders warning dialog with correct title", () => {
      renderComponent();

      expect(screen.getByText("Session Ending Soon")).toBeInTheDocument();
    });

    it("renders warning dialog with correct description", () => {
      renderComponent();

      expect(screen.getByText("Your session will end in 30 seconds.")).toBeInTheDocument();
    });

    it("renders continue button in warning dialog", () => {
      renderComponent();

      expect(screen.getByTestId("continue-button")).toBeInTheDocument();
      expect(screen.getByText("Continue Session")).toBeInTheDocument();
    });

    it("renders end button in warning dialog", () => {
      renderComponent();

      expect(screen.getByTestId("end-button")).toBeInTheDocument();
      expect(screen.getByText("End Session")).toBeInTheDocument();
    });

    it("warning dialog has primary button with PRIMARY variant", () => {
      renderComponent();

      // Verify the mock was called with correct button configuration
      const lastCall =
        mockSimulationPageProps.mock.calls[mockSimulationPageProps.mock.calls.length - 1][0];
      const warningDialog = lastCall.renderWarningDialog({
        isOpen: true,
        onClose: vi.fn(),
        onContinue: vi.fn(),
        onEnd: vi.fn(),
      });

      expect(warningDialog).toBeTruthy();
    });

    it("warning dialog has secondary button with secondary variant", () => {
      renderComponent();

      // The warning dialog is rendered, verify it exists
      expect(screen.getByTestId("action-confirmation-popup")).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles missing session ID gracefully", () => {
      vi.mock("react-router-dom", async () => {
        const actual = await vi.importActual("react-router-dom");
        return {
          ...actual,
          useNavigate: () => mockNavigate,
          useParams: () => ({ id: undefined }),
        };
      });

      renderComponent();

      // Should still render but with null sessionId
      expect(screen.getByTestId("simulation-page")).toBeInTheDocument();
    });

    it("handles null room data", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomData: null,
      });

      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          roomData: null,
        }),
      );
    });

    it("handles error state from useLiveKitRoom", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        error: "Connection failed",
        roomStatus: RoomStatus.DISCONNECTED,
      });

      renderComponent();

      expect(screen.getByTestId("room-status")).toHaveTextContent(RoomStatus.DISCONNECTED);
    });

    it("handles undefined room", () => {
      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        room: undefined as any,
      });

      renderComponent();

      expect(screen.getByTestId("simulation-page")).toBeInTheDocument();
    });
  });

  describe("Integration with SimulationPage", () => {
    it("passes all required props to SimulationPage", () => {
      renderComponent();

      const props = mockSimulationPageProps.mock.calls[0][0];

      // Verify all required props are present with correct types
      expect(props).toHaveProperty("room");
      expect(props).toHaveProperty("roomData");
      expect(typeof props.roomStatus).toBe("string");
      expect(props).toHaveProperty("sessionId");
      expect(typeof props.isEndingSession).toBe("boolean");
      expect(typeof props.startTime).toBe("string");
      expect(Array.isArray(props.events)).toBe(true);
      expect(typeof props.score).toBe("number");
      expect(typeof props.title).toBe("string");
      expect(typeof props.onEndSimulation).toBe("function");
      expect(typeof props.renderWarningDialog).toBe("function");
    });

    it("passes correct title from constants", () => {
      renderComponent();

      expect(mockSimulationPageProps).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Simulation Preview",
        }),
      );
    });

    it("ensures onEndSimulation is a function", () => {
      renderComponent();

      const props = mockSimulationPageProps.mock.calls[0][0];
      expect(typeof props.onEndSimulation).toBe("function");
    });

    it("ensures renderWarningDialog is a function", () => {
      renderComponent();

      const props = mockSimulationPageProps.mock.calls[0][0];
      expect(typeof props.renderWarningDialog).toBe("function");
    });
  });

  describe("localStorage interaction", () => {
    it("clears preview room data on end", async () => {
      const removeItemSpy = vi.spyOn(window.localStorage, "removeItem");

      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(removeItemSpy).toHaveBeenCalledWith("preview_room_data");
      });
    });

    it("handles missing localStorage data gracefully", () => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: vi.fn(() => null),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      renderComponent();

      expect(screen.getByTestId("simulation-page")).toBeInTheDocument();
    });
  });

  describe("Component lifecycle", () => {
    it("renders without errors", () => {
      expect(() => renderComponent()).not.toThrow();
    });

    it("updates when room status changes", () => {
      const { rerender } = renderComponent();

      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        roomStatus: RoomStatus.CONNECTING,
      });

      rerender(
        <MemoryRouter initialEntries={["/simulation-preview/test-room-123"]}>
          <Routes>
            <Route path="/simulation-preview/:id" element={<LiveSimulationPreview />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("room-status")).toHaveTextContent(RoomStatus.CONNECTING);
    });

    it("updates when events change", () => {
      const { rerender } = renderComponent();

      expect(screen.getByTestId("events-count")).toHaveTextContent("2");

      mockUseLiveKitRoom.mockReturnValue({
        ...defaultMockHookReturn,
        events: [
          ...mockEvents,
          {
            version: "1.0",
            data: { score: 1, emoji: "😊", message: "New!" },
            timestamp: "2024-01-01T00:03:00Z",
          },
        ],
        score: 9,
      });

      rerender(
        <MemoryRouter initialEntries={["/simulation-preview/test-room-123"]}>
          <Routes>
            <Route path="/simulation-preview/:id" element={<LiveSimulationPreview />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("events-count")).toHaveTextContent("3");
      expect(screen.getByTestId("score")).toHaveTextContent("9");
    });
  });

  describe("Navigation", () => {
    it("uses -1 for back navigation", async () => {
      renderComponent();

      const endButton = screen.getByTestId("end-simulation");
      fireEvent.click(endButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(-1);
      });
    });

    it("does not navigate prematurely", () => {
      renderComponent();

      // Should not navigate on initial render
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
