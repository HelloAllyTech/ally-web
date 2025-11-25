import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { logger } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation, useStartSimulationMutation } from "@api";
import { LOCAL_STORAGE_KEYS } from "@constants";

import { useStartSimulation } from "../useStartSimulation";

// Mock dependencies
vi.mock("sonner");
vi.mock("react-router-dom");
vi.mock("@ally-ui-mono/ui-shared");
vi.mock("@api");

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

    const { result } = renderHook(() =>
      useStartSimulation({
        onSuccess: mockOnSuccess,
      }),
    );

    await result.current.startSimulation({
      params: { scenarioId: 1, scenarioPathSessionItemId: "path-123" },
      metadata: { title: "Test Scenario", coverImageUrl: "https://example.com/image.jpg" },
    });

    await waitFor(() => {
      expect(mockStartSimulationMutation).toHaveBeenCalledWith({
        scenarioId: 1,
        scenarioPathSessionItemId: "path-123",
      });
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/simulation/session-123");
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA)).toBeTruthy();
    });
  });

  it("should handle 403 error", async () => {
    const mockError = {
      data: { statusCode: 403 },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });

    const { result } = renderHook(() =>
      useStartSimulation({
        onError: mockOnError,
      }),
    );

    await result.current.startSimulation({ params: { scenarioId: 1 } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("You are not authorized to start this simulation");
      expect(mockOnError).toHaveBeenCalledWith(mockError);
    });
  });

  it("should handle 400 error and end previous simulation", async () => {
    const mockError = {
      data: { statusCode: 400, entityId: "old-session-123" },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });
    mockEndSimulation.mockResolvedValue({});

    const { result } = renderHook(() => useStartSimulation());

    await result.current.startSimulation({ params: { scenarioId: 1 } });

    await waitFor(() => {
      expect(mockEndSimulation).toHaveBeenCalledWith({ sessionId: "old-session-123" });
      expect(toast.success).toHaveBeenCalledWith("Previous simulation ended. Starting new one...");
    });
  });

  it("should handle generic error", async () => {
    const mockError = {
      data: { statusCode: 500 },
    };

    mockStartSimulationMutation.mockResolvedValue({ data: null, error: mockError });

    const { result } = renderHook(() => useStartSimulation());

    await result.current.startSimulation({ params: { scenarioId: 1 } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to start simulation");
    });
  });

  it("should handle unexpected errors", async () => {
    mockStartSimulationMutation.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useStartSimulation({
        onError: mockOnError,
      }),
    );

    await result.current.startSimulation({ params: { scenarioId: 1 } });

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred");
      expect(mockOnError).toHaveBeenCalled();
    });
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

    const { result } = renderHook(() => useStartSimulation());

    // Start first simulation
    result.current.startSimulation({ params: { scenarioId: 1 } });

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.isStarting).toBe(true);
    });

    // Try to start second simulation (should be blocked)
    result.current.startSimulation({ params: { scenarioId: 2 } });

    // Resolve the first call
    resolveFirst!({ data: mockData, error: null });

    // Wait a bit for the promise to resolve
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should only be called once because second call was blocked
    expect(mockStartSimulationMutation).toHaveBeenCalledTimes(1);
    expect(mockStartSimulationMutation).toHaveBeenCalledWith({
      scenarioId: 1,
    });
  });

  it("should store room data in localStorage with metadata", async () => {
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

    const { result } = renderHook(() => useStartSimulation());

    await result.current.startSimulation({
      params: { scenarioId: 1 },
      metadata: { title: "Test Scenario", coverImageUrl: "https://example.com/image.jpg" },
    });

    await waitFor(() => {
      const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}");
      expect(storedData).toEqual({
        roomId: "session-123",
        name: "Test Scenario",
        coverImageUrl: "https://example.com/image.jpg",
        accessToken: "token-123",
        createdAt: "2024-01-01T00:00:00Z",
        serverUrl: "https://server.example.com",
      });
    });
  });
});
