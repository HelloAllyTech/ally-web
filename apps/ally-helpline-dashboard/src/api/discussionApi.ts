/**
 * Course discussions — the thread beneath a Track 2.0 course item. Mirrors
 * ally-be's `src/course-discussion` routes (docs/course-discussions.md).
 * Discussions are per organisation; the backend scopes a learner to their
 * own. Every mutation invalidates the item's discussion tag so the thread
 * simply refetches — no optimistic merging.
 *
 * Content is plain text: render it with `white-space: pre-wrap`, never as HTML.
 */

import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

import { baseAPI } from "./baseAPI";

export interface DiscussionPostAuthor {
  id: number;
  name: string;
  profileImageUrl: string | null;
}

export interface DiscussionPost {
  id: string;
  parentPostId: string | null;
  /** 1 = top-level, max 3. */
  depth: number;
  /** Null once deleted by the author. */
  author: DiscussionPostAuthor | null;
  /** Null once deleted by the author. */
  content: string | null;
  isDeletedByAuthor: boolean;
  isEdited: boolean;
  editedByModerator: boolean;
  /** Thread lock — top-level posts only; replies inherit it. */
  isLocked: boolean;
  isOwn: boolean;
  createdAt: string;
  editedAt: string | null;
  editableUntil: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
  canLock: boolean;
  replies: DiscussionPost[];
}

export interface DiscussionViewer {
  userId: number;
  canModerate: boolean;
  canPost: boolean;
  maxDepth: number;
  maxLength: number;
  editWindowMinutes: number;
}

export interface CourseDiscussion {
  trackId: string;
  trackItemId: string;
  tenantId: string;
  enabled: boolean;
  /** Whole-discussion lock. */
  isLocked: boolean;
  /** Live posts incl. replies, excl. placeholders. */
  postCount: number;
  viewer: DiscussionViewer;
  /** Top-level, newest first; replies oldest first. */
  posts: DiscussionPost[];
}

const discussionTag = (itemId: string) => ({ type: TAG_TYPES.COURSE_DISCUSSION, id: itemId });

const discussionAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    getCourseDiscussion: builder.query<CourseDiscussion, { itemId: string }>({
      query: ({ itemId }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.GET(itemId),
        method: HttpMethod.GET,
      }),
      providesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
    createDiscussionPost: builder.mutation<DiscussionPost, { itemId: string; content: string }>({
      query: ({ itemId, content }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.CREATE_POST(itemId),
        method: HttpMethod.POST,
        body: { content },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
    replyToDiscussionPost: builder.mutation<
      DiscussionPost,
      { itemId: string; postId: string; content: string }
    >({
      query: ({ postId, content }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.REPLY(postId),
        method: HttpMethod.POST,
        body: { content },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
    editDiscussionPost: builder.mutation<
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
    deleteDiscussionPost: builder.mutation<
      { success: boolean },
      { itemId: string; postId: string }
    >({
      query: ({ postId }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.POST(postId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
    lockDiscussionPost: builder.mutation<
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
      { itemId: string; locked: boolean }
    >({
      query: ({ itemId, locked }) => ({
        url: ApiEndpoints.COURSE_DISCUSSION.LOCK_DISCUSSION(itemId),
        method: HttpMethod.PUT,
        body: { locked },
      }),
      invalidatesTags: (_result, _error, { itemId }) => [discussionTag(itemId)],
    }),
  }),
});

export const {
  useGetCourseDiscussionQuery,
  useCreateDiscussionPostMutation,
  useReplyToDiscussionPostMutation,
  useEditDiscussionPostMutation,
  useDeleteDiscussionPostMutation,
  useLockDiscussionPostMutation,
  useLockCourseDiscussionMutation,
} = discussionAPI;
