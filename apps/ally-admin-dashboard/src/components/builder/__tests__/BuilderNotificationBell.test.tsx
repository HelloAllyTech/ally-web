import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderNotification } from "@types";

vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@utils", () => ({ formatDateTime: (d: string) => d }));
vi.mock("@icons", () => ({ Notification: () => <svg data-testid="bell-icon" /> }));

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
let queryResult: {
  data: { notifications: BuilderNotification[]; unread: number } | undefined;
  isLoading: boolean;
  isError: boolean;
};

vi.mock("@api", () => ({
  useGetBuilderNotificationsQuery: () => queryResult,
  useMarkBuilderNotificationsReadMutation: () => [markAllRead, { isLoading: false }],
}));

// eslint-disable-next-line import/first
import { BuilderNotificationBell } from "../BuilderNotificationBell";

const notification = (overrides: Partial<BuilderNotification> = {}): BuilderNotification => ({
  id: "n1",
  sessionId: "session-1",
  kind: "question_pending",
  message: "I need a decision on the retry policy.",
  readAt: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("BuilderNotificationBell", () => {
  it("renders a disabled bell while loading", () => {
    queryResult = { data: undefined, isLoading: true, isError: false };
    render(<BuilderNotificationBell />);
    expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notifications/i })).toBeDisabled();
  });

  it("renders the bell icon when loaded", () => {
    queryResult = { data: { notifications: [], unread: 0 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);
    expect(screen.getByTestId("bell-icon")).toBeInTheDocument();
  });

  it("shows unread badge when there are unread notifications", () => {
    queryResult = { data: { notifications: [notification()], unread: 3 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show badge when unread count is zero", () => {
    queryResult = {
      data: { notifications: [notification({ readAt: new Date().toISOString() })], unread: 0 },
      isLoading: false,
      isError: false,
    };
    render(<BuilderNotificationBell />);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("opens the popover when the bell is clicked", () => {
    queryResult = { data: { notifications: [], unread: 0 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);

    expect(screen.queryByText("No notifications")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });

  it("closes the popover when the bell is clicked again", () => {
    queryResult = { data: { notifications: [], unread: 0 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);

    const bell = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bell);
    expect(screen.getByText("No notifications")).toBeInTheDocument();
    fireEvent.click(bell);
    expect(screen.queryByText("No notifications")).toBeNull();
  });

  it("closes the popover when clicking outside the container", () => {
    queryResult = { data: { notifications: [], unread: 0 }, isLoading: false, isError: false };
    render(
      <div>
        <BuilderNotificationBell />
        <div data-testid="outside">outside</div>
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("No notifications")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByText("No notifications")).toBeNull();
  });

  it("shows Mark all read button only when there are unread notifications", () => {
    queryResult = { data: { notifications: [notification()], unread: 1 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("Mark all read")).toBeInTheDocument();
  });

  it("does not show Mark all read when all are read", () => {
    queryResult = {
      data: { notifications: [notification({ readAt: new Date().toISOString() })], unread: 0 },
      isLoading: false,
      isError: false,
    };
    render(<BuilderNotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.queryByText("Mark all read")).toBeNull();
  });

  it("calls markAllRead when the button is clicked", () => {
    queryResult = { data: { notifications: [notification()], unread: 1 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByText("Mark all read"));
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it("navigates to the session and closes popover when a notification is clicked", () => {
    queryResult = {
      data: { notifications: [notification({ sessionId: "session-42" })], unread: 1 },
      isLoading: false,
      isError: false,
    };
    render(<BuilderNotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    fireEvent.click(screen.getByText("I need a decision on the retry policy."));

    expect(navigateMock).toHaveBeenCalledWith("/builder/session-42");
    expect(screen.queryByText("I need a decision on the retry policy.")).toBeNull();
  });

  it("shows No notifications empty state when there are no notifications", () => {
    queryResult = { data: { notifications: [], unread: 0 }, isLoading: false, isError: false };
    render(<BuilderNotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});
