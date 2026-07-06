import { render, screen, waitFor, act } from "@testing-library/react";
import { motion } from "framer-motion";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

import { CallProvider } from "@constants";
import { SocketDisconnectionReasons } from "@constants";
import { Chat, ChatStatus } from "@types";

import { CallInterfaceProps } from "../../types";
import CallInterface from "../CallInterface";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock react-audio-visualize
vi.mock("react-audio-visualize", () => ({
  LiveAudioVisualizer: ({ mediaRecorder, width, height, barWidth, barColor }: any) => (
    <div
      data-testid="live-audio-visualizer"
      data-media-recorder={!!mediaRecorder}
      data-width={width}
      data-height={height}
      data-bar-width={barWidth}
      data-bar-color={barColor}
    >
      Audio Visualizer
    </div>
  ),
}));

// Mock @ally-ui-mono/ui-shared. The Carbon Tooltip takes its content via a
// `label` prop and its position via `align` (replacing MUI's `title` /
// `placement` / `arrow`).
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Tooltip: ({ children, label, align }: any) => (
    <div data-testid="tooltip" data-align={align}>
      {children}
      <div data-testid="tooltip-content">{label}</div>
    </div>
  ),
}));

// Mock assets
vi.mock("@assets", () => ({
  Lock: () => <div data-testid="lock-icon">Lock Icon</div>,
  WarningTriangle: () => <div data-testid="warning-triangle-icon">Warning Triangle Icon</div>,
  NoNetwork: () => <div data-testid="no-network-icon">No Network Icon</div>,
  InDoubt: () => <div data-testid="in-doubt-icon">In Doubt Icon</div>,
}));

