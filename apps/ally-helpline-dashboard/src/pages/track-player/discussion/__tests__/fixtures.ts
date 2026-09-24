import type { CourseDiscussion, DiscussionPost } from "@api";

export const makePost = (overrides: Partial<DiscussionPost> = {}): DiscussionPost => ({
  id: "p1",
  parentPostId: null,
  depth: 1,
  author: { id: 7, name: "Asha K", profileImageUrl: null },
  content: "First thought",
  isDeletedByAuthor: false,
  isEdited: false,
  editedByModerator: false,
  isLocked: false,
  isOwn: false,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  editedAt: null,
  editableUntil: null,
  canEdit: false,
  canDelete: false,
  canReply: true,
  canLock: false,
  replies: [],
  ...overrides,
});

export const makeDiscussion = (overrides: Partial<CourseDiscussion> = {}): CourseDiscussion => ({
  trackId: "t1",
  trackItemId: "item-1",
  tenantId: "tenant-1",
  enabled: true,
  isLocked: false,
  postCount: 0,
  viewer: {
    userId: 42,
    canModerate: false,
    canPost: true,
    maxDepth: 3,
    maxLength: 4000,
    editWindowMinutes: 15,
  },
  posts: [],
  ...overrides,
});
