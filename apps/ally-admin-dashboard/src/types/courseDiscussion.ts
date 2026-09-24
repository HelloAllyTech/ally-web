/**
 * Course discussions — mirrors ally-be's `src/course-discussion` contract
 * (docs/course-discussions.md). Content is plain text: render it with
 * `white-space: pre-wrap`, never as HTML.
 */
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
  isLocked: boolean;
  postCount: number;
  viewer: DiscussionViewer;
  posts: DiscussionPost[];
}

/** One row of `GET …/discussion/tenants` (moderators only). */
export interface DiscussionTenantSummary {
  tenantId: string;
  tenantName: string;
  postCount: number;
  isLocked: boolean;
  lastPostAt: string | null;
}
