import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import {
  useGetDiscussionTenantsQuery,
  useGetModeratedDiscussionQuery,
  useLockCourseDiscussionMutation,
  useLockDiscussionThreadMutation,
  useModerateDeletePostMutation,
  useModerateEditPostMutation,
} from "@api";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup } from "@components";
import { ButtonVariant } from "@components/types";
import { DiscussionPost } from "@types";

interface DiscussionModerationPanelProps {
  /** The persisted track item id (`serverId` in the builder form). */
  itemId: string;
  itemTitle?: string;
  onClose: () => void;
}

const errorMessage = (error: unknown, fallback: string): string =>
  (error as { data?: { message?: string } })?.data?.message || fallback;

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "");

const actionClass =
  "text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50";
const destructiveActionClass =
  "text-xs font-medium text-destructive-500 hover:text-destructive-600 disabled:opacity-50";

/**
 * Course-author moderation for one item's discussion. Discussions are
 * tenant-isolated (one thread per organisation), so the author first picks an
 * organisation, then edits / deletes any post, locks a thread (top-level post)
 * or locks the whole discussion for that organisation. Every mutation
 * invalidates the discussion tag; the lists simply refetch.
 */
export const DiscussionModerationPanel: FC<DiscussionModerationPanelProps> = ({
  itemId,
  itemTitle,
  onClose,
}) => {
  const {
    data: tenants,
    isLoading: isLoadingTenants,
    isError: isTenantsError,
    refetch: refetchTenants,
  } = useGetDiscussionTenantsQuery(itemId);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Open on the most recently active organisation so the common case (one
  // organisation) needs no extra click.
  useEffect(() => {
    if (!tenantId && tenants && tenants.length > 0) setTenantId(tenants[0].tenantId);
  }, [tenants, tenantId]);

  const {
    data: discussion,
    isFetching: isFetchingDiscussion,
    isError: isDiscussionError,
    refetch: refetchDiscussion,
  } = useGetModeratedDiscussionQuery({ itemId, tenantId: tenantId ?? "" }, { skip: !tenantId });

  const [editPost, { isLoading: isSavingEdit }] = useModerateEditPostMutation();
  const [deletePost, { isLoading: isDeleting }] = useModerateDeletePostMutation();
  const [lockThread] = useLockDiscussionThreadMutation();
  const [lockDiscussion, { isLoading: isLockingDiscussion }] = useLockCourseDiscussionMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DiscussionPost | null>(null);

  const maxLength = discussion?.viewer.maxLength ?? 4000;

  const startEdit = (post: DiscussionPost) => {
    setEditingId(post.id);
    setDraft(post.content ?? "");
  };

  const handleSaveEdit = async (postId: string) => {
    const content = draft.trim();
    if (!content || content.length > maxLength) return;
    try {
      await editPost({ itemId, postId, content }).unwrap();
      setEditingId(null);
      toast.success("Post updated");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update the post"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePost({ itemId, postId: pendingDelete.id }).unwrap();
      toast.success("Post deleted");
      setPendingDelete(null);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't delete the post"));
    }
  };

  const handleLockThread = async (post: DiscussionPost) => {
    try {
      await lockThread({ itemId, postId: post.id, locked: !post.isLocked }).unwrap();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't change the thread lock"));
    }
  };

  const handleLockDiscussion = async () => {
    if (!discussion || !tenantId) return;
    try {
      await lockDiscussion({ itemId, tenantId, locked: !discussion.isLocked }).unwrap();
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't change the discussion lock"));
    }
  };

  const renderPost = (post: DiscussionPost) => {
    const isEditing = editingId === post.id;
    const trimmedLength = draft.trim().length;
    return (
      <li key={post.id} data-testid={`moderation-post-${post.id}`}>
        <div className="rounded-md border border-border-light p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-typography-500">
              <span className="font-medium text-typography-800">
                {post.isDeletedByAuthor ? "[deleted by author]" : (post.author?.name ?? "Unknown")}
              </span>
              <span>{formatDate(post.createdAt)}</span>
              {post.editedByModerator ? (
                <span>(edited by moderator)</span>
              ) : (
                post.isEdited && <span>(edited)</span>
              )}
              {post.depth === 1 && post.isLocked && (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-typography-700">
                  Thread locked
                </span>
              )}
            </div>
            {!isEditing && (
              <div className="flex items-center gap-3 shrink-0">
                {post.canEdit && !post.isDeletedByAuthor && (
                  <button type="button" className={actionClass} onClick={() => startEdit(post)}>
                    Edit
                  </button>
                )}
                {post.canLock && (
                  <button
                    type="button"
                    className={actionClass}
                    onClick={() => handleLockThread(post)}
                  >
                    {post.isLocked ? "Unlock thread" : "Lock thread"}
                  </button>
                )}
                {post.canDelete && (
                  <button
                    type="button"
                    className={destructiveActionClass}
                    onClick={() => setPendingDelete(post)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                aria-label="Edit post"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                rows={3}
                className="w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${
                    draft.length > maxLength ? "text-destructive-500" : "text-typography-500"
                  }`}
                >
                  {draft.length}/{maxLength}
                </span>
                <div className="flex gap-3">
                  <button type="button" className={actionClass} onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={actionClass}
                    disabled={isSavingEdit || trimmedLength === 0 || draft.length > maxLength}
                    onClick={() => handleSaveEdit(post.id)}
                  >
                    {isSavingEdit ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            !post.isDeletedByAuthor && (
              <p className="text-sm text-typography-800 whitespace-pre-wrap break-words">
                {post.content}
              </p>
            )
          )}
        </div>
        {post.replies.length > 0 && (
          <ul className="mt-2 ml-6 flex flex-col gap-2 border-l border-border-light pl-3">
            {post.replies.map(renderPost)}
          </ul>
        )}
      </li>
    );
  };

  const renderThread = () => {
    if (!tenantId) return null;
    if (isFetchingDiscussion && !discussion) {
      return <p className="text-sm text-typography-500">Loading discussion…</p>;
    }
    if (isDiscussionError || !discussion) {
      return (
        <div className="flex items-center gap-3 text-sm text-typography-600">
          Couldn't load this discussion.
          <button type="button" className={actionClass} onClick={() => refetchDiscussion()}>
            Retry
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-typography-700">
            {discussion.postCount} {discussion.postCount === 1 ? "post" : "posts"}
            {discussion.isLocked && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                Discussion locked
              </span>
            )}
          </div>
          {discussion.viewer.canModerate && (
            <button
              type="button"
              className={actionClass}
              disabled={isLockingDiscussion}
              onClick={handleLockDiscussion}
            >
              {discussion.isLocked ? "Unlock discussion" : "Lock discussion"}
            </button>
          )}
        </div>
        {discussion.isLocked && (
          <p className="text-xs text-typography-500">
            Learners in this organisation can read the discussion but can't post, reply or edit.
          </p>
        )}
        {discussion.posts.length === 0 ? (
          <p className="text-sm text-typography-500">No posts in this organisation.</p>
        ) : (
          <ul className="flex flex-col gap-3">{discussion.posts.map(renderPost)}</ul>
        )}
      </div>
    );
  };

  const renderTenants = () => {
    if (isLoadingTenants) {
      return <p className="text-sm text-typography-500">Loading organisations…</p>;
    }
    if (isTenantsError) {
      return (
        <div className="flex items-center gap-3 text-sm text-typography-600">
          Couldn't load organisations.
          <button type="button" className={actionClass} onClick={() => refetchTenants()}>
            Retry
          </button>
        </div>
      );
    }
    if (!tenants || tenants.length === 0) {
      return (
        <p className="text-sm text-typography-500">
          No one has posted in this discussion yet. Organisations appear here once a learner posts.
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor="moderation-tenant" className="text-sm font-medium text-typography-800">
          Organisation
        </label>
        <select
          id="moderation-tenant"
          value={tenantId ?? ""}
          onChange={event => {
            setEditingId(null);
            setTenantId(event.target.value);
          }}
          className="w-full border border-border-light rounded-md px-3 py-2 text-sm outline-none focus:border-primary-400"
        >
          {tenants.map(tenant => (
            <option key={tenant.tenantId} value={tenant.tenantId}>
              {tenant.tenantName} ({tenant.postCount}){tenant.isLocked ? " · locked" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] relative min-w-[600px] max-w-[800px] h-full bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <button
            onClick={onClose}
            type="button"
            className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
          >
            <DoubleArrowRight width={14} height={14} />
            <span className="text-base font-tertiary font-[500]">
              Moderate discussion{itemTitle ? ` — ${itemTitle}` : ""}
            </span>
          </button>
        </div>
        <div className="flex-1 px-10 pt-6 pb-6 overflow-y-auto min-h-0 custom-scrollbar flex flex-col gap-6">
          {renderTenants()}
          {renderThread()}
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete post?"
        description={
          pendingDelete && pendingDelete.replies.length > 0
            ? "This removes the post **and all of its replies** for every learner. This can't be undone."
            : "This removes the post for every learner. This can't be undone."
        }
        primaryButton={{
          label: isDeleting ? "Deleting..." : "Delete",
          onClick: handleConfirmDelete,
          variant: ButtonVariant.DESTRUCTIVE,
          disabled: isDeleting,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setPendingDelete(null),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
