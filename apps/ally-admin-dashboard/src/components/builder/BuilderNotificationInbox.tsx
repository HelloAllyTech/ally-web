import { FC, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Button } from "@ally-ui-mono/ui-shared";
import { useGetBuilderNotificationsQuery, useMarkBuilderNotificationsReadMutation } from "@api";
import { en, ROUTES } from "@constants";
import { BuilderNotification } from "@types";
import { formatDateTime } from "@utils";

/**
 * What Builder has said to you, near the top of mission control.
 *
 * Ports the Bug Hunter inbox pattern (see `pages/BugHunter/NotificationInbox`)
 * to a simpler notification shape: Builder's rows carry only a `kind` and a
 * message, not Bug Hunter's action-needed/problem/info severity split, so
 * there is one visual style per row rather than three. `readAt` still drives
 * the unread count and the "mark all read" action — there is no per-row read
 * endpoint, only the bulk one, so a row cannot be dismissed individually.
 *
 * Collapsed by default for the same reason Bug Hunter's is: an inbox that is
 * always open is wallpaper, and the unread count is the thing worth seeing
 * from outside the tab (see `BuilderNavBadge`).
 */
export const BuilderNotificationInbox: FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const strings = en.builder.notifications;

  const { data, isLoading } = useGetBuilderNotificationsQuery(undefined, {
    // Interviews and builds move on their own — see Builder.tsx's own poll.
    pollingInterval: 15_000,
    skipPollingIfUnfocused: true,
  });
  const [markAllRead, { isLoading: isClearing }] = useMarkBuilderNotificationsReadMutation();

  const items = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  const handleClick = (notification: BuilderNotification) => {
    navigate(ROUTES.BUILDER_SESSION(notification.sessionId));
  };

  if (isLoading) return null;

  return (
    <div className="max-w-3xl rounded border border-border-light">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-typography-900"
          aria-expanded={open}
        >
          {strings.title}
          {unread > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white">
              {unread}
            </span>
          )}
        </button>

        <span className="flex-1 text-xs text-typography-600">
          {unread > 0 ? strings.unreadLabel(unread) : strings.empty}
        </span>

        {unread > 0 && (
          <Button size="sm" kind="ghost" disabled={isClearing} onClick={() => markAllRead()}>
            {strings.markAllRead}
          </Button>
        )}
      </div>

      {open && (
        <ul className="max-h-80 overflow-y-auto border-t border-border-light custom-scrollbar">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-sm text-typography-500">{strings.empty}</li>
          ) : (
            items.map(notification => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={`w-full cursor-pointer border-b border-b-border-light px-4 py-3 text-left hover:bg-neutral-50 ${
                    notification.readAt ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-typography-600">
                      {strings.kinds[notification.kind] ?? notification.kind}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-typography-500">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-typography-900">{notification.message}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
