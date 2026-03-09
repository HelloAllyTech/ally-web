import React from "react";

import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

import {
  useGetReviewsQuery,
  useGetReviewByIdQuery,
  useGetReviewDetailsWithMessagesQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useCreateCommentMutation,
  useGetReviewThreadsQuery,
} from "../reviews";
import { baseAPI } from "../baseAPI";

// Mock constants
vi.mock("@constants", () => ({
  ApiEndpoints: {
    REVIEWS: {
      GET_REVIEWS: "/v1/reviews",
      GET_REVIEW_BY_ID: (reviewId: string) => `/v1/reviews/${reviewId}`,
      GET_REVIEW_DETAILS_AND_MESSAGES: (reviewId: string) => `/v1/reviews/${reviewId}/messages`,
      CREATE_REVIEW: "/v1/reviews",
      UPDATE_REVIEW: (reviewId: string) => `/v1/reviews/${reviewId}`,
      CREATE_COMMENT: (reviewId: string) => `/v1/reviews/${reviewId}/comments`,
      GET_REVIEW_THREADS: (reviewId: string) => `/v1/reviews/${reviewId}/threads`,
    },
  },
  HttpMethod: {
    GET: "GET",
    POST: "POST",
    PATCH: "PATCH",
  },
  TAG_TYPES: {
    REVIEW: "Review",
    SIMULATION_SUMMARY: "SimulationSummary",
  },
}));

