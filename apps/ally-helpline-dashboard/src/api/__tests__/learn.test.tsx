import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

import { baseAPI } from "../baseAPI";
import {
  useEndSimulationMutation,
  useGetScenarioQuery,
  useGetScenariosQuery,
  useStartSimulationMutation,
  useGetSimulationLogsQuery,
  useGetAdminSimulationLogsQuery,
  useLazyGetSimulationSummaryQuery,
  useSubmitSimulationFeedbackMutation,
  useGetSimulationTranscriptQuery,
  useGetAvailableLanguagesQuery,
} from "../learn";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    LEARN: {
      END_SIMULATION: "/learn/end-simulation",
      GET_SCENARIO: "/learn/scenario",
      GET_SCENARIOS: "/learn/scenarios",
      START_SIMULATION: "/learn/start-simulation",
      GET_SIMULATION_LOGS: "/learn/simulation-logs",
      GET_ADMIN_SIMULATION_LOGS: "/learn/admin-simulation-logs",
      GET_SIMULATION_SUMMARY: "/learn/simulation-summary",
      SUBMIT_SIMULATION_FEEDBACK: "/learn/submit-feedback",
      GET_SIMULATION_TRANSCRIPT: "/learn/simulation-transcript",
      GET_AVAILABLE_LANGUAGES: "/learn/available-languages",
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
  EndSimulationRequest: {},
  EndSimulationResponse: {},
  Scenario: {},
  StartSimulationRequest: {},
  StartSimulationResponse: {},
  SimulationLog: {},
  AdminSimulationLog: {},
  SimulationSummary: {},
  SubmitSimulationFeedbackRequest: {},
  SubmitSimulationFeedbackResponse: {},
  SimulationTranscript: {},
}));

// Create a test store with RTK Query middleware
const createTestStore = () => {
  const store = configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  });
  return store;
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};

describe("learn API", () => {
  it("should export correct hooks", () => {
    expect(useEndSimulationMutation).toBeDefined();
    expect(useGetScenarioQuery).toBeDefined();
    expect(useGetScenariosQuery).toBeDefined();
    expect(useStartSimulationMutation).toBeDefined();
    expect(useGetSimulationLogsQuery).toBeDefined();
    expect(useGetAdminSimulationLogsQuery).toBeDefined();
    expect(useLazyGetSimulationSummaryQuery).toBeDefined();
    expect(useSubmitSimulationFeedbackMutation).toBeDefined();
    expect(useGetSimulationTranscriptQuery).toBeDefined();
    expect(useGetAvailableLanguagesQuery).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useEndSimulationMutation).toBe("function");
    expect(typeof useGetScenarioQuery).toBe("function");
    expect(typeof useGetScenariosQuery).toBe("function");
    expect(typeof useStartSimulationMutation).toBe("function");
    expect(typeof useGetSimulationLogsQuery).toBe("function");
    expect(typeof useGetAdminSimulationLogsQuery).toBe("function");
    expect(typeof useLazyGetSimulationSummaryQuery).toBe("function");
    expect(typeof useSubmitSimulationFeedbackMutation).toBe("function");
    expect(typeof useGetSimulationTranscriptQuery).toBe("function");
    expect(typeof useGetAvailableLanguagesQuery).toBe("function");
  });

  it("should render end simulation mutation hook without errors", () => {
    const { result } = renderHook(() => useEndSimulationMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render scenario query hook without errors", () => {
    const { result } = renderHook(() => useGetScenarioQuery("scenario123"), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render scenarios query hook without errors", () => {
    const { result } = renderHook(() => useGetScenariosQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render start simulation mutation hook without errors", () => {
    const { result } = renderHook(() => useStartSimulationMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render simulation logs query hook without errors", () => {
    const { result } = renderHook(() => useGetSimulationLogsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render admin simulation logs query hook without errors", () => {
    const { result } = renderHook(() => useGetAdminSimulationLogsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render simulation summary query hook without errors", () => {
    const { result } = renderHook(() => useLazyGetSimulationSummaryQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render submit feedback mutation hook without errors", () => {
    const { result } = renderHook(() => useSubmitSimulationFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render simulation transcript query hook without errors", () => {
    const { result } = renderHook(() => useGetSimulationTranscriptQuery("simulation123"), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle end simulation trigger", () => {
    const { result } = renderHook(() => useEndSimulationMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ simulationId: "sim123" })).not.toThrow();
  });

  it("should handle start simulation trigger", () => {
    const { result } = renderHook(() => useStartSimulationMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ scenarioId: "scenario123" })).not.toThrow();
  });

  it("should handle simulation summary trigger", () => {
    const { result } = renderHook(() => useLazyGetSimulationSummaryQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ simulationId: "sim123" })).not.toThrow();
  });

  it("should handle submit feedback trigger", () => {
    const { result } = renderHook(() => useSubmitSimulationFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        simulationId: "sim123",
        feedback: "Great simulation!",
      }),
    ).not.toThrow();
  });

  it("should handle simulation logs query with parameters", () => {
    const { result } = renderHook(
      () =>
        useGetSimulationLogsQuery({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
        }),
      {
        wrapper: TestWrapper,
      },
    );

    expect(result.current).toBeDefined();
  });

  it("should handle admin simulation logs query with parameters", () => {
    const { result } = renderHook(
      () =>
        useGetAdminSimulationLogsQuery({
          startDate: "2023-01-01",
          endDate: "2023-01-31",
          userId: "user123",
        }),
      {
        wrapper: TestWrapper,
      },
    );

    expect(result.current).toBeDefined();
  });

  describe("getAvailableLanguages", () => {
    const mockLanguages = [
      { value: "en-IN", label: "English (India)", language_id: 1 },
      { value: "es-AR", label: "Spanish (Argentina)", language_id: 2 },
    ];

    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockResponse(JSON.stringify(mockLanguages));
    });

    // it("should fetch available languages with default parameters", async () => {
    //   const { result } = renderHook(() => useGetAvailableLanguagesQuery({}), {
    //     wrapper: TestWrapper,
    //   });

    //   // Initial loading state
    //   expect(result.current.isLoading).toBe(true);
    //   expect(result.current.data).toBeUndefined();

    //   // Wait for the query to complete
    //   await waitFor(() => expect(result.current.isSuccess).toBe(true));

    //   // Verify the request was made with the correct URL and method
    //   expect(fetchMock).toHaveBeenCalledWith(
    //     expect.stringContaining("/learn/available-languages"),
    //     expect.objectContaining({
    //       method: "GET",
    //     }),
    //   );

    //   // Verify the response data
    //   expect(result.current.data).toEqual(mockLanguages);
    // });

    // it("should include query parameters when provided", async () => {
    //   const params = { active: true, hasVoices: true };
    //   const { result } = renderHook(() => useGetAvailableLanguagesQuery(params), {
    //     wrapper: TestWrapper,
    //   });

    //   await waitFor(() => expect(result.current.isSuccess).toBe(true));

    //   // Verify the request was made with the correct query parameters
    //   expect(fetchMock).toHaveBeenCalledWith(
    //     expect.stringContaining("/learn/available-languages?active=true&hasVoices=true"),
    //     expect.any(Object),
    //   );
    // });

    // it("should handle error responses", async () => {
    //   const errorMessage = "Failed to fetch languages";
    //   fetchMock.mockRejectOnce(new Error(errorMessage));

    //   const { result } = renderHook(() => useGetAvailableLanguagesQuery({}), {
    //     wrapper: TestWrapper,
    //   });

    //   await waitFor(() => expect(result.current.isError).toBe(true));
    //   expect(result.current.error).toBeDefined();
    // });
  });
});
