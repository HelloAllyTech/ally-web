import { TRACK_DISCUSSION_POST_QUERY_PARAM } from "@constants";
import { formatRelativeTime } from "@utils";

import type { TFunction } from "i18next";

/** The `message` of an ally-be error body, when it has one. */
export const apiErrorMessage = (error: unknown): string | undefined => {
  const message = (error as { data?: { message?: unknown } } | undefined)?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return undefined;
};

/** "Just now" / "5 minutes ago", reusing the app's relative-time strings. */
export const postTimeAgo = (iso: string, t: TFunction): string => {
  if (Date.now() - new Date(iso).getTime() < 60_000) return t("tracks2.discussion.justNow");
  return t("tracks2.discussion.timeAgo", {
    time: formatRelativeTime(iso, t as (key: string, opts?: Record<string, unknown>) => string),
  });
};

/** DOM id of a rendered post, shared by the renderer and the `?post=` deep link. */
export const discussionPostDomId = (postId: string) => `discussion-post-${postId}`;

/** Query param a notification uses to point at a post in the track player. */
export const DISCUSSION_POST_QUERY_PARAM = TRACK_DISCUSSION_POST_QUERY_PARAM;
