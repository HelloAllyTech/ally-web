import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  markRead: vi.fn(),
  notifications: [] as any[],
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));

vi.mock("@api", () => ({
  useGetNotificationsQuery: () => ({ data: { data: mocks.notifications }, isLoading: false }),
  useMarkNotificationReadMutation: () => [mocks.markRead],
  useMarkAllNotificationsReadMutation: () => [vi.fn()],
}));

import NotificationPanel, { notificationTargetRoute } from "../NotificationPanel";

const notification = (overrides: Record<string, unknown> = {}) => ({
  id: "n1",
  type: "COURSE_DISCUSSION_REPLY",
  title: "New reply to your post",
  body: "Asha replied to your post",
  data: { screen: "CourseDiscussion", trackId: "t1", itemId: "i1", postId: "p9" },
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("notificationTargetRoute", () => {
  it("maps a course-discussion reply to the track item with the post highlighted", () => {
    expect(notificationTargetRoute(notification() as any)).toBe("/track/t1/item/i1?post=p9");
  });

  it.each([
    ["another type", { type: "ENGAGEMENT_REMINDER" }],
    ["null data", { data: null }],
    ["a different screen", { data: { screen: "Other", trackId: "t1", itemId: "i1", postId: "p" } }],
    ["a missing postId", { data: { screen: "CourseDiscussion", trackId: "t1", itemId: "i1" } }],
    [
      "a non-string id",
      { data: { screen: "CourseDiscussion", trackId: 1, itemId: "i1", postId: "p" } },
    ],
  ])("returns null for %s", (_label, overrides) => {
    expect(notificationTargetRoute(notification(overrides) as any)).toBeNull();
  });
});

describe("NotificationPanel click", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks read, closes and navigates for a discussion reply", () => {
    mocks.notifications = [notification()];
    const onClose = vi.fn();
    render(<NotificationPanel onClose={onClose} />);
    fireEvent.click(screen.getByTestId("notification-item"));
    expect(mocks.markRead).toHaveBeenCalledWith("n1");
    expect(onClose).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/track/t1/item/i1?post=p9");
  });

  it("only marks read for an informational notification", () => {
    mocks.notifications = [notification({ type: "ENGAGEMENT_REMINDER", data: null })];
    const onClose = vi.fn();
    render(<NotificationPanel onClose={onClose} />);
    fireEvent.click(screen.getByTestId("notification-item"));
    expect(mocks.markRead).toHaveBeenCalledWith("n1");
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
