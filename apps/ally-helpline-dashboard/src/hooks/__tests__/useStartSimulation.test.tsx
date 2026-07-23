import { renderHook, waitFor, act } from "@testing-library/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { logger } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation, useStartSimulationMutation } from "@api";
import { LOCAL_STORAGE_KEYS } from "@constants";
import userSlice from "@reducer/userReducer";

import { useStartSimulation } from "../useStartSimulation";

// Mock dependencies
vi.mock("sonner");
vi.mock("react-router-dom");
vi.mock("@ally-ui-mono/ui-shared", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  FEATURE_FLAGS_MAP: {
    PEER_REVIEW_FLAG: false,
  },
}));

const mockGetUser = vi.fn();
const mockGetPermissions = vi.fn();

vi.mock("@api", () => ({
  useStartSimulationMutation: vi.fn(),
  useEndSimulationMutation: vi.fn(),
  useLazyGetUserQuery: () => [mockGetUser, { isLoading: false }],
  useLazyGetPermissionsQuery: () => [mockGetPermissions, { isLoading: false }],
  useLazyGetUserPreferencesQuery: () => [
    vi.fn().mockResolvedValue({ data: { data: {} } }),
    { isLoading: false },
  ],
  useUpdateUserPreferencesMutation: () => [vi.fn()],
  useGetProfileImageUrlMutation: () => [vi.fn()],
  useDeleteProfileImageMutation: () => [vi.fn()],
  useUploadProfileImageMutation: () => [vi.fn()],
  useGetLogoUrlQuery: () => ({ data: null }),
  baseAPI: {
    reducerPath: "baseAPI",
    reducer: (state = {}, action: any) => state,
    middleware: (getDefaultMiddleware: any) => getDefaultMiddleware(),
    util: {
      resetApiState: vi.fn(),
    },
  },
}));

// Create a mock store for testing
const createTestStore = () =>
  configureStore({
    reducer: {
      user: userSlice.reducer,
    },
    preloadedState: {
      user: {
        isAuthenticated: true,
        user: { name: "Test User", id: 123, userId: 123 },
        permissions: [],
        availableChatTypes: [],
      },
    },
  });

