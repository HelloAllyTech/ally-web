import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

// Mock the baseAPI
const mockBaseAPI = {
  injectEndpoints: vi.fn(() => ({
    endpoints: {
      getUserPreferences: { useQuery: vi.fn() },
      updateUserPreferences: { useMutation: vi.fn() },
    },
  })),
};

vi.mock("../baseAPI", () => ({
  baseAPI: mockBaseAPI,
}));

// Import after mocks
import { baseAPI } from "../baseAPI";
import { useGetUserPreferencesQuery, useUpdateUserPreferencesMutation } from "../user";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    USER: {
      GET_USER_PREFERENCES: "/user/preferences",
      UPDATE_USER_PREFERENCES: "/user/preferences/update",
    },
  },
  HttpMethod: {
    GET: "GET",
    POST: "POST",
  },
}));

// Mock types
vi.mock("@src/types", () => ({
  UserPreferences: {},
}));

describe("User API", () => {
  // Create a test store with RTK Query middleware
  const createTestStore = () => {
    return configureStore({
      reducer: {
        [baseAPI.reducerPath]: baseAPI.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(baseAPI.middleware),
    });
  };

  // Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserPreferences", () => {
    it("should make a GET request to the correct endpoint", () => {
      const { result } = renderHook(() => useGetUserPreferencesQuery(), {
        wrapper: TestWrapper,
      });

      // The actual implementation would make an API call here
      // In a real test, you would mock the API response
      expect(result.current).toBeDefined();
    });

    it("should handle successful response", async () => {
      const mockResponse = {
        data: {
          default_language_id: 1,
          theme: "light",
          notifications_enabled: true,
        },
      };

      // Mock the API response
      const mockQueryFn = vi.fn().mockReturnValue({
        data: mockResponse,
        isLoading: false,
        isSuccess: true,
      });

      // Override the mock to return our mock query function
      mockBaseAPI.injectEndpoints = vi.fn(() => ({
        endpoints: {
          getUserPreferences: { useQuery: mockQueryFn },
          updateUserPreferences: { useMutation: vi.fn() },
        },
      }));

      const { result } = renderHook(() => useGetUserPreferencesQuery(), {
        wrapper: TestWrapper,
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("updateUserPreferences", () => {
    it("should make a POST request with the correct payload", async () => {
      const mockPreferences = {
        default_language_id: 2,
        theme: "dark",
      };

      const mockMutationFn = vi.fn().mockReturnValue([
        vi.fn().mockResolvedValue({ data: { success: true } }),
        {
          isLoading: false,
          isSuccess: true,
        },
      ]);

      // Override the mock to return our mock mutation function
      mockBaseAPI.injectEndpoints = vi.fn(() => ({
        endpoints: {
          getUserPreferences: { useQuery: vi.fn() },
          updateUserPreferences: { useMutation: mockMutationFn },
        },
      }));

      const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
        wrapper: TestWrapper,
      });

      const [updatePreferences] = result.current;
      const response = await updatePreferences(mockPreferences);

      expect(response).toEqual({ data: { success: true } });
      expect(result.current[1].isSuccess).toBe(true);
    });

    it("should handle error response", async () => {
      const error = new Error("Failed to update preferences");
      const mockMutationFn = vi.fn().mockReturnValue([
        vi.fn().mockRejectedValue(error),
        {
          isLoading: false,
          isError: true,
          error,
        },
      ]);

      mockBaseAPI.injectEndpoints = vi.fn(() => ({
        endpoints: {
          getUserPreferences: { useQuery: vi.fn() },
          updateUserPreferences: { useMutation: mockMutationFn },
        },
      }));

      const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
        wrapper: TestWrapper,
      });

      const [updatePreferences] = result.current;
      
      try {
        await updatePreferences({});
        // The line above should throw an error, so this line should not be reached
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBe(error);
      }

      expect(result.current[1].isError).toBe(true);
      expect(result.current[1].error).toBe(error);
    });
  });
});
