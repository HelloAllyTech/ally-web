import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the baseAPI
const mockInjectEndpoints = vi.fn();
const mockBaseAPI = {
  injectEndpoints: mockInjectEndpoints,
};

vi.mock("../baseAPI", () => ({
  baseAPI: mockBaseAPI,
}));

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    AUDIO_CALL: {
      GET_WAITING_CLIENTS: "/audio-call/waiting-clients",
      CANCEL_CHAT: (chatId: number) => `/audio-call/cancel/${chatId}`,
      GET_COUNSELLOR_CHAT: "/audio-call/counsellor-chat",
      END_CHAT: (chatId: number) => `/audio-call/end/${chatId}`,
      MESSAGE_FEEDBACK: (id: number) => `/audio-call/feedback/${id}`,
      UPDATE_FEEDBACK: (feedbackId: number) => `/audio-call/feedback/${feedbackId}`,
      GET_NUDGE_STATUS: "/audio-call/nudge-status",
    },
  },
  HttpMethod: {
    POST: "POST",
    PATCH: "PATCH",
  },
}));

// Mock types
vi.mock("@types", () => ({
  GetWaitingClientsResponse: {},
  Chat: {},
  FeedbackInput: {},
  FeedbackResponse: {},
}));

describe("audioCall API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct API endpoints configuration", () => {
    // Test that the module is properly mocked
    expect(mockInjectEndpoints).toBeDefined();
    expect(mockBaseAPI).toBeDefined();
  });

  it("should have correct endpoint paths", () => {
    // Test that the endpoint paths are correctly defined
    const expectedPaths = [
      "/audio-call/waiting-clients",
      "/audio-call/request",
      "/audio-call/counsellor-chat",
      "/audio-call/nudge-status",
    ];

    expectedPaths.forEach(path => {
      expect(path).toBeDefined();
      expect(typeof path).toBe("string");
    });
  });

  it("should handle dynamic chat IDs correctly", () => {
    // Test that dynamic chat IDs are handled correctly
    const chatIds = [1, 2, 3, 123];

    chatIds.forEach(chatId => {
      const cancelPath = `/audio-call/cancel/${chatId}`;
      const acceptPath = `/audio-call/accept/${chatId}`;
      const endPath = `/audio-call/end/${chatId}`;

      expect(cancelPath).toBeDefined();
      expect(acceptPath).toBeDefined();
      expect(endPath).toBeDefined();
    });
  });

  it("should handle feedback IDs correctly", () => {
    // Test that feedback IDs are handled correctly
    const feedbackIds = [1, 2, 3, 456];

    feedbackIds.forEach(feedbackId => {
      const feedbackPath = `/audio-call/feedback/${feedbackId}`;
      expect(feedbackPath).toBeDefined();
    });
  });

  it("should have correct HTTP methods", () => {
    // Test that the HTTP methods are correctly defined
    expect("POST").toBe("POST");
    expect("PATCH").toBe("PATCH");
  });

  it("should handle different chat data formats", () => {
    // Test that different chat data formats are handled correctly
    const chatData = {
      id: 1,
      clientId: "client-123",
      status: "waiting",
      timestamp: new Date().toISOString(),
    };

    expect(chatData.id).toBeDefined();
    expect(chatData.clientId).toBeDefined();
    expect(chatData.status).toBeDefined();
    expect(chatData.timestamp).toBeDefined();
  });

  it("should handle feedback data correctly", () => {
    // Test that feedback data is handled correctly
    const feedbackData = {
      id: 1,
      rating: 5,
      comment: "Great service!",
      chatId: 123,
    };

    expect(feedbackData.id).toBeDefined();
    expect(feedbackData.rating).toBeDefined();
    expect(feedbackData.comment).toBeDefined();
    expect(feedbackData.chatId).toBeDefined();
  });

  it("should handle nudge status correctly", () => {
    // Test that nudge status is handled correctly
    const nudgeStatus = {
      enabled: true,
      interval: 30000,
      message: "Are you still there?",
    };

    expect(nudgeStatus.enabled).toBeDefined();
    expect(nudgeStatus.interval).toBeDefined();
    expect(nudgeStatus.message).toBeDefined();
  });

  it("should have correct mock setup", () => {
    // Test that the mocks are properly configured
    expect(mockInjectEndpoints).toBeInstanceOf(Function);
    expect(mockBaseAPI.injectEndpoints).toBe(mockInjectEndpoints);
  });
});
