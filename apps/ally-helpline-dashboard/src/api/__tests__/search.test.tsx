import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import { baseAPI } from "../baseAPI";
import { useGetSearchResultsMutation, useGetCategoriesQuery } from "../search";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    SEARCH: {
      GET_SEARCH_RESULTS: "/search/results",
      GET_CATEGORIES: "/search/categories",
    },
  },
  HttpMethod: {
    GET: "GET",
    POST: "POST",
  },
}));

// Mock types
vi.mock("@types", () => ({
  SearchRequest: {},
  SearchResponse: {},
  SearchCategory: {},
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

describe("search API", () => {
  it("should export correct hooks", () => {
    expect(useGetSearchResultsMutation).toBeDefined();
    expect(useGetCategoriesQuery).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useGetSearchResultsMutation).toBe("function");
    expect(typeof useGetCategoriesQuery).toBe("function");
  });

  it("should render search results mutation hook without errors", () => {
    const { result } = renderHook(() => useGetSearchResultsMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render categories query hook without errors", () => {
    const { result } = renderHook(() => useGetCategoriesQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle search results trigger", () => {
    const { result } = renderHook(() => useGetSearchResultsMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        query: "test search",
        category: "general",
      }),
    ).not.toThrow();
  });

  it("should handle search with different parameters", () => {
    const { result } = renderHook(() => useGetSearchResultsMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() =>
      trigger({
        query: "mental health",
        category: "health",
        filters: { type: "article" },
      }),
    ).not.toThrow();
  });

  it("should handle categories query without parameters", () => {
    const { result } = renderHook(() => useGetCategoriesQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle search with empty query", () => {
    const { result } = renderHook(() => useGetSearchResultsMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() =>
      trigger({
        query: "",
        category: "all",
      }),
    ).not.toThrow();
  });

  it("should handle search with complex filters", () => {
    const { result } = renderHook(() => useGetSearchResultsMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(() =>
      trigger({
        query: "counselling techniques",
        category: "professional",
        filters: {
          type: "video",
          difficulty: "intermediate",
          duration: "short",
        },
      }),
    ).not.toThrow();
  });
});
