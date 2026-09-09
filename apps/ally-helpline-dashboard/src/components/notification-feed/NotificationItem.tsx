import { FC } from "react";

import { NotificationItem as NotificationItemType } from "@api";

interface NotificationItemProps {
  notification: NotificationItemType;
  onClick: (notification: NotificationItemType) => void;
}

const timeAgo = (iso: string): string => {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const NotificationItem: FC<NotificationItemProps> = ({ notification, onClick }) => {
  const isUnread = notification.readAt == null;

  return (
    <button
      data-testid="notification-item"
      className={`w-full text-left px-4 py-3 border-b border-border-light hover:bg-gray-50 transition-colors ${
        isUnread ? "bg-blue-50/50" : ""
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start gap-2">
        {isUnread && (
          <span
            data-testid="notification-unread-dot"
            className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"
          />
        )}
        <div className={isUnread ? "" : "pl-4"}>
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-3 whitespace-pre-line">
            {notification.body}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
        </div>
      </div>
    </button>
  );
};

export default NotificationItem;
