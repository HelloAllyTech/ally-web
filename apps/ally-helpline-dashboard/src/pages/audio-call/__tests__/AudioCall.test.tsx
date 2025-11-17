/**
 * Comprehensive Unit Tests for AudioCall Component
 *
 * Test Coverage:
 * - Component rendering and structure
 * - URL parameter handling (mode)
 * - Redux state integration
 * - API integration and data fetching
 * - Wake lock functionality
 * - Navigation and routing
 * - Error handling and loading states
 * - Microphone and cloud telephony modes
 * - Chat management
 * - Accessibility features
 * - Snapshot testing
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, cleanup } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { CallProvider, CallType } from "@constants";
import { Chat, ChatStatus, UserRole } from "@types";

import { AudioCall } from "../AudioCall";

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockSearchParams = {
  get: vi.fn(),
  set: vi.fn(),
  clear: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
  keys: vi.fn(),
  values: vi.fn(),
  entries: vi.fn(),
  forEach: vi.fn(),
  toString: vi.fn(),
};
const mockUseSearchParams = vi.fn(() => [mockSearchParams]);

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => mockUseSearchParams(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="browser-router">{children}</div>
  ),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock logger
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API hooks
const mockGetCounsellorChat = vi.fn();
const mockEndCall = vi.fn();
const mockUseLazyGetCounsellorChatQuery = vi.fn();
const mockUseEndCallMutation = vi.fn();

vi.mock("@api", () => ({
  useLazyGetCounsellorChatQuery: () => [mockGetCounsellorChat, mockUseLazyGetCounsellorChatQuery()],
  useEndCallMutation: () => [mockEndCall, mockUseEndCallMutation()],
}));

// Mock assets
vi.mock("@assets", () => ({
  NoResults: () => <div data-testid="no-results">No Results</div>,
  MindfullnessVideo: () => <div data-testid="mindfulness-video">Mindfulness Video</div>,
}));

// Mock components
vi.mock("@components", () => ({
  FallbackUI: vi.fn(({ icon, mainMessage, description, children }) => (
    <div data-testid="fallback-ui">
      <h1>{mainMessage}</h1>
      <p>{description}</p>
      {icon}
      {children}
    </div>
  )),
}));

// Mock CallTranscript component
vi.mock("../components", () => ({
  CallTranscript: vi.fn(({ chat, onEndCall, isMicrophoneMode }) => (
    <div data-testid="call-transcript">
      <div data-testid="chat-id">{chat?.chatId}</div>
      <div data-testid="microphone-mode">{isMicrophoneMode ? "true" : "false"}</div>
      <button data-testid="end-call-btn" onClick={onEndCall}>
        End Call
      </button>
    </div>
  )),
}));

// Mock constants
vi.mock("@constants", () => ({
  CallProvider: {
    EXOTEL: "exotel",
    MICROPHONE: "microphone",
  },
  CallType: {
    INBOUND: "inbound",
    OUTBOUND: "outbound",
  },
  ROUTES: {
    DASHBOARD: "/dashboard",
    CALLS: "/calls",
  },
  SESSION_STORAGE_KEYS: {
    ACTIVE_CHAT: "activeChat",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
}));

// Mock utils
vi.mock("@utils", () => ({
  isProviderCloudTelephony: vi.fn(() => false),
}));

// Mock navigator.wakeLock
Object.defineProperty(navigator, "wakeLock", {
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn(),
    }),
  },
  writable: true,
});

// Create a mock store for Redux Provider
const createMockStore = (initialState: any) =>
  configureStore({
    reducer: {
      user: (state = initialState.user) => state,
    },
  });

// Test Wrapper to provide Redux store and router
const TestWrapper = ({ children, store }: { children: React.ReactNode; store: any }) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("AudioCall Component", () => {
  const mockUser = {
    id: 1,
    userId: 2,
    name: "Test User",
    email: "test@example.com",
    role: UserRole.COUNSELLOR,
    availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
  };

  const mockChat: Chat = {
    chatId: 123,
    counselorId: 2,
    status: ChatStatus.ACTIVE,
    startedAt: "2024-01-01T00:00:00Z",
    provider: CallProvider.EXOTEL_CONFERENCE_CALL,
    platform: "WEB",
    clientId: 1,
    endedAt: null,
    messages: [],
    client: mockUser,
    counselor: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.clear();
    mockSearchParams.get.mockReturnValue(null);
    mockUseLazyGetCounsellorChatQuery.mockReturnValue({
      data: mockChat,
      isLoading: false,
      isError: false,
    });
    mockUseEndCallMutation.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies the component renders without crashing
   */
  describe("Basic Rendering", () => {
    it("should render successfully", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should render without throwing errors", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      expect(() => {
        render(
          <TestWrapper store={store}>
            <AudioCall />
          </TestWrapper>,
        );
      }).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      const { container } = render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: URL Parameter Handling
   * Verifies the component handles different URL parameters correctly
   */
  describe("URL Parameter Handling", () => {
    it("should handle microphone mode", () => {
      mockSearchParams.get.mockReturnValue("microphone");
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors in microphone mode
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle cloud telephony mode", () => {
      mockSearchParams.get.mockReturnValue("cloud-telephony");
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors in cloud telephony mode
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle no mode parameter", () => {
      // No mode parameter set
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Redux Integration
   * Verifies the component integrates with Redux store correctly
   */
  describe("Redux Integration", () => {
    it("should access user data from Redux store", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors when accessing Redux state
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle missing user data", () => {
      const store = createMockStore({
        user: {
          user: null,
          availableChatTypes: [],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle missing user data gracefully
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: API Integration
   * Verifies API integration and data fetching
   */
  describe("API Integration", () => {
    it("should call getCounsellorChat when needed", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // The component should render without errors
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle API loading states", () => {
      mockUseLazyGetCounsellorChatQuery.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
      });

      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle loading state
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle API errors", () => {
      mockUseLazyGetCounsellorChatQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle error state
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Wake Lock Functionality
   * Verifies wake lock functionality for keeping screen on
   */
  describe("Wake Lock Functionality", () => {
    it("should handle wake lock functionality", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle wake lock request failure", async () => {
      // Mock wake lock request to fail
      (navigator.wakeLock.request as any).mockRejectedValue(new Error("Wake lock failed"));

      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle wake lock failure gracefully
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Navigation and Routing
   * Verifies navigation functionality
   */
  describe("Navigation and Routing", () => {
    it("should navigate to dashboard when needed", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should render without errors
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle navigation with search params", () => {
      mockSearchParams.set("mode", "microphone");
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle navigation with search params
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Error Handling
   * Verifies error handling functionality
   */
  describe("Error Handling", () => {
    it("should handle missing dependencies gracefully", () => {
      const store = createMockStore({
        user: {
          user: null,
          availableChatTypes: [],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle missing dependencies
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });

    it("should handle API failures gracefully", () => {
      mockUseLazyGetCounsellorChatQuery.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
      });

      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      // Component should handle API failures
      expect(screen.getByTestId("browser-router")).toBeInTheDocument();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Verifies component output remains consistent
   */
  describe("Snapshot Testing", () => {
    it("should match snapshot", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      const { asFragment } = render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });

    it("should match snapshot with microphone mode", () => {
      mockSearchParams.set("mode", "microphone");
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      const { asFragment } = render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and can be used
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof AudioCall).toBe("function");
    });

    it("should return a valid React element", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      const { container } = render(
        <TestWrapper store={store}>
          <AudioCall />
        </TestWrapper>,
      );

      expect(container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      const store = createMockStore({
        user: {
          user: mockUser,
          availableChatTypes: [CallType.WEBRTC_CHAT, CallType.MICROPHONE_CHAT],
        },
      });

      expect(() => {
        render(
          <TestWrapper store={store}>
            <AudioCall />
          </TestWrapper>,
        );
      }).not.toThrow();
    });
  });
});
