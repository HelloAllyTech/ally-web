import { FC, useEffect, useRef, useState } from "react";

import { Bell } from "lucide-react";

import { useGetUnreadNotificationCountQuery } from "@api";

import NotificationPanel from "./NotificationPanel";
import NotificationBadge from "../notification-badge/NotificationBadge";

const UNREAD_POLL_INTERVAL_MS = 60_000;

interface NotificationBellProps {
  isExpanded?: boolean;
}

/**
 * Bell button for the nav sidebar: unread badge (polled every minute, same
 * approach as the unread-review badge) + a click-away notification panel.
 */
const NotificationBell: FC<NotificationBellProps> = ({ isExpanded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unread } = useGetUnreadNotificationCountQuery(undefined, {
    pollingInterval: UNREAD_POLL_INTERVAL_MS,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClickAway = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        data-testid="notification-bell"
        className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
        onClick={() => setIsOpen(open => !open)}
        aria-label="Notifications"
      >
        <span className="relative">
          <Bell size={20} />
          {(unread?.count ?? 0) > 0 && <NotificationBadge count={unread!.count} />}
        </span>
        {isExpanded && <span className="text-sm">Notifications</span>}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50">
          <NotificationPanel onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
