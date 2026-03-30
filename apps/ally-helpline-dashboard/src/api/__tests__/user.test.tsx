import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { baseAPI } from "../baseAPI";

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
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
}));

// Mock types
vi.mock("@types", () => ({
  UserPreferences: {},
}));

// Import hooks after mocks
import { useGetUserPreferencesQuery, useUpdateUserPreferencesMutation } from "../user";

describe("User API", () => {
  // Create a test store with RTK Query middleware
  const createTestStore = () => {
    return configureStore({
      reducer: {
        [baseAPI.reducerPath]: baseAPI.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
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

  describe("exports", () => {
    it("should export useGetUserPreferencesQuery hook", () => {
      expect(useGetUserPreferencesQuery).toBeDefined();
      expect(typeof useGetUserPreferencesQuery).toBe("function");
    });

    it("should export useUpdateUserPreferencesMutation hook", () => {
      expect(useUpdateUserPreferencesMutation).toBeDefined();
      expect(typeof useUpdateUserPreferencesMutation).toBe("function");
    });
  });

  describe("getUserPreferences", () => {
    it("should render hook without errors", () => {
      const { result } = renderHook(() => useGetUserPreferencesQuery(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });
  });

  describe("updateUserPreferences", () => {
    it("should render mutation hook without errors", () => {
      const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveLength(2);
      const [trigger, state] = result.current;
      expect(typeof trigger).toBe("function");
      expect(state).toBeDefined();
    });

    it("should have trigger function that can be called", () => {
      const { result } = renderHook(() => useUpdateUserPreferencesMutation(), {
        wrapper: TestWrapper,
      });

      const [trigger] = result.current;
      expect(() => trigger({ default_language_id: 1 })).not.toThrow();
    });
  });
});
