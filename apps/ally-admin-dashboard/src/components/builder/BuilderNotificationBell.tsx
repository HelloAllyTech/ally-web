import { FC, useEffect, useRef, useState } from "react";

import { Notification } from "@icons";
import { useNavigate } from "react-router-dom";

import { Button } from "@ally-ui-mono/ui-shared";
import { useGetBuilderNotificationsQuery, useMarkBuilderNotificationsReadMutation } from "@api";
import { en, ROUTES } from "@constants";
import { BuilderNotification } from "@types";
import { formatDateTime } from "@utils";

export const BuilderNotificationBell: FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const strings = en.builder.notifications;

  const { data, isLoading, isError } = useGetBuilderNotificationsQuery(undefined, {
    pollingInterval: 15_000,
    skipPollingIfUnfocused: true,
  });
  const [markAllRead, { isLoading: isClearing }] = useMarkBuilderNotificationsReadMutation();

  const items = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

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

  const handleNotificationClick = (notification: BuilderNotification) => {
    setIsOpen(false);
    navigate(ROUTES.BUILDER_SESSION(notification.sessionId));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={strings.title}
        aria-expanded={isOpen}
        disabled={isLoading}
        onClick={() => setIsOpen(open => !open)}
        className="relative flex cursor-pointer items-center justify-center rounded p-1.5 text-typography-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        <Notification className="h-5 w-5" />
        {!isLoading && unread > 0 && (
          <span
            aria-label={`${unread} unread`}
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white"
          >
            {unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded border border-border-light bg-white shadow-md">
          <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
            <span className="text-sm font-semibold text-typography-900">{strings.title}</span>
            {unread > 0 && (
              <Button size="sm" kind="ghost" disabled={isClearing} onClick={() => markAllRead()}>
                {strings.markAllRead}
              </Button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto custom-scrollbar">
            {isError ? (
              <li className="px-4 py-6 text-sm text-destructive-500">{strings.error}</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-typography-500">{strings.empty}</li>
            ) : (
              items.map(notification => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
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
        </div>
      )}
    </div>
  );
};
