import { FC } from "react";

import {
  NotificationItem as NotificationItemType,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@api";

import NotificationItem from "./NotificationItem";

interface NotificationPanelProps {
  onClose: () => void;
}

/**
 * Right-anchored dropdown panel listing the caller's notifications. Clicking
 * an item marks it read; engagement reminders are informational (no deep link
 * target yet), so the panel stays open for further reading.
 */
const NotificationPanel: FC<NotificationPanelProps> = ({ onClose }) => {
  const { data, isLoading } = useGetNotificationsQuery({ limit: 25, offset: 0 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some(notification => notification.readAt == null);

  const onItemClick = (notification: NotificationItemType) => {
    if (notification.readAt == null) {
      markRead(notification.id);
    }
  };

  return (
    <div
      data-testid="notification-panel"
      className="w-80 max-h-[28rem] flex flex-col bg-white rounded-lg shadow-lg border border-border-light overflow-hidden font-primary"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <p className="text-sm font-semibold text-gray-900">Notifications</p>
        <div className="flex items-center gap-3">
          {hasUnread && (
            <button
              data-testid="notification-mark-all-read"
              className="text-xs text-blue-600 hover:underline"
              onClick={() => markAllRead()}
            >
              Mark all read
            </button>
          )}
          <button
            data-testid="notification-panel-close"
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close notifications"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="overflow-y-auto">
        {isLoading ? (
          <p className="text-xs text-gray-500 px-4 py-6 text-center">Loading…</p>
        ) : notifications.length === 0 ? (
          <p
            data-testid="notification-panel-empty"
            className="text-xs text-gray-500 px-4 py-6 text-center"
          >
            You&apos;re all caught up — no notifications yet.
          </p>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={onItemClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