describe("useStartSimulation", () => {
  const mockNavigate = vi.fn();
  const mockStartSimulationMutation = vi.fn();
  const mockEndSimulation = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    (useStartSimulationMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockStartSimulationMutation,
    ]);
    (useEndSimulationMutation as ReturnType<typeof vi.fn>).mockReturnValue([mockEndSimulation]);
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createTestStore()}>{children}</Provider>
  );

  it("should start simulation successfully", async () => {
    const mockData = {
      scenarioSession: {
        id: "session-123",
        startedAt: "2024-01-01T00:00:00Z",
      },
      accessToken: {
        token: "token-123",
        serverUrl: "https://server.example.com",
      },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(
      () =>
        useStartSimulation({
          onSuccess: mockOnSuccess,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
        metadata: { title: "Test Scenario", coverImageUrl: "https://example.com/image.jpg" },
      });
    });

    expect(mockStartSimulationMutation).toHaveBeenCalledWith({
      scenarioId: 1,
      scenarioPathSessionItemId: "path-123",
      languageId: 1,
      platform: "web",
    });
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/simulation/session-123/Test Scenario", {
      replace: false,
    });
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA)).toBeTruthy();
  });

  it("should handle 403 error", async () => {
    const mockError = {
      data: { statusCode: 403 },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });

    const { result } = renderHook(
      () =>
        useStartSimulation({
          onError: mockOnError,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    expect(toast.error).toHaveBeenCalledWith("You are not authorized to start this simulation");
    expect(mockOnError).toHaveBeenCalledWith(mockError);
  });

  it("should handle 400 error and end previous simulation", async () => {
    const mockError = {
      data: { statusCode: 400, entityId: "old-session-123" },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });
    mockEndSimulation.mockResolvedValue({});

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    expect(mockEndSimulation).toHaveBeenCalledWith({ sessionId: "old-session-123" });
    expect(toast.success).toHaveBeenCalledWith("Previous simulation ended. Starting new one...");
  });

  it("should handle generic error", async () => {
    const mockError = {
      data: { statusCode: 500 },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to start simulation");
  });

  it("should handle unexpected errors", async () => {
    mockStartSimulationMutation.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () =>
        useStartSimulation({
          onError: mockOnError,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    expect(logger.error).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred");
    expect(mockOnError).toHaveBeenCalled();
  });

  it("should not start if already starting", async () => {
    const mockData = {
      scenarioSession: {
        id: "session-123",
        startedAt: "2024-01-01T00:00:00Z",
      },
      accessToken: {
        token: "token-123",
        serverUrl: "https://server.example.com",
      },
    };

    // Simulate a slow API call
    let resolveFirst: (value: any) => void;
    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve;
    });

    mockStartSimulationMutation.mockImplementation(() => firstPromise);

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    // Start first simulation
    act(() => {
      result.current.startSimulation({
        params: {
          scenarioId: 1,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isStarting).toBe(true);
    });

    // Try to start second simulation (should be blocked)
    act(() => {
      result.current.startSimulation({
        params: {
          scenarioId: 2,
          scenarioPathSessionItemId: "path-123",
          languageId: 1,
        },
      });
    });

    // Resolve the first call
    await act(async () => {
      resolveFirst!({ data: mockData, error: null });
      // Wait a bit for the promise to resolve
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // Should only be called once because second call was blocked
    expect(mockStartSimulationMutation).toHaveBeenCalledTimes(1);
    expect(mockStartSimulationMutation).toHaveBeenCalledWith({
      scenarioId: 1,
      scenarioPathSessionItemId: "path-123",
      languageId: 1,
      platform: "web",
    });
  });

  it("should store room data in localStorage with metadata", async () => {
    const mockData = {
      scenarioSession: {
        id: "session-123",
        startedAt: "2024-01-01T00:00:00Z",
      },
      scenario: {
        id: "scenario-123",
        title: "Test Scenario",
        coverImageUrl: "https://example.com/image.jpg",
        triggerWarnings: [],
        metadata: {
          name: "Test Character",
        },
      },
      accessToken: {
        token: "token-123",
        serverUrl: "https://server.example.com",
      },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({
        params: { scenarioId: 1, languageId: 1 },
        metadata: { title: "Test Scenario", coverImageUrl: "https://example.com/image.jpg" },
      });
    });

    const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}");
    // Update expectations to match what the hook actually writes (including localParticipant/remoteParticipant structure)
    expect(storedData).toMatchObject({
      roomId: "scenario-123",
      title: "Test Scenario",
      remoteParticipant: {
        name: "Test Character",
        coverImageUrl: "https://example.com/image.jpg",
      },
      localParticipant: {
        name: "Test User",
      },
      accessToken: "token-123",
      createdAt: "2024-01-01T00:00:00Z",
      serverUrl: "https://server.example.com",
    });
  });

  it("stores reminders when remindersEnabled is true", async () => {
    const mockData = {
      scenarioSession: { id: "session-123", startedAt: "2024-01-01T00:00:00Z" },
      scenario: {
        id: "scenario-123",
        title: "Test Scenario",
        reminders: ["Maintain eye contact", "Ask open-ended questions"],
        remindersEnabled: true,
      },
      accessToken: { token: "token-123", serverUrl: "https://server.example.com" },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({ params: { scenarioId: 1, languageId: 1 } });
    });

    const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}");
    expect(storedData.reminders).toEqual(["Maintain eye contact", "Ask open-ended questions"]);
  });

  it("does not store reminders when remindersEnabled is false", async () => {
    const mockData = {
      scenarioSession: { id: "session-123", startedAt: "2024-01-01T00:00:00Z" },
      scenario: {
        id: "scenario-123",
        title: "Test Scenario",
        reminders: ["Maintain eye contact"],
        remindersEnabled: false,
      },
      accessToken: { token: "token-123", serverUrl: "https://server.example.com" },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({ params: { scenarioId: 1, languageId: 1 } });
    });

    const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}");
    expect(storedData.reminders).toEqual([]);
  });

  it("does not store reminders when remindersEnabled is undefined", async () => {
    const mockData = {
      scenarioSession: { id: "session-123", startedAt: "2024-01-01T00:00:00Z" },
      scenario: {
        id: "scenario-123",
        title: "Test Scenario",
        reminders: ["Maintain eye contact"],
      },
      accessToken: { token: "token-123", serverUrl: "https://server.example.com" },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useStartSimulation(), { wrapper });

    await act(async () => {
      await result.current.startSimulation({ params: { scenarioId: 1, languageId: 1 } });
    });

    const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}");
    expect(storedData.reminders).toEqual([]);
  });
});
