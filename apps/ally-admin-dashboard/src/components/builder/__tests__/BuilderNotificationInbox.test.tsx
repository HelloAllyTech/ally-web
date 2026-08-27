import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderNotification } from "@types";

vi.mock("@components", () => ({ cellTypes: {} }));
// @utils's barrel pulls in loggerWithRedux -> @store -> the real @api module
// at module-eval time, which would fight the @api mock below (missing
// baseAPI) — so it's stubbed down to just what this component actually uses.
vi.mock("@utils", () => ({ formatDateTime: (d: string) => d }));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const markAllRead = vi.fn();
let queryResult: { data: { notifications: BuilderNotification[]; unread: number } | undefined; isLoading: boolean };

vi.mock("@api", () => ({
  useGetBuilderNotificationsQuery: () => queryResult,
  useMarkBuilderNotificationsReadMutation: () => [markAllRead, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuilderNotificationInbox } from "../BuilderNotificationInbox";

const notification = (overrides: Partial<BuilderNotification> = {}): BuilderNotification => ({
  id: "n1",
  sessionId: "session-1",
  kind: "question_pending",
  message: "I need a decision on the retry policy.",
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("BuilderNotificationInbox", () => {
  it("renders nothing while loading", () => {
    queryResult = { data: undefined, isLoading: true };
    const { container } = render(<BuilderNotificationInbox />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the unread count on the collapsed header", () => {
    queryResult = { data: { notifications: [notification()], unread: 1 }, isLoading: false };
    render(<BuilderNotificationInbox />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 unread")).toBeInTheDocument();
  });

  it("expands to list notifications, and navigates to the session on click", () => {
    queryResult = {
      data: { notifications: [notification({ id: "n2", sessionId: "session-42" })], unread: 1 },
      isLoading: false,
    };
    render(<BuilderNotificationInbox />);

    fireEvent.click(screen.getByText("Notifications"));
    fireEvent.click(screen.getByText("I need a decision on the retry policy."));

    expect(navigateMock).toHaveBeenCalledWith("/builder/session-42");
  });

  it("marks everything read via the bulk action", () => {
    queryResult = { data: { notifications: [notification()], unread: 1 }, isLoading: false };
    render(<BuilderNotificationInbox />);

    fireEvent.click(screen.getByText("Mark all read"));

    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it("has nothing to mark read once everything is read", () => {
    queryResult = {
      data: { notifications: [notification({ readAt: new Date().toISOString() })], unread: 0 },
      isLoading: false,
    };
    render(<BuilderNotificationInbox />);

    expect(screen.queryByText("Mark all read")).toBeNull();
  });
});
