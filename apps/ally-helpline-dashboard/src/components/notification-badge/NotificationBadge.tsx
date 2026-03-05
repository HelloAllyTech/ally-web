import { FC } from "react";

interface NotificationBadgeProps {
  count: number;
  isExpanded?: boolean;
}

const NotificationBadge: FC<NotificationBadgeProps> = ({ count, isExpanded }) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <div
      data-testid="notification-badge"
      className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 animate-pulse z-10 ${
        isExpanded ? "" : "absolute -top-2 -right-3"
      }`}
    >
      <span
        data-testid="notification-badge-count"
        className="text-white text-[10px] font-bold leading-none px-1"
      >
        {displayCount}
      </span>
    </div>
  );
};

export default NotificationBadge;


