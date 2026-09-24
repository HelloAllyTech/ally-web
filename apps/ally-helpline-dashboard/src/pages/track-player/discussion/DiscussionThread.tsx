import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  useCreateDiscussionPostMutation,
  useGetCourseDiscussionQuery,
  useLockCourseDiscussionMutation,
} from "@api";

import { DiscussionPost } from "./DiscussionPost";
import { apiErrorMessage, discussionPostDomId } from "./discussionUtils";
import { PostInput } from "./PostInput";

interface DiscussionThreadProps {
  itemId: string;
  /** Post to scroll to and flash once loaded (from a `?post=` deep link). */
  highlightPostId?: string | null;
}

const HIGHLIGHT_MS = 2500;

const LockNote: FC<{ children: string }> = ({ children }) => (
  <p
    role="status"
    className="rounded-[12px] border border-border-light bg-neutral-50 px-4 py-3 text-sm text-typography-600"
  >
    {children}
  </p>
);

const ThreadSkeleton: FC = () => (
  <div data-testid="discussion-skeleton" className="flex flex-col gap-4" aria-busy="true">
    {[0, 1, 2].map(row => (
      <div key={row} className="flex animate-pulse gap-3">
        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-neutral-100" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-32 rounded bg-neutral-100" />
          <div className="h-3 w-full rounded bg-neutral-100" />
          <div className="h-3 w-2/3 rounded bg-neutral-100" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * The discussion beneath a Track 2.0 item: heading with post count, composer
 * (or a locked note), and every post with its replies shown up front. It is
 * optional — it never gates progression.
 */
export const DiscussionThread: FC<DiscussionThreadProps> = ({ itemId, highlightPostId }) => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement>(null);
  const { data, isLoading, isError, refetch } = useGetCourseDiscussionQuery({ itemId });
  const [createPost, { isLoading: isPosting }] = useCreateDiscussionPostMutation();
  const [lockDiscussion, { isLoading: isLockingDiscussion }] = useLockCourseDiscussionMutation();

  // The player's page is a horizontal swipe (framer-motion drag) container and
  // listens for native pointerdown. Stop it here so selecting text or
  // dragging inside the discussion never turns the page.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return undefined;
    const stop = (event: PointerEvent) => event.stopPropagation();
    node.addEventListener("pointerdown", stop);
    return () => node.removeEventListener("pointerdown", stop);
  }, []);

  // Deep link: scroll to the post once, then flash it briefly.
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const handledHighlightRef = useRef<string | null>(null);
  const refetchedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!highlightPostId || !data || handledHighlightRef.current === highlightPostId) {
      return undefined;
    }
    const node = document.getElementById(discussionPostDomId(highlightPostId));
    if (!node) {
      // Opened from a notification while this thread was already cached: the
      // new reply isn't in it yet, so refetch once. A post that was since
      // deleted simply never highlights.
      if (refetchedForRef.current !== highlightPostId) {
        refetchedForRef.current = highlightPostId;
        refetch();
      }
      return undefined;
    }
    handledHighlightRef.current = highlightPostId;
    node.scrollIntoView?.({ behavior: "smooth", block: "center" });
    setHighlighted(highlightPostId);
    const timer = window.setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightPostId, data, refetch]);

  const handleCreate = async (content: string) => {
    try {
      await createPost({ itemId, content }).unwrap();
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? t("tracks2.discussion.actionFailed"));
      return false;
    }
  };

  const handleToggleDiscussionLock = async () => {
    if (!data) return;
    try {
      await lockDiscussion({ itemId, locked: !data.isLocked }).unwrap();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? t("tracks2.discussion.actionFailed"));
    }
  };

  // Turned off after the page loaded (or never on): nothing to show.
  if (data && !data.enabled) return null;

  const heading =
    data && data.postCount > 0
      ? t("tracks2.discussion.titleWithCount", { count: data.postCount })
      : t("tracks2.discussion.title");

  const renderBody = () => {
    if (isLoading) return <ThreadSkeleton />;
    if (isError || !data) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-typography-600">{t("tracks2.discussion.loadFailed")}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-border-light px-4 py-1.5 text-sm font-medium text-typography-800 hover:bg-neutral-50"
          >
            {t("tracks2.discussion.retry")}
          </button>
        </div>
      );
    }

    const { viewer } = data;
    return (
      <div className="flex flex-col gap-5">
        {data.isLocked ? (
          <LockNote>{t("tracks2.discussion.discussionLocked")}</LockNote>
        ) : (
          viewer.canPost && (
            <PostInput
              maxLength={viewer.maxLength}
              placeholder={t("tracks2.discussion.placeholder")}
              ariaLabel={t("tracks2.discussion.placeholder")}
              submitLabel={t("tracks2.discussion.post")}
              isSubmitting={isPosting}
              onSubmit={handleCreate}
            />
          )
        )}

        {data.posts.length === 0 ? (
          <div data-testid="discussion-empty" className="py-6 text-center">
            <p className="text-sm font-medium text-typography-800">
              {t("tracks2.discussion.emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-typography-600">{t("tracks2.discussion.emptyBody")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.posts.map(post => (
              <DiscussionPost
                key={post.id}
                post={post}
                itemId={itemId}
                maxLength={viewer.maxLength}
                canModerate={viewer.canModerate}
                discussionLocked={data.isLocked}
                highlightedPostId={highlighted}
              />
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section
      ref={rootRef}
      aria-labelledby={`discussion-heading-${itemId}`}
      data-testid="discussion-thread"
      className="border-t border-border-light bg-white px-4 py-8 sm:px-6"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            id={`discussion-heading-${itemId}`}
            className="text-lg font-semibold text-typography-800"
          >
            {heading}
          </h2>
          {data?.viewer.canModerate && (
            <button
              type="button"
              onClick={handleToggleDiscussionLock}
              disabled={isLockingDiscussion}
              className="text-xs font-medium text-typography-600 hover:text-primary-600 disabled:opacity-50"
            >
              {data.isLocked
                ? t("tracks2.discussion.unlockDiscussion")
                : t("tracks2.discussion.lockDiscussion")}
            </button>
          )}
        </div>
        {renderBody()}
      </div>
    </section>
  );
};