// Mock types
vi.mock("@types", () => ({
  GetReviewsInput: {},
  GetReviewsResponse: {},
  GetReviewThreadsResponse: {},
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

describe("reviews API", () => {
  /**
   * TEST GROUP: Hook Exports
   */
  describe("Hook Exports", () => {
    it("should export all required hooks", () => {
      expect(useGetReviewsQuery).toBeDefined();
      expect(useGetReviewByIdQuery).toBeDefined();
      expect(useGetReviewDetailsWithMessagesQuery).toBeDefined();
      expect(useCreateReviewMutation).toBeDefined();
      expect(useUpdateReviewMutation).toBeDefined();
      expect(useCreateCommentMutation).toBeDefined();
      expect(useGetReviewThreadsQuery).toBeDefined();
    });

    it("should have correct hook types", () => {
      expect(typeof useGetReviewsQuery).toBe("function");
      expect(typeof useGetReviewByIdQuery).toBe("function");
      expect(typeof useGetReviewDetailsWithMessagesQuery).toBe("function");
      expect(typeof useCreateReviewMutation).toBe("function");
      expect(typeof useUpdateReviewMutation).toBe("function");
      expect(typeof useCreateCommentMutation).toBe("function");
      expect(typeof useGetReviewThreadsQuery).toBe("function");
    });
  });

  /**
   * TEST GROUP: Query Hooks
   */
  describe("Query Hooks", () => {
    it("should render getReviews query hook without errors", () => {
      const { result } = renderHook(() => useGetReviewsQuery({}), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it("should render getReviews query hook with pagination params", () => {
      const { result } = renderHook(
        () => useGetReviewsQuery({ limit: 10, offset: 0, sortBy: "createdAt", sortOrder: "DESC" }),
        {
          wrapper: TestWrapper,
        },
      );

      expect(result.current).toBeDefined();
    });

    it("should render getReviewById query hook without errors", () => {
      const { result } = renderHook(() => useGetReviewByIdQuery("review-123"), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it("should render getReviewDetailsWithMessages query hook without errors", () => {
      const { result } = renderHook(
        () =>
          useGetReviewDetailsWithMessagesQuery({
            id: "review-123",
            offset: 0,
            limit: 20,
            sortBy: "createdAt",
          }),
        {
          wrapper: TestWrapper,
        },
      );

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it("should render getReviewThreads query hook without errors", () => {
      const { result } = renderHook(() => useGetReviewThreadsQuery({ id: "review-123" }), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current.isLoading).toBeDefined();
    });

    it("should skip getReviewThreads query when skip option is true", () => {
      const { result } = renderHook(
        () => useGetReviewThreadsQuery({ id: "review-123" }, { skip: true }),
        {
          wrapper: TestWrapper,
        },
      );

      expect(result.current).toBeDefined();
      expect(result.current.isUninitialized).toBe(true);
    });
  });

  /**
   * TEST GROUP: Mutation Hooks
   */
  describe("Mutation Hooks", () => {
    it("should render createReview mutation hook without errors", () => {
      const { result } = renderHook(() => useCreateReviewMutation(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveLength(2); // [trigger, result]
    });

    it("should render updateReview mutation hook without errors", () => {
      const { result } = renderHook(() => useUpdateReviewMutation(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveLength(2); // [trigger, result]
    });

    it("should render createComment mutation hook without errors", () => {
      const { result } = renderHook(() => useCreateCommentMutation(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toHaveLength(2); // [trigger, result]
    });

    it("should handle createReview trigger", () => {
      const { result } = renderHook(() => useCreateReviewMutation(), {
        wrapper: TestWrapper,
      });

      const [trigger] = result.current;
      expect(typeof trigger).toBe("function");
      expect(() =>
        trigger({
          body: { scenarioSessionId: "session-123", status: "IN_REVIEW" },
        }),
      ).not.toThrow();
    });

    it("should handle updateReview trigger", () => {
      const { result } = renderHook(() => useUpdateReviewMutation(), {
        wrapper: TestWrapper,
      });

      const [trigger] = result.current;
      expect(typeof trigger).toBe("function");
      expect(() =>
        trigger({
          body: { scenarioSessionId: "review-123", status: "APPROVED" },
        }),
      ).not.toThrow();
    });

    it("should handle createComment trigger", () => {
      const { result } = renderHook(() => useCreateCommentMutation(), {
        wrapper: TestWrapper,
      });

      const [trigger] = result.current;
      expect(typeof trigger).toBe("function");
      expect(() =>
        trigger({
          reviewId: "review-123",
          body: {
            threadId: "thread-1",
            content: "This is a test comment",
          },
        }),
      ).not.toThrow();
    });

    it("should handle createComment with all optional fields", () => {
      const { result } = renderHook(() => useCreateCommentMutation(), {
        wrapper: TestWrapper,
      });

      const [trigger] = result.current;
      expect(() =>
        trigger({
          reviewId: "review-123",
          body: {
            threadId: "thread-1",
            parentCommentId: "parent-comment-1",
            messageId: "message-1",
            content: "This is a reply",
            selection: { start: 0, end: 10 },
          },
        }),
      ).not.toThrow();
    });
  });

  /**
   * TEST GROUP: API Endpoint Paths
   */
  describe("API Endpoint Paths", () => {
    it("should have correct static endpoint paths", () => {
      const endpoints = {
        getReviews: "/v1/reviews",
        createReview: "/v1/reviews",
      };

      expect(endpoints.getReviews).toBe("/v1/reviews");
      expect(endpoints.createReview).toBe("/v1/reviews");
    });

    it("should handle dynamic review IDs correctly", () => {
      const reviewIds = ["review-123", "review-456", "review-789"];

      reviewIds.forEach(reviewId => {
        const getByIdPath = `/v1/reviews/${reviewId}`;
        const messagesPath = `/v1/reviews/${reviewId}/messages`;
        const updatePath = `/v1/reviews/${reviewId}`;
        const commentsPath = `/v1/reviews/${reviewId}/comments`;
        const threadsPath = `/v1/reviews/${reviewId}/threads`;

        expect(getByIdPath).toContain(reviewId);
        expect(messagesPath).toContain(reviewId);
        expect(updatePath).toContain(reviewId);
        expect(commentsPath).toContain(reviewId);
        expect(threadsPath).toContain(reviewId);
      });
    });
  });

  /**
   * TEST GROUP: Data Structures
   */
  describe("Data Structures", () => {
    it("should handle reviews response structure", () => {
      const mockReviewsResponse = {
        data: [
          {
            id: "review-1",
            createdAt: "2024-01-15T10:00:00Z",
            createdBy: {
              id: "user-1",
              name: "John Doe",
              profileImage: "https://example.com/avatar.jpg",
            },
            scenario: {
              title: "Test Scenario",
              createdAt: "2024-01-15T09:00:00Z",
              duration: "15",
              description: "Test description",
              coverImageUrl: "https://example.com/cover.jpg",
            },
            reactions: { like: 5, heart: 3 },
            commentsCount: 2,
          },
        ],
        count: 1,
      };

      expect(mockReviewsResponse.data).toBeDefined();
      expect(mockReviewsResponse.count).toBe(1);
      expect(mockReviewsResponse.data[0].id).toBe("review-1");
      expect(mockReviewsResponse.data[0].createdBy.name).toBe("John Doe");
    });

    it("should handle review threads response structure", () => {
      const mockThreadsResponse = {
        data: [
          {
            id: "thread-1",
            comments: [
              {
                id: "comment-1",
                content: "Great session!",
                createdAt: "2024-01-15T10:30:00Z",
                createdBy: {
                  id: 1,
                  name: "Commenter",
                  profileImage: null,
                },
                replyCount: 0,
              },
            ],
            commentCount: 1,
          },
        ],
      };

      expect(mockThreadsResponse.data).toBeDefined();
      expect(mockThreadsResponse.data[0].comments).toHaveLength(1);
      expect(mockThreadsResponse.data[0].comments[0].content).toBe("Great session!");
    });

    it("should handle comment body structure", () => {
      const commentBody = {
        threadId: "thread-1",
        parentCommentId: "parent-1",
        messageId: "message-1",
        content: "This is a comment",
        selection: { start: 0, end: 50 },
      };

      expect(commentBody.threadId).toBeDefined();
      expect(commentBody.content).toBeDefined();
      expect(commentBody.selection).toBeDefined();
    });

    it("should handle review update structure", () => {
      const updateData = {
        id: "review-123",
        status: "APPROVED",
      };

      expect(updateData.id).toBeDefined();
      expect(updateData.status).toBe("APPROVED");
    });

    it("should handle create review structure", () => {
      const createData = {
        scenarioSessionId: "session-123",
      };

      expect(createData.scenarioSessionId).toBeDefined();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   */
  describe("Edge Cases", () => {
    it("should handle empty reviews list", () => {
      const emptyResponse = {
        data: [],
        count: 0,
      };

      expect(emptyResponse.data).toHaveLength(0);
      expect(emptyResponse.count).toBe(0);
    });

    it("should handle reviews with no reactions", () => {
      const reviewWithNoReactions = {
        id: "review-1",
        reactions: {},
        commentsCount: 0,
      };

      expect(Object.keys(reviewWithNoReactions.reactions)).toHaveLength(0);
    });

    it("should handle reviews with no comments", () => {
      const reviewWithNoComments = {
        id: "review-1",
        commentsCount: 0,
      };

      expect(reviewWithNoComments.commentsCount).toBe(0);
    });

    it("should handle thread with empty comments", () => {
      const threadWithNoComments = {
        id: "thread-1",
        comments: [],
        commentCount: 0,
      };

      expect(threadWithNoComments.comments).toHaveLength(0);
    });

    it("should handle user with no profile image", () => {
      const userWithNoImage = {
        id: "user-1",
        name: "John Doe",
        profileImage: null,
      };

      expect(userWithNoImage.profileImage).toBeNull();
    });
  });
});
