import { FC, useState } from "react";

import { Button } from "@ally-ui-mono/ui-shared";
import {
  useGetBugHunterNotificationsQuery,
  useMarkAllBugHunterNotificationsReadMutation,
  useMarkBugHunterNotificationReadMutation,
} from "@api";
import { AgentAvatar } from "@components/agent-avatar";
import { en } from "@constants";
import { BugHunterNotification, BugHunterNotificationLevel } from "@types";
import { formatDate } from "@utils";

const LEVEL_STYLES: Record<BugHunterNotificationLevel, string> = {
  [BugHunterNotificationLevel.ACTION_NEEDED]: "border-l-orange-500 bg-orange-50",
  [BugHunterNotificationLevel.PROBLEM]: "border-l-destructive-500 bg-destructive-50",
  [BugHunterNotificationLevel.INFO]: "border-l-border-light bg-white",
};

const LEVEL_LABELS: Record<BugHunterNotificationLevel, string> = {
  [BugHunterNotificationLevel.ACTION_NEEDED]: en.bugHunter.notificationLevelActionNeeded,
  [BugHunterNotificationLevel.PROBLEM]: en.bugHunter.notificationLevelProblem,
  [BugHunterNotificationLevel.INFO]: en.bugHunter.notificationLevelInfo,
};

interface NotificationInboxProps {
  /** Opens the bug a notification is about, in the same drawer the table uses. */
  onOpenFinding: (findingId: string) => void;
}

/**
 * Everything Bug Hunter has said to you, near the top of its own tab.
 *
 * This is the only channel it speaks on — escalations, run summaries and
 * release outcomes used to post to Slack and now land here instead. One place
 * to look, and nothing to keep in sync between two.
 *
 * Presented as messages from a person: an avatar on the header and on every
 * row, and copy written in its own voice (the message bodies themselves come
 * from ally-be's bug-hunter-voice module, first person for the same reason).
 *
 * Collapsed to a summary line by default. An inbox that is always open turns
 * into wallpaper, and the thing that actually needs to catch an eye is the
 * count of items where Bug Hunter has stopped and is waiting — so that count
 * is the headline, and everything else is one click away.
 */
export const NotificationInbox: FC<NotificationInboxProps> = ({ onOpenFinding }) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGetBugHunterNotificationsQuery(undefined, {
    // Bug Hunter works on GitHub's clock, not the browser's — a session can
    // merge or a release go green while the tab sits open.
    pollingInterval: 30_000,
    skipPollingIfUnfocused: true,
  });
  const [markRead] = useMarkBugHunterNotificationReadMutation();
  const [markAllRead, { isLoading: isClearing }] = useMarkAllBugHunterNotificationsReadMutation();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const actionNeeded = items.filter(
    item => !item.readAt && item.level === BugHunterNotificationLevel.ACTION_NEEDED,
  ).length;

  const handleClick = (notification: BugHunterNotification) => {
    if (!notification.readAt) markRead(notification.id);
    if (notification.findingId) onOpenFinding(notification.findingId);
  };

  if (isLoading) return null;

  return (
    <div className="border border-border-light rounded max-w-3xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex items-center gap-2 text-sm font-semibold text-typography-900 cursor-pointer"
          aria-expanded={open}
        >
          <AgentAvatar
            size="sm"
            presence={actionNeeded > 0 ? "waiting_on_you" : undefined}
            label={en.bugHunter.agentName}
          />
          {en.bugHunter.inboxTitle}
          {unreadCount > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold ${
                actionNeeded > 0 ? "bg-orange-500 text-white" : "bg-neutral-200 text-typography-700"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>

        <span className="text-xs text-typography-600 flex-1">
          {actionNeeded > 0
            ? en.bugHunter.inboxWaitingOnYou.replace("{count}", String(actionNeeded))
            : unreadCount > 0
              ? en.bugHunter.inboxNothingBlocked
              : en.bugHunter.inboxAllClear}
        </span>

        {unreadCount > 0 && (
          <Button size="sm" kind="ghost" disabled={isClearing} onClick={() => markAllRead()}>
            {en.bugHunter.inboxMarkAllRead}
          </Button>
        )}
      </div>

      {open && (
        <ul className="border-t border-border-light max-h-80 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-sm text-typography-500">{en.bugHunter.inboxEmpty}</li>
          ) : (
            items.map(notification => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`w-full text-left px-4 py-3 border-l-4 border-b border-b-border-light cursor-pointer hover:bg-neutral-50 ${
                    LEVEL_STYLES[notification.level]
                  } ${notification.readAt ? "opacity-60" : ""}`}
                >
                  {/* The avatar on every row is what makes this read as a
                      message from someone rather than a log line. */}
                  <div className="flex gap-3">
                    <AgentAvatar size="sm" label={en.bugHunter.agentName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-typography-600">
                          {LEVEL_LABELS[notification.level]}
                        </span>
                        <span className="text-xs text-typography-500 ml-auto whitespace-nowrap tabular-nums">
                          {formatDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-typography-900 font-medium mt-0.5">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-typography-700 mt-0.5">{notification.body}</p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
