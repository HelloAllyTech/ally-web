import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BugHunterNotificationLevel } from "@types";

import { NotificationInbox } from "../NotificationInbox";

const getNotifications = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock("@api", () => ({
  useGetBugHunterNotificationsQuery: (...args: unknown[]) => getNotifications(...args),
  useMarkBugHunterNotificationReadMutation: () => [markRead, { isLoading: false }],
  useMarkAllBugHunterNotificationsReadMutation: () => [markAllRead, { isLoading: false }],
}));
vi.mock("@hooks", () => ({}));
vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@utils", () => ({
  formatDate: (d: string) => d,
  formatDateTime: (d: string) => d,
  formatTimestamp: (d: string) => d,
}));
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const note = (overrides: Record<string, unknown> = {}) => ({
  id: "n-1",
  findingId: "finding-1",
  runId: null,
  repo: "ally-be",
  level: BugHunterNotificationLevel.INFO,
  title: "Live in production: Terms link",
  body: "Released as v1.4.2 in ally-be.",
  readAt: null,
  readBy: null,
  createdAt: "2026-08-17",
  ...overrides,
});

const renderInbox = (items: any[], unreadCount: number, onOpen = vi.fn()) => {
  getNotifications.mockReturnValue({
    data: { items, unreadCount },
    isLoading: false,
  });
  render(<NotificationInbox onOpenFinding={onOpen} />);
  return onOpen;
};

describe("NotificationInbox", () => {
  beforeEach(() => vi.clearAllMocks());

  it("leads with what is actually blocked, not the raw unread count", () => {
    renderInbox(
      [note({ level: BugHunterNotificationLevel.ACTION_NEEDED }), note({ id: "n-2" })],
      2,
    );
    expect(screen.getByText("1 waiting on you")).toBeInTheDocument();
  });

  it("distinguishes unread-but-not-blocking from something needing an answer", () => {
    renderInbox([note()], 1);
    expect(screen.getByText("Nothing blocked — just updates")).toBeInTheDocument();
  });

  it("says all clear when there is nothing unread", () => {
    renderInbox([note({ readAt: "2026-08-17" })], 0);
    expect(screen.getByText("Nothing new")).toBeInTheDocument();
  });

  it("stays collapsed until asked — an always-open inbox becomes wallpaper", () => {
    renderInbox([note()], 1);
    expect(screen.queryByText("Live in production: Terms link")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Messages from Bug Hunter"));
    expect(screen.getByText("Live in production: Terms link")).toBeInTheDocument();
  });

  it("opens the bug and marks the notification read in one click", () => {
    const onOpen = renderInbox([note()], 1);
    fireEvent.click(screen.getByText("Messages from Bug Hunter"));
    fireEvent.click(screen.getByText("Live in production: Terms link"));

    expect(markRead).toHaveBeenCalledWith("n-1");
    expect(onOpen).toHaveBeenCalledWith("finding-1");
  });

  it("does not re-mark something already read", () => {
    renderInbox([note({ readAt: "2026-08-17" })], 0);
    fireEvent.click(screen.getByText("Messages from Bug Hunter"));
    fireEvent.click(screen.getByText("Live in production: Terms link"));

    expect(markRead).not.toHaveBeenCalled();
  });

  it("offers a clear-all only while something is unread", () => {
    renderInbox([note()], 1);
    fireEvent.click(screen.getByText("Mark all read"));
    expect(markAllRead).toHaveBeenCalled();
  });

  it("hides clear-all when the queue is already clear", () => {
    renderInbox([note({ readAt: "2026-08-17" })], 0);
    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });

  it("explains what the inbox is for when it is empty", () => {
    renderInbox([], 0);
    fireEvent.click(screen.getByText("Messages from Bug Hunter"));
    expect(screen.getByText(/I post here when I need an answer/)).toBeInTheDocument();
  });
});
