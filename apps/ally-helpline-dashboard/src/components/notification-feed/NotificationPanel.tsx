import { FC } from "react";

import { useNavigate } from "react-router-dom";

import {
  NotificationItem as NotificationItemType,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@api";
import { buildTrackItemDiscussionPostRoute } from "@constants";

import NotificationItem from "./NotificationItem";

interface NotificationPanelProps {
  onClose: () => void;
}

const COURSE_DISCUSSION_REPLY = "COURSE_DISCUSSION_REPLY";

/**
 * The track-player route a notification deep-links to, or null when it has
 * no target. `data` is free-form JSON from the backend, so every field is
 * checked rather than trusted.
 */
export const notificationTargetRoute = (notification: NotificationItemType): string | null => {
  if (notification.type !== COURSE_DISCUSSION_REPLY) return null;
  const data = notification.data ?? {};
  const { screen, trackId, itemId, postId } = data as Record<string, unknown>;
  if (screen !== "CourseDiscussion") return null;
  if (typeof trackId !== "string" || !trackId) return null;
  if (typeof itemId !== "string" || !itemId) return null;
  if (typeof postId !== "string" || !postId) return null;
  return buildTrackItemDiscussionPostRoute(trackId, itemId, postId);
};

/**
 * Right-anchored dropdown panel listing the caller's notifications. Clicking
 * an item marks it read. A course-discussion reply then opens the track player
 * at that item with the reply highlighted (and closes the panel); engagement
 * reminders are informational (no deep link target), so the panel stays open.
 */
const NotificationPanel: FC<NotificationPanelProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetNotificationsQuery({ limit: 25, offset: 0 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some(notification => notification.readAt == null);

  const onItemClick = (notification: NotificationItemType) => {
    if (notification.readAt == null) {
      markRead(notification.id);
    }
    const target = notificationTargetRoute(notification);
    if (target) {
      onClose();
      navigate(target);
    }
  };

  return (
    <div
      data-testid="notification-panel"
      className="w-80 max-md:w-full max-h-[min(28rem,70dvh)] md:max-h-[28rem] flex flex-col bg-white rounded-lg shadow-lg border border-border-light overflow-hidden font-primary"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <p className="text-sm font-semibold text-gray-900">Notifications</p>
        <div className="flex items-center gap-3">
          {hasUnread && (
            <button
              data-testid="notification-mark-all-read"
              className="text-xs text-blue-600 hover:underline py-2 md:py-0"
              onClick={() => markAllRead()}
            >
              Mark all read
            </button>
          )}
          <button
            data-testid="notification-panel-close"
            className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center justify-center min-h-10 min-w-10 -mr-3 md:min-h-0 md:min-w-0 md:mr-0"
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
