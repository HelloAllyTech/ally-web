import { FC } from "react";

import { useGetBuilderNotificationsQuery } from "@api";
import { en } from "@constants";

/**
 * How many of Builder's notifications are unread, shown on its sidebar tab —
 * the same reasoning as `BugHunterNavBadge`: a backgrounded agent waiting on
 * a question or reporting a failed build should be visible from anywhere in
 * the console, not only once you remember to open the tab.
 *
 * Unlike Bug Hunter, Builder's notifications carry no severity split — a
 * `budget_reached` message is exactly as much "needs you" as a
 * `question_pending` one — so this counts all unread rather than a subset.
 *
 * Deliberately **not** polled here. `BuilderNotificationInbox` on the
 * mission-control page subscribes to the same query on its own interval, so
 * this badge rides that cache for free while the tab is open; everywhere else
 * it costs one request per app load, matching the Bug Hunter badge's trade-off.
 */
export const BuilderNavBadge: FC = () => {
  const { data } = useGetBuilderNotificationsQuery();

  const unread = data?.unread ?? 0;

  if (unread === 0) return null;

  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white"
      title={en.builder.notifications.unreadLabel(unread)}
    >
      {unread}
    </span>
  );
};
