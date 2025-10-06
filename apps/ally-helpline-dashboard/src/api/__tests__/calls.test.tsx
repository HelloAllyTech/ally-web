import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import { baseAPI } from "../baseAPI";
import {
  useGetCallLogsQuery,
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetChatTypesQuery,
} from "../calls";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    CALLS: {
      GET_CALL_LOGS: "/calls/logs",
      GET_ADMIN_CALL_LOGS: "/calls/admin-logs",
      GET_COUNSELLORS: "/calls/counsellors",
      GET_CALL_TAGS: "/calls/tags",
      GET_CHAT_TYPES: "/calls/chat-types",
    },
  },
  HttpMethod: {
    GET: "GET",
  },
}));

// Mock types
vi.mock("@types", () => ({
  CallLog: {},
  AdminCallLog: {},
  Counsellor: {},
  CallTag: {},
  CallType: {},
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

describe("calls API", () => {
  it("should export correct hooks", () => {
    expect(useGetCallLogsQuery).toBeDefined();
    expect(useGetAdminCallLogsQuery).toBeDefined();
    expect(useGetCounsellorsQuery).toBeDefined();
    expect(useGetCallTagsQuery).toBeDefined();
    expect(useGetChatTypesQuery).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useGetCallLogsQuery).toBe("function");
    expect(typeof useGetAdminCallLogsQuery).toBe("function");
    expect(typeof useGetCounsellorsQuery).toBe("function");
    expect(typeof useGetCallTagsQuery).toBe("function");
    expect(typeof useGetChatTypesQuery).toBe("function");
  });

  it("should render call logs query hook without errors", () => {
    const { result } = renderHook(() => useGetCallLogsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render admin call logs query hook without errors", () => {
    const { result } = renderHook(() => useGetAdminCallLogsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render counsellors query hook without errors", () => {
    const { result } = renderHook(() => useGetCounsellorsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render call tags query hook without errors", () => {
    const { result } = renderHook(() => useGetCallTagsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render chat types query hook without errors", () => {
    const { result } = renderHook(() => useGetChatTypesQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle call logs query with parameters", () => {
    const { result } = renderHook(
      () =>
        useGetCallLogsQuery({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
          counsellorId: "counsellor123",
        }),
      {
        wrapper: TestWrapper,
      },
    );

    expect(result.current).toBeDefined();
  });

  it("should handle admin call logs query with parameters", () => {
    const { result } = renderHook(
      () =>
        useGetAdminCallLogsQuery({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
          counsellorId: "counsellor123",
        }),
      {
        wrapper: TestWrapper,
      },
    );

    expect(result.current).toBeDefined();
  });

  it("should handle counsellors query without parameters", () => {
    const { result } = renderHook(() => useGetCounsellorsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle call tags query without parameters", () => {
    const { result } = renderHook(() => useGetCallTagsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle chat types query without parameters", () => {
    const { result } = renderHook(() => useGetChatTypesQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });
});
