import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import {
  useLazyGetDashboardUrlQuery,
  useLazyGetDashboardsQuery,
  useLazyGetCounsellorStatsQuery,
} from "../analytics";
import { baseAPI } from "../baseAPI";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    ANALYTICS: {
      GET_DASHBOARD: "/analytics/dashboard",
      GET_COUNSELLOR_STATS: "/analytics/counsellor-stats",
    },
  },
  HttpMethod: {
    GET: "GET",
  },
}));

// Mock types
vi.mock("@types", () => ({
  GetDashboardUrlResponse: {},
  GetDashboardsResponse: {},
  GetCounsellorStatsResponse: {},
}));

// Create a test store
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

describe("analytics API", () => {
  it("should export correct hooks", () => {
    expect(useLazyGetDashboardUrlQuery).toBeDefined();
    expect(useLazyGetDashboardsQuery).toBeDefined();
    expect(useLazyGetCounsellorStatsQuery).toBeDefined();
  });

  it("should have correct query configurations", () => {
    // Test that the hooks are properly configured
    expect(typeof useLazyGetDashboardUrlQuery).toBe("function");
    expect(typeof useLazyGetDashboardsQuery).toBe("function");
    expect(typeof useLazyGetCounsellorStatsQuery).toBe("function");
  });

  it("should render hooks without errors", () => {
    const { result: dashboardResult } = renderHook(() => useLazyGetDashboardUrlQuery(), {
      wrapper: TestWrapper,
    });

    const { result: dashboardsResult } = renderHook(() => useLazyGetDashboardsQuery(), {
      wrapper: TestWrapper,
    });

    const { result: statsResult } = renderHook(() => useLazyGetCounsellorStatsQuery(), {
      wrapper: TestWrapper,
    });

    // Verify hooks return the expected structure
    expect(dashboardResult.current).toHaveLength(3); // [trigger, result, lastPromise]
    expect(dashboardsResult.current).toHaveLength(3);
    expect(statsResult.current).toHaveLength(3);
  });

  it("should handle trigger functions", () => {
    const { result: dashboardResult } = renderHook(() => useLazyGetDashboardUrlQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = dashboardResult.current;

    // Test that trigger is a function
    expect(typeof trigger).toBe("function");

    // Test calling trigger with parameters
    expect(() => trigger({ dashboardId: "test-id" })).not.toThrow();
  });

  it("should handle dashboards trigger", () => {
    const { result: dashboardsResult } = renderHook(() => useLazyGetDashboardsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = dashboardsResult.current;

    // Test that trigger is a function
    expect(typeof trigger).toBe("function");

    // Test calling trigger without parameters
    expect(() => trigger()).not.toThrow();
  });

  it("should handle counsellor stats trigger with params", () => {
    const { result: statsResult } = renderHook(() => useLazyGetCounsellorStatsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = statsResult.current;

    // Test that trigger is a function
    expect(typeof trigger).toBe("function");

    // Test calling trigger with parameters
    expect(() => trigger({ startDate: "2023-01-01", endDate: "2023-01-31" })).not.toThrow();
  });

  it("should handle counsellor stats trigger without params", () => {
    const { result: statsResult } = renderHook(() => useLazyGetCounsellorStatsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = statsResult.current;

    // Test that trigger is a function
    expect(typeof trigger).toBe("function");

    // Test calling trigger without parameters
    expect(() => trigger()).not.toThrow();
  });

  it("should handle different dashboard IDs", () => {
    const { result: dashboardResult } = renderHook(() => useLazyGetDashboardUrlQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = dashboardResult.current;

    // Test with different dashboard IDs
    expect(() => trigger({ dashboardId: "dashboard-123" })).not.toThrow();
    expect(() => trigger({ dashboardId: "another-dashboard" })).not.toThrow();
  });

  it("should handle various counsellor stats parameters", () => {
    const { result: statsResult } = renderHook(() => useLazyGetCounsellorStatsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = statsResult.current;

    // Test with various parameters
    expect(() =>
      trigger({
        startDate: "2023-02-01",
        endDate: "2023-02-28",
      }),
    ).not.toThrow();

    expect(() =>
      trigger({
        startDate: "2023-03-01",
        endDate: "2023-03-31",
      }),
    ).not.toThrow();
  });
});
