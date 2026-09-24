import { FC, useState } from "react";

import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  DiscussionPost as DiscussionPostType,
  useDeleteDiscussionPostMutation,
  useEditDiscussionPostMutation,
  useLockDiscussionPostMutation,
  useReplyToDiscussionPostMutation,
} from "@api";
import { ConfirmationDialog } from "@components";

import { apiErrorMessage, discussionPostDomId, postTimeAgo } from "./discussionUtils";
import { PostInput } from "./PostInput";

interface DiscussionPostProps {
  post: DiscussionPostType;
  itemId: string;
  maxLength: number;
  /** The viewer holds course-author moderation rights. */
  canModerate: boolean;
  /** The whole discussion is locked. */
  discussionLocked: boolean;
  /** Post id from a `?post=` deep link, flashed once the thread loads. */
  highlightedPostId?: string | null;
}

const actionClass =
  "text-xs font-medium text-typography-600 hover:text-primary-600 disabled:opacity-50";

const AuthorAvatar: FC<{ name: string | null; imageUrl: string | null }> = ({ name, imageUrl }) =>
  imageUrl ? (
    <img src={imageUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-medium text-primary-600"
    >
      {name?.trim()?.[0]?.toUpperCase() ?? "·"}
    </span>
  );

/**
 * One post and, recursively, its replies (indented, up to depth 3). Every
 * control is driven by the server's per-post flags (`canReply`, `canEdit`,
 * `canDelete`, `canLock`); mutations invalidate the thread and it refetches.
 */
export const DiscussionPost: FC<DiscussionPostProps> = ({
  post,
  itemId,
  maxLength,
  canModerate,
  discussionLocked,
  highlightedPostId,
}) => {
  const { t } = useTranslation();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [reply, { isLoading: isReplyingNow }] = useReplyToDiscussionPostMutation();
  const [edit, { isLoading: isSavingEdit }] = useEditDiscussionPostMutation();
  const [remove, { isLoading: isDeleting }] = useDeleteDiscussionPostMutation();
  const [lock, { isLoading: isLocking }] = useLockDiscussionPostMutation();

  const fail = (error: unknown) =>
    toast.error(apiErrorMessage(error) ?? t("tracks2.discussion.actionFailed"));

  const handleReply = async (content: string) => {
    try {
      await reply({ itemId, postId: post.id, content }).unwrap();
      setIsReplying(false);
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  };

  const handleEdit = async (content: string) => {
    try {
      await edit({ itemId, postId: post.id, content }).unwrap();
      setIsEditing(false);
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  };

  const handleDelete = async () => {
    try {
      await remove({ itemId, postId: post.id }).unwrap();
      setConfirmDelete(false);
    } catch (error) {
      fail(error);
    }
  };

  const handleToggleLock = async () => {
    try {
      await lock({ itemId, postId: post.id, locked: !post.isLocked }).unwrap();
    } catch (error) {
      fail(error);
    }
  };

  const isTopLevel = post.depth === 1;
  const threadLocked = isTopLevel && post.isLocked;
  const isHighlighted = highlightedPostId === post.id;
  const authorName = post.isDeletedByAuthor
    ? null
    : (post.author?.name ?? t("tracks2.discussion.unknownAuthor"));

  const deleteBody = canModerate
    ? t("tracks2.discussion.deleteModeratorBody")
    : post.replies.length > 0
      ? t("tracks2.discussion.deleteWithRepliesBody")
      : t("tracks2.discussion.deleteBody");

  return (
    <li className="list-none" data-testid={`discussion-post-${post.id}`}>
      <div
        id={discussionPostDomId(post.id)}
        className={`flex gap-3 rounded-[12px] p-3 transition-colors duration-700 ${
          isHighlighted ? "bg-primary-50 ring-2 ring-primary-300" : "bg-transparent"
        }`}
      >
        {post.isDeletedByAuthor ? (
          <span aria-hidden="true" className="h-8 w-8 flex-shrink-0 rounded-full bg-neutral-100" />
        ) : (
          <AuthorAvatar name={authorName} imageUrl={post.author?.profileImageUrl ?? null} />
        )}

        <div className="min-w-0 flex-1">
          {post.isDeletedByAuthor ? (
            <p className="text-sm italic text-typography-500">
              {t("tracks2.discussion.deletedByAuthor")}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-typography-800">
                  {post.isOwn ? t("tracks2.discussion.you") : authorName}
                </span>
                <span className="text-xs text-typography-500">
                  {postTimeAgo(post.createdAt, t)}
                </span>
                {post.editedByModerator ? (
                  <span className="text-xs text-typography-500">
                    {t("tracks2.discussion.editedByModerator")}
                  </span>
                ) : (
                  post.isEdited && (
                    <span className="text-xs text-typography-500">
                      {t("tracks2.discussion.edited")}
                    </span>
                  )
                )}
                {threadLocked && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
                    {t("tracks2.discussion.threadLockedBadge")}
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2">
                  <PostInput
                    maxLength={maxLength}
                    placeholder={t("tracks2.discussion.placeholder")}
                    ariaLabel={t("tracks2.discussion.editLabel")}
                    submitLabel={t("tracks2.discussion.save")}
                    initialValue={post.content ?? ""}
                    isSubmitting={isSavingEdit}
                    autoFocus
                    onSubmit={handleEdit}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-typography-800">
                  {post.content}
                </p>
              )}
            </>
          )}

          {!isEditing && (
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              {post.canReply && (
                <button
                  type="button"
                  className={actionClass}
                  onClick={() => setIsReplying(open => !open)}
                  aria-expanded={isReplying}
                >
                  {t("tracks2.discussion.reply")}
                </button>
              )}
              {post.canEdit && !post.isDeletedByAuthor && (
                <button type="button" className={actionClass} onClick={() => setIsEditing(true)}>
                  {t("tracks2.discussion.edit")}
                </button>
              )}
              {post.canDelete && (
                <button
                  type="button"
                  className={actionClass}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("tracks2.discussion.delete")}
                </button>
              )}
              {post.canLock && isTopLevel && (
                <button
                  type="button"
                  className={actionClass}
                  onClick={handleToggleLock}
                  disabled={isLocking}
                >
                  {post.isLocked
                    ? t("tracks2.discussion.unlockThread")
                    : t("tracks2.discussion.lockThread")}
                </button>
              )}
            </div>
          )}

          {isReplying && post.canReply && (
            <div className="mt-2">
              <PostInput
                maxLength={maxLength}
                placeholder={t("tracks2.discussion.replyPlaceholder")}
                ariaLabel={t("tracks2.discussion.replyPlaceholder")}
                submitLabel={t("tracks2.discussion.reply")}
                isSubmitting={isReplyingNow}
                rows={2}
                autoFocus
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}
        </div>
      </div>

      {post.replies.length > 0 && (
        <ul className="ml-6 flex flex-col gap-1 border-l border-border-light pl-3 sm:ml-8 sm:pl-4">
          {post.replies.map(child => (
            <DiscussionPost
              key={child.id}
              post={child}
              itemId={itemId}
              maxLength={maxLength}
              canModerate={canModerate}
              discussionLocked={discussionLocked}
              highlightedPostId={highlightedPostId}
            />
          ))}
        </ul>
      )}

      {/* A locked thread shows why its composer is gone (the whole-discussion
          lock is announced once, at the top of the thread). */}
      {threadLocked && !discussionLocked && (
        <p className="ml-14 mt-1 text-xs text-typography-500">
          {t("tracks2.discussion.threadLocked")}
        </p>
      )}

      {confirmDelete &&
        createPortal(
          <ConfirmationDialog
            isOpen={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            title={{
              normal: t("tracks2.discussion.deleteTitle"),
              italic: t("tracks2.discussion.deleteTitleItalic"),
            }}
            content={deleteBody}
            buttonText={t("tracks2.discussion.delete")}
            buttonVariant="destructive"
            onButtonClick={isDeleting ? () => undefined : handleDelete}
            secondaryButtonText={t("tracks2.discussion.cancel")}
            onSecondaryButtonClick={() => setConfirmDelete(false)}
          />,
          document.body,
        )}
    </li>
  );
};
