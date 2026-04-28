import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, afterEach } from "vitest";

import { baseAPI } from "../baseAPI";
import {
  useGetSummaryFieldsQuery,
  useGetCallSummaryQuery,
  useUpdateCallSummaryMutation,
  useEnhanceContentMutation,
  useGetTagsMutation,
  useUpdateCallInfoMutation,
  useLazyExportCallSummaryQuery,
  useGetLocationsQuery,
  useLazySearchLocationsQuery,
  useGetTranscriptQuery,
  useUpdateCallSummaryNotesMutation,
  useSubmitCallFeedbackMutation,
} from "../callSummary";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    CALL_SUMMARY: {
      GET_CALL_SUMMARY: "/call-summary",
      UPDATE_CALL_SUMMARY: "/call-summary/update",
      ENHANCE_CONTENT: "/call-summary/enhance",
      GET_TAGS: "/call-summary/tags",
      UPDATE_CALL_INFO: "/call-summary/update-info",
      EXPORT_CALL_SUMMARY: "/call-summary/export",
      GET_LOCATIONS: "/call-summary/locations",
      SEARCH_LOCATIONS: "/call-summary/search-locations",
      GET_TRANSCRIPT: "/call-summary/transcript",
      UPDATE_NOTES: "/call-summary/update-notes",
      SUBMIT_FEEDBACK: "/call-summary/submit-feedback",
    },
  },
  HttpMethod: {
    GET: "GET",
    POST: "POST",
    PUT: "PUT",
  },
  TAG_TYPES: {
    CALL_SUMMARY: "CallSummary",
    CALL_LOGS: "CallLogs",
    SIMULATION_LOGS: "SimulationLogs",
  },
}));

// Mock types
vi.mock("@types", () => ({
  CallSummary: {},
  UpdateCallSummaryRequest: {},
  UpdateCallSummaryResponse: {},
  EnhanceContentRequest: {},
  EnhanceContentResponse: {},
  GetTagsResponse: {},
  UpdateCallInfoRequest: {},
  UpdateCallInfoResponse: {},
  ExportCallSummaryRequest: {},
  ExportCallSummaryResponse: {},
  Location: {},
  SearchLocationsRequest: {},
  SearchLocationsResponse: {},
  Transcript: {},
  UpdateCallSummaryNotesRequest: {},
  UpdateCallSummaryNotesResponse: {},
  SubmitCallFeedbackRequest: {},
  SubmitCallFeedbackResponse: {},
}));

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={testStore}>{children}</Provider>
);

describe("callSummary API", () => {
  afterEach(() => {
    testStore.dispatch(baseAPI.util.resetApiState());
  });
  it("should export correct hooks", () => {
    expect(useGetSummaryFieldsQuery).toBeDefined();
    expect(useGetCallSummaryQuery).toBeDefined();
    expect(useUpdateCallSummaryMutation).toBeDefined();
    expect(useEnhanceContentMutation).toBeDefined();
    expect(useGetTagsMutation).toBeDefined();
    expect(useUpdateCallInfoMutation).toBeDefined();
    expect(useLazyExportCallSummaryQuery).toBeDefined();
    expect(useGetLocationsQuery).toBeDefined();
    expect(useLazySearchLocationsQuery).toBeDefined();
    expect(useGetTranscriptQuery).toBeDefined();
    expect(useUpdateCallSummaryNotesMutation).toBeDefined();
    expect(useSubmitCallFeedbackMutation).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useGetSummaryFieldsQuery).toBe("function");
    expect(typeof useGetCallSummaryQuery).toBe("function");
    expect(typeof useUpdateCallSummaryMutation).toBe("function");
    expect(typeof useEnhanceContentMutation).toBe("function");
    expect(typeof useGetTagsMutation).toBe("function");
    expect(typeof useUpdateCallInfoMutation).toBe("function");
    expect(typeof useLazyExportCallSummaryQuery).toBe("function");
    expect(typeof useGetLocationsQuery).toBe("function");
    expect(typeof useLazySearchLocationsQuery).toBe("function");
    expect(typeof useGetTranscriptQuery).toBe("function");
    expect(typeof useUpdateCallSummaryNotesMutation).toBe("function");
    expect(typeof useSubmitCallFeedbackMutation).toBe("function");
  });

  it("should render call summary query hook without errors", () => {
    const { result } = renderHook(() => useGetCallSummaryQuery("call123"), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render summary fields query hook without errors", () => {
    const { result } = renderHook(() => useGetSummaryFieldsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render update call summary mutation hook without errors", () => {
    const { result } = renderHook(() => useUpdateCallSummaryMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render enhance content mutation hook without errors", () => {
    const { result } = renderHook(() => useEnhanceContentMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render get tags mutation hook without errors", () => {
    const { result } = renderHook(() => useGetTagsMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render update call info mutation hook without errors", () => {
    const { result } = renderHook(() => useUpdateCallInfoMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render export call summary query hook without errors", () => {
    const { result } = renderHook(() => useLazyExportCallSummaryQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render locations query hook without errors", () => {
    const { result } = renderHook(() => useGetLocationsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render search locations query hook without errors", () => {
    const { result } = renderHook(() => useLazySearchLocationsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render transcript query hook without errors", () => {
    const { result } = renderHook(() => useGetTranscriptQuery("call123"), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render update notes mutation hook without errors", () => {
    const { result } = renderHook(() => useUpdateCallSummaryNotesMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render submit feedback mutation hook without errors", () => {
    const { result } = renderHook(() => useSubmitCallFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should handle summary fields query", () => {
    const { result } = renderHook(() => useGetSummaryFieldsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle update call summary trigger", () => {
    const { result } = renderHook(() => useUpdateCallSummaryMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        summary: "Updated summary",
      }),
    ).not.toThrow();
  });

  it("should handle enhance content trigger", () => {
    const { result } = renderHook(() => useEnhanceContentMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        content: "Original content",
        enhancementType: "grammar",
      }),
    ).not.toThrow();
  });

  it("should handle get tags trigger", () => {
    const { result } = renderHook(() => useGetTagsMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ content: "Content to tag" })).not.toThrow();
  });

  it("should handle update call info trigger", () => {
    const { result } = renderHook(() => useUpdateCallInfoMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        info: { title: "New Title" },
      }),
    ).not.toThrow();
  });

  it("should handle export call summary trigger", () => {
    const { result } = renderHook(() => useLazyExportCallSummaryQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        format: "pdf",
      }),
    ).not.toThrow();
  });

  it("should handle search locations trigger", () => {
    const { result } = renderHook(() => useLazySearchLocationsQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        query: "New York",
      }),
    ).not.toThrow();
  });

  it("should handle update notes trigger", () => {
    const { result } = renderHook(() => useUpdateCallSummaryNotesMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        notes: "Updated notes",
      }),
    ).not.toThrow();
  });

  it("should handle submit feedback trigger", () => {
    const { result } = renderHook(() => useSubmitCallFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        feedback: "Great call!",
      }),
    ).not.toThrow();
  });
});
