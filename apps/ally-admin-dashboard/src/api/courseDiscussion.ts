import { baseAPI } from "@api";
import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import { CourseDiscussion, DiscussionPost, DiscussionTenantSummary } from "@types";

/**
 * Course discussion moderation (admin console). Mirrors ally-be's
 * `v1/learn/track-items/:itemId/discussion*` and `v1/learn/discussion/posts/*`
 * routes. Every mutation invalidates the item's discussion tag so the thread
 * and the organisation list simply refetch — no optimistic merging.
 */
const discussionTag = (itemId: string) => ({
  type: TAG_TYPES.COURSE_DISCUSSION,
  id: itemId,
});

const courseDiscussionApi = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getDiscussionTenants: builder.query<DiscussionTenantSummary[], string>({
      query: itemId => ({
        url: ApiEndpoints.COURSE_DISCUSSION.TENANTS(itemId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, itemId) => [discussionTag(itemId)],
    }),

    getModeratedDiscussion: builder.query<CourseDiscussion, { itemId: string; tenantId: string }>({
      query: ({ itemId, tenantId }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.GET(itemId),
        method: HttpMethod.GET,
        params: { tenantId },
      }),
      providesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),

    moderateEditPost: builder.mutation<
      DiscussionPost,
      { itemId: string; postId: string; content: string }
    >({
      query: ({ postId, content }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.POST(postId),
        method: HttpMethod.PUT,
        body: { content },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),

    moderateDeletePost: builder.mutation<{ success: boolean }, { itemId: string; postId: string }>({
      query: ({ postId }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.POST(postId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),

    lockDiscussionThread: builder.mutation<
      DiscussionPost,
      { itemId: string; postId: string; locked: boolean }
    >({
      query: ({ postId, locked }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.LOCK_POST(postId),
        method: HttpMethod.PUT,
        body: { locked },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),

    lockCourseDiscussion: builder.mutation<
      { success: boolean },
      { itemId: string; tenantId: string; locked: boolean }
    >({
      query: ({ itemId, tenantId, locked }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.LOCK_DISCUSSION(itemId),
        method: HttpMethod.PUT,
        params: { tenantId },
        body: { locked },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
  }),
});

export const {
  useGetDiscussionTenantsQuery,
  useGetModeratedDiscussionQuery,
  useModerateEditPostMutation,
  useModerateDeletePostMutation,
  useLockDiscussionThreadMutation,
  useLockCourseDiscussionMutation,
} = courseDiscussionApi;
