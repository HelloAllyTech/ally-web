import { FC } from "react";

import { useGetBugHunterNotificationsQuery } from "@api";
import { en } from "@constants";
import { BugHunterNotificationLevel } from "@types";

/**
 * How many of Bug Hunter's messages have stopped and are waiting on you,
 * shown on its sidebar tab.
 *
 * The point of putting the character in the nav is that being blocked on a
 * human is visible from anywhere in the console, not only once you remember
 * to open the tab. So this counts unread ACTION_NEEDED messages specifically
 * — the same thing the inbox turns orange for — and not all unread, which
 * would put a number on the nav for a successful release nobody has read yet.
 *
 * Deliberately **not** polled. The Bug Hunter tab's own inbox subscribes to
 * this exact query on a 30s interval, so while you are on that tab this badge
 * updates from the shared RTK Query cache for free; everywhere else it costs
 * one request per app load. A second poll running on every page of the admin
 * console for a number that changes a few times a night is not worth it.
 */
export const BugHunterNavBadge: FC = () => {
  const { data } = useGetBugHunterNotificationsQuery();

  const waiting = (data?.items ?? []).filter(
    item => !item.readAt && item.level === BugHunterNotificationLevel.ACTION_NEEDED,
  ).length;

  if (waiting === 0) return null;

  return (
    <span
      className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold bg-orange-500 text-white"
      title={en.bugHunter.inboxWaitingOnYou.replace("{count}", String(waiting))}
    >
      {waiting}
    </span>
  );
};
