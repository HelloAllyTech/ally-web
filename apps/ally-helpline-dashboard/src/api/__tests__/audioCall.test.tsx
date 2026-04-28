import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, afterEach } from "vitest";

import {
  useGetWaitingClientsQuery,
  useLazyGetCounsellorChatQuery,
  useEndCallMutation,
  useCancelRequestMutation,
  useAddFeedbackMutation,
  useUpdateFeedbackMutation,
  useGetNudgeStatusQuery,
} from "../audioCall";
import { baseAPI } from "../baseAPI";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    AUDIO_CALL: {
      GET_WAITING_CLIENTS: "/audio-call/waiting-clients",
      GET_COUNSELLOR_CHAT: "/audio-call/counsellor-chat",
      END_CALL: "/audio-call/end-call",
      CANCEL_REQUEST: "/audio-call/cancel-request",
      ADD_FEEDBACK: "/audio-call/add-feedback",
      UPDATE_FEEDBACK: "/audio-call/update-feedback",
      GET_NUDGE_STATUS: "/audio-call/nudge-status",
    },
  },
  HttpMethod: {
    POST: "POST",
    GET: "GET",
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
  WaitingClient: {},
  RequestCallRequest: {},
  RequestCallResponse: {},
  AcceptCallRequest: {},
  AcceptCallResponse: {},
  CounsellorChatResponse: {},
  EndCallRequest: {},
  EndCallResponse: {},
  CancelRequestRequest: {},
  CancelRequestResponse: {},
  AddFeedbackRequest: {},
  AddFeedbackResponse: {},
  UpdateFeedbackRequest: {},
  UpdateFeedbackResponse: {},
  NudgeStatusResponse: {},
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

describe("audioCall API", () => {
  afterEach(() => {
    testStore.dispatch(baseAPI.util.resetApiState());
  });
  it("should export correct hooks", () => {
    expect(useGetWaitingClientsQuery).toBeDefined();
    expect(useLazyGetCounsellorChatQuery).toBeDefined();
    expect(useEndCallMutation).toBeDefined();
    expect(useCancelRequestMutation).toBeDefined();
    expect(useAddFeedbackMutation).toBeDefined();
    expect(useUpdateFeedbackMutation).toBeDefined();
    expect(useGetNudgeStatusQuery).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useGetWaitingClientsQuery).toBe("function");
    expect(typeof useLazyGetCounsellorChatQuery).toBe("function");
    expect(typeof useEndCallMutation).toBe("function");
    expect(typeof useCancelRequestMutation).toBe("function");
    expect(typeof useAddFeedbackMutation).toBe("function");
    expect(typeof useUpdateFeedbackMutation).toBe("function");
    expect(typeof useGetNudgeStatusQuery).toBe("function");
  });

  it("should render waiting clients query hook without errors", () => {
    const { result } = renderHook(() => useGetWaitingClientsQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should render counsellor chat query hook without errors", () => {
    const { result } = renderHook(() => useLazyGetCounsellorChatQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(3); // [trigger, result, lastPromise]
  });

  it("should render end call mutation hook without errors", () => {
    const { result } = renderHook(() => useEndCallMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render cancel request mutation hook without errors", () => {
    const { result } = renderHook(() => useCancelRequestMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render add feedback mutation hook without errors", () => {
    const { result } = renderHook(() => useAddFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render update feedback mutation hook without errors", () => {
    const { result } = renderHook(() => useUpdateFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render nudge status query hook without errors", () => {
    const { result } = renderHook(() => useGetNudgeStatusQuery(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBeDefined();
  });

  it("should handle counsellor chat query trigger", () => {
    const { result } = renderHook(() => useLazyGetCounsellorChatQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger()).not.toThrow();
  });

  it("should handle end call trigger", () => {
    const { result } = renderHook(() => useEndCallMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ chatId: 1 })).not.toThrow();
  });

  it("should handle cancel request trigger", () => {
    const { result } = renderHook(() => useCancelRequestMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ chatId: 1 })).not.toThrow();
  });

  it("should handle add feedback trigger", () => {
    const { result } = renderHook(() => useAddFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        id: 1,
        feedback: {
          rating: 5,
          comment: "Great call!",
        },
      }),
    ).not.toThrow();
  });

  it("should handle update feedback trigger", () => {
    const { result } = renderHook(() => useUpdateFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        feedbackId: 1,
        feedback: {
          rating: 4,
          comment: "Updated feedback",
        },
      }),
    ).not.toThrow();
  });
});