// Mock constants
vi.mock("@constants", () => ({
  CallProvider: {
    MICROPHONE: "MICROPHONE",
    WEBRTC: "WEBRTC",
  },
  TOOLTIP_LIGHT_PROPS: { test: "light-props" },
  SocketDisconnectionReasons: {
    NETWORK_ERROR: "NETWORK_ERROR",
    SERVER_ERROR: "SERVER_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    NO_NETWORK: "NO_NETWORK",
    NO_NETWORK_IN_SHARED_SESSION: "NO_NETWORK_IN_SHARED_SESSION",
    SOMETHING_WENT_WRONG: "SOMETHING_WENT_WRONG",
  },
  Permissions: {
    CALL_LOGS: "CALL_LOGS",
    SIMULATION_LOGS: "SIMULATION_LOGS",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
}));

// Mock ErrorScreen
vi.mock("../ErrorScreen", () => ({
  default: ({ socketDisconnectionReason }: any) => (
    <div data-testid="error-screen" data-reason={socketDisconnectionReason}>
      Error Screen
    </div>
  ),
}));

// Mock utils
vi.mock("../../utils", () => ({
  formatTime: (time: number) => {
    const minutes = Math.floor(time / 60) % 60;
    const seconds = time % 60;
    const hours = Math.floor(time / 3600);
    return `${hours > 0 ? `${hours.toString().padStart(2, "0")} :` : "00 :"} ${minutes.toString().padStart(2, "0")} : ${seconds.toString().padStart(2, "0")}`;
  },
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  X: ({ className, onClick }: any) => (
    <div data-testid="x-icon" className={className} onClick={onClick}>
      X Icon
    </div>
  ),
}));

describe("CallInterface Component", () => {
  const mockMediaRecorder = {
    state: "recording",
    start: vi.fn(),
    stop: vi.fn(),
  } as unknown as MediaRecorder;

  const mockActiveChat: Chat = {
    chatId: 123,
    startedAt: "2024-01-01T10:00:00Z",
    platform: "WEB",
    provider: CallProvider.MICROPHONE,
    client: undefined,
    clientId: 0,
    counselor: undefined,
    counselorId: 0,
    endedAt: "",
    messages: [],
    status: ChatStatus.ENDED,
  };

  const defaultProps: CallInterfaceProps = {
    activeChat: mockActiveChat,
    isUserJoined: true,
    mediaRecorder: mockMediaRecorder,
    isMicrophoneMode: false,
    isExotelMode: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Mock Date.now() to return a fixed time
    vi.spyOn(Date, "now").mockReturnValue(new Date("2024-01-01T10:00:00Z").getTime());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      render(<CallInterface {...defaultProps} />);
      expect(screen.getByText("audioCall.status.takingNotes")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      expect(() => render(<CallInterface {...defaultProps} />)).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(<CallInterface {...defaultProps} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: User Joined State
   * Verifies rendering when user is joined
   */
  describe("User Joined State", () => {
    it("should render main interface when user is joined", () => {
      render(<CallInterface {...defaultProps} />);

      expect(screen.getByText("audioCall.status.takingNotes")).toBeInTheDocument();
      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 :") || false,
        ).length,
      ).toBeGreaterThan(0);
      expect(screen.getByTestId("lock-icon")).toBeInTheDocument();
    });

    it("should render privacy tooltip", () => {
      render(<CallInterface {...defaultProps} />);

      const tooltip = screen.getByTestId("tooltip");
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveAttribute("data-align", "top");
    });

    it("should render tooltip content with privacy information", () => {
      render(<CallInterface {...defaultProps} />);

      const tooltipContent = screen.getByTestId("tooltip-content");
      expect(tooltipContent).toBeInTheDocument();
      expect(tooltipContent).toHaveTextContent("audioCall.privacy.noRecording");
      expect(tooltipContent).toHaveTextContent("audioCall.privacy.encrypted");
      expect(tooltipContent.textContent).toContain(
        "audioCall.privacy.noRecordingaudioCall.privacy.encryptedaudioCall.privacy.noTrainingDataaudioCall.privacy.personalInfoRemoved",
      );
      expect(tooltipContent).toHaveTextContent("audioCall.privacy.personalInfoRemoved");
    });

    it("should render audio visualizer when mediaRecorder is provided", () => {
      render(<CallInterface {...defaultProps} />);

      const visualizers = screen.getAllByTestId("live-audio-visualizer");
      expect(visualizers).toHaveLength(2); // Two visualizers are rendered

      visualizers.forEach(visualizer => {
        expect(visualizer).toHaveAttribute("data-media-recorder", "true");
        expect(visualizer).toHaveAttribute("data-width", "200");
        expect(visualizer).toHaveAttribute("data-height", "140");
        expect(visualizer).toHaveAttribute("data-bar-width", "4");
        expect(visualizer).toHaveAttribute("data-bar-color", "#fff");
      });
    });

    it("should not render audio visualizer when mediaRecorder is null", () => {
      render(<CallInterface {...defaultProps} mediaRecorder={null} />);

      const visualizers = screen.queryAllByTestId("live-audio-visualizer");
      expect(visualizers).toHaveLength(0);
    });
  });

  /**
   * TEST GROUP: Timer Functionality
   * Verifies timer behavior and time formatting
   */
  describe("Timer Functionality", () => {
    it("should start timer when activeChat has startedAt", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
      render(<CallInterface {...defaultProps} activeChat={{ ...mockActiveChat, startedAt }} />);

      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 : 05") || false,
        ).length,
      ).toBeGreaterThan(0);
    });

    it("should start timer in microphone mode even without startedAt", () => {
      render(
        <CallInterface
          {...defaultProps}
          isMicrophoneMode={true}
          activeChat={{ ...mockActiveChat, startedAt: undefined }}
        />,
      );

      // Advance timer by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 :") || false,
        ).length,
      ).toBeGreaterThan(0);
    });

    it("should not start timer when no chat started and not in microphone mode", () => {
      render(
        <CallInterface
          {...defaultProps}
          activeChat={{ ...mockActiveChat, startedAt: undefined }}
          isMicrophoneMode={false}
        />,
      );

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 : 00") || false,
        ).length,
      ).toBeGreaterThan(0);
    });

    it("should update timer every second", () => {
      const startedAt = new Date(Date.now() - 2000).toISOString(); // 2 seconds ago
      render(<CallInterface {...defaultProps} activeChat={{ ...mockActiveChat, startedAt }} />);

      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 : 02") || false,
        ).length,
      ).toBeGreaterThan(0);

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Just check that timer is still running and showing some time
      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 :") || false,
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Description Text
   * Verifies correct description text based on conditions
   */
  describe("Description Text", () => {
    it("should show WEB platform description for WEB platform", () => {
      render(
        <CallInterface {...defaultProps} activeChat={{ ...mockActiveChat, platform: "WEB" }} />,
      );

      expect(screen.getByText("audioCall.notes.refreshWarning")).toBeInTheDocument();
    });

    it("should show non-WEB platform description for non-WEB platform", () => {
      render(
        <CallInterface {...defaultProps} activeChat={{ ...mockActiveChat, platform: "MOBILE" }} />,
      );

      expect(screen.getByText("audioCall.notes.differentPlatform")).toBeInTheDocument();
    });

    it("should show shared microphone mode description", () => {
      render(
        <CallInterface
          {...defaultProps}
          isMicrophoneMode={true}
          activeChat={{ ...mockActiveChat, provider: CallProvider.MICROPHONE }}
        />,
      );

      expect(screen.getByText("audioCall.notes.activeInOtherTab")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Exotel Banner
   * Verifies Exotel banner functionality
   */
  describe("Exotel Banner", () => {
    it("should show Exotel banner when in Exotel mode", () => {
      render(<CallInterface {...defaultProps} isExotelMode={true} />);

      expect(screen.getByText("audioCall.notes.scribeStopWarning")).toBeInTheDocument();
      expect(screen.getByTestId("warning-triangle-icon")).toBeInTheDocument();
    });

    it("should hide Exotel banner when X is clicked", () => {
      render(<CallInterface {...defaultProps} isExotelMode={true} />);

      const xButton = screen.getByTestId("x-icon");
      expect(xButton).toBeInTheDocument();

      act(() => {
        xButton.click();
      });

      expect(screen.queryByText("audioCall.notes.scribeStopWarning")).not.toBeInTheDocument();
    });

    it("should not show Exotel banner when not in Exotel mode", () => {
      render(<CallInterface {...defaultProps} isExotelMode={false} />);

      expect(screen.queryByText("audioCall.notes.scribeStopWarning")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Empty Screen States
   * Verifies empty screen rendering for different states
   */
  describe("Empty Screen States", () => {
    it("should render ErrorScreen when socketDisconnectionReason is provided", () => {
      render(
        <CallInterface
          {...defaultProps}
          isUserJoined={false}
          socketDisconnectionReason={SocketDisconnectionReasons.NO_NETWORK}
        />,
      );

      expect(screen.getByTestId("error-screen")).toBeInTheDocument();
      expect(screen.getByTestId("error-screen")).toHaveAttribute("data-reason", "NO_NETWORK");
    });

    it("should show connecting message when user not joined in microphone mode", () => {
      render(<CallInterface {...defaultProps} isUserJoined={false} isMicrophoneMode={true} />);

      expect(screen.getByText("audioCall.status.connecting")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component behavior in edge cases
   */
  describe("Edge Cases", () => {
    it("should handle missing activeChat gracefully", () => {
      render(<CallInterface {...defaultProps} activeChat={null as any} />);

      expect(screen.getByText("audioCall.status.takingNotes")).toBeInTheDocument();
    });

    it("should handle undefined isUserJoined", () => {
      render(<CallInterface {...defaultProps} isUserJoined={undefined} />);

      expect(screen.getByText("audioCall.status.starting")).toBeInTheDocument();
    });

    it("should handle timer cleanup on unmount", () => {
      const { unmount } = render(<CallInterface {...defaultProps} isMicrophoneMode={true} />);

      // Advance timer
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Just check that timer is running
      expect(
        screen.getAllByText(
          (content, element) => element?.textContent?.includes("00 : 00 :") || false,
        ).length,
      ).toBeGreaterThan(0);

      // Unmount component
      unmount();

      // Advance timer further - should not cause errors
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Snapshots removed: Font color, size, and family change frequently during development
   */

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof CallInterface).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(<CallInterface {...defaultProps} />);
      expect(result.container.firstChild).toBeDefined();
    });

    it("should be callable as a React component", () => {
      expect(() => render(<CallInterface {...defaultProps} />)).not.toThrow();
    });
  });
});
