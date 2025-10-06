import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import {
  useGetWaitingClientsQuery,
  useRequestCallMutation,
  useAcceptCallMutation,
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
      REQUEST_CALL: "/audio-call/request-call",
      ACCEPT_CALL: "/audio-call/accept-call",
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

describe("audioCall API", () => {
  it("should export correct hooks", () => {
    expect(useGetWaitingClientsQuery).toBeDefined();
    expect(useRequestCallMutation).toBeDefined();
    expect(useAcceptCallMutation).toBeDefined();
    expect(useLazyGetCounsellorChatQuery).toBeDefined();
    expect(useEndCallMutation).toBeDefined();
    expect(useCancelRequestMutation).toBeDefined();
    expect(useAddFeedbackMutation).toBeDefined();
    expect(useUpdateFeedbackMutation).toBeDefined();
    expect(useGetNudgeStatusQuery).toBeDefined();
  });

  it("should have correct hook configurations", () => {
    expect(typeof useGetWaitingClientsQuery).toBe("function");
    expect(typeof useRequestCallMutation).toBe("function");
    expect(typeof useAcceptCallMutation).toBe("function");
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

  it("should render request call mutation hook without errors", () => {
    const { result } = renderHook(() => useRequestCallMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
  });

  it("should render accept call mutation hook without errors", () => {
    const { result } = renderHook(() => useAcceptCallMutation(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toHaveLength(2); // [trigger, result]
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

  it("should handle request call trigger", () => {
    const { result } = renderHook(() => useRequestCallMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ clientId: "client123" })).not.toThrow();
  });

  it("should handle accept call trigger", () => {
    const { result } = renderHook(() => useAcceptCallMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ callId: "call123" })).not.toThrow();
  });

  it("should handle counsellor chat query trigger", () => {
    const { result } = renderHook(() => useLazyGetCounsellorChatQuery(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ callId: "call123" })).not.toThrow();
  });

  it("should handle end call trigger", () => {
    const { result } = renderHook(() => useEndCallMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ callId: "call123" })).not.toThrow();
  });

  it("should handle cancel request trigger", () => {
    const { result } = renderHook(() => useCancelRequestMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() => trigger({ requestId: "request123" })).not.toThrow();
  });

  it("should handle add feedback trigger", () => {
    const { result } = renderHook(() => useAddFeedbackMutation(), {
      wrapper: TestWrapper,
    });

    const [trigger] = result.current;
    expect(typeof trigger).toBe("function");
    expect(() =>
      trigger({
        callId: "call123",
        rating: 5,
        feedback: "Great call!",
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
        feedbackId: "feedback123",
        rating: 4,
        feedback: "Updated feedback",
      }),
    ).not.toThrow();
  });
});
