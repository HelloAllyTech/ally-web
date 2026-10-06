import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { trackMock, chimeMock, notifyMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  chimeMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({
    permissions: ["view:helpline:lobby", "edit:helpline:presence", "edit:helpline:claim"],
    user: { id: 42, roles: ["LISTENER"] },
  }),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));
vi.mock("../alerts", () => ({
  playChime: chimeMock,
  showWaitingNotification: notifyMock,
  requestNotificationPermission: vi.fn(async () => "granted"),
  notificationPermission: vi.fn(() => "granted"),
}));

import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";

import { HelplineLobby } from "../HelplineLobby";
import {
  chatDetail,
  fetchMock,
  fetchRoutes,
  json,
  lastSocket,
  lobbyDto,
  lobbyEntry,
  makeStore,
  meDto,
  renderWorkspace,
  requests,
  resetKit,
  seed,
  type TestStore,
} from "./helplineTestKit";

const renderLobby = (store: TestStore) =>
  renderWorkspace(store, <HelplineLobby />, { path: "/helpline", url: "/helpline" });

describe("HelplineLobby", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    trackMock.mockReset();
    chimeMock.mockReset();
    notifyMock.mockReset();
    vi.mocked(toast).mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("disables Claim while Away and says why, without calling the server", () => {
    seed(store, {
      me: meDto({ presence: "AWAY" }),
      lobby: lobbyDto({
        waiting: [lobbyEntry()],
        counts: { waiting: 1, active: 0, listenersAvailable: 0 },
      }),
    });
    renderLobby(store);

    const row = screen.getByTestId("waiting-wait-1");
    const claim = within(row).getByRole("button", { name: "Claim" });
    expect(claim).toHaveAttribute("aria-disabled", "true");
    expect(claim).toHaveAccessibleDescription("Set yourself Available to claim chats.");
    fireEvent.click(claim);
    expect(requests("POST", "/v1/helpline/chats/wait-1/claim")).toHaveLength(0);
    expect(screen.getByTestId("lobby-away-hint")).toHaveTextContent(
      "You're Away — set yourself Available to take new chats.",
    );
  });

  it("disables Claim at capacity", () => {
    seed(store, {
      me: meDto({ activeChatCount: 2 }),
      lobby: lobbyDto({ waiting: [lobbyEntry()] }),
    });
    renderLobby(store);
    expect(
      within(screen.getByTestId("waiting-wait-1")).getByRole("button", { name: "Claim" }),
    ).toHaveAccessibleDescription("You're at your limit of 2 chats. Finish one to take another.");
  });

  it("shows the right empty state for Available and for Away", () => {
    seed(store, { me: meDto(), lobby: lobbyDto() });
    const { unmount } = renderLobby(store);
    expect(screen.getByTestId("lobby-empty")).toHaveTextContent("No one is waiting right now.");
    unmount();

    const away = makeStore();
    seed(away, { me: meDto({ presence: "AWAY" }), lobby: lobbyDto() });
    renderLobby(away);
    expect(screen.getByTestId("lobby-empty")).toHaveTextContent("You're Away");
  });

  it("lists the most urgent first: priority, then the longest wait", () => {
    seed(store, {
      me: meDto(),
      lobby: lobbyDto({
        waiting: [
          lobbyEntry({
            chatId: "newer",
            displayName: "Newer",
            waitStartedAt: "2026-10-05T10:05:00Z",
          }),
          lobbyEntry({
            chatId: "older",
            displayName: "Older",
            waitStartedAt: "2026-10-05T10:01:00Z",
          }),
          lobbyEntry({
            chatId: "urgent",
            displayName: "Urgent",
            priority: 100,
            riskLevel: "HIGH",
            waitStartedAt: "2026-10-05T10:09:00Z",
          }),
        ],
      }),
    });
    renderLobby(store);
    const rows = within(screen.getByTestId("waiting-list")).getAllByRole("listitem");
    expect(rows.map(row => row.getAttribute("data-testid"))).toEqual([
      "waiting-urgent",
      "waiting-older",
      "waiting-newer",
    ]);
    expect(within(rows[0]).getByTestId("risk-badge-HIGH")).toBeInTheDocument();
  });

  it("claims and opens the chat", async () => {
    seed(store, { me: meDto(), lobby: lobbyDto({ waiting: [lobbyEntry()] }) });
    fetchRoutes["POST /v1/helpline/chats/wait-1/claim"] = () => json(chatDetail());
    renderLobby(store);

    fireEvent.click(
      within(screen.getByTestId("waiting-wait-1")).getByRole("button", { name: "Claim" }),
    );
    expect(await screen.findByTestId("chat-route")).toBeInTheDocument();
    expect(trackMock).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.HELPLINE_CHAT_CLAIMED,
      expect.objectContaining({ chat_id: "wait-1", risk_level: "NONE" }),
    );
  });

  it("losing the claim race is a plain toast and a fresh list, not an error page", async () => {
    seed(store, { me: meDto(), lobby: lobbyDto({ waiting: [lobbyEntry()] }) });
    fetchRoutes["POST /v1/helpline/chats/wait-1/claim"] = () =>
      json({ statusCode: 409, message: "Conflict", errorCode: "HELPLINE_ALREADY_CLAIMED" }, 409);
    fetchRoutes["GET /v1/helpline/lobby"] = () => json(lobbyDto());
    renderLobby(store);

    fireEvent.click(
      within(screen.getByTestId("waiting-wait-1")).getByRole("button", { name: "Claim" }),
    );
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Someone else just picked this up."));
    await waitFor(() => expect(requests("GET", "/v1/helpline/lobby").length).toBeGreaterThan(0));
    expect(await screen.findByTestId("lobby-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-route")).not.toBeInTheDocument();
  });

  it("alerts an Available listener — sound and a content-free notification — when someone new joins", async () => {
    seed(store, { me: meDto(), lobby: lobbyDto({ waiting: [lobbyEntry()] }) });
    renderLobby(store);
    await act(async () => {
      lastSocket().connect();
    });

    await act(async () => {
      lastSocket().fire("QUEUE_UPDATED", {
        waiting: [lobbyEntry(), lobbyEntry({ chatId: "wait-2", displayName: "Priya" })],
        counts: { waiting: 2, active: 0, listenersAvailable: 1 },
      });
    });
    expect(await screen.findByTestId("waiting-wait-2")).toBeInTheDocument();
    expect(chimeMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith("Someone is waiting to talk");

    // The same queue again is not a new arrival.
    await act(async () => {
      lastSocket().fire("QUEUE_UPDATED", {
        waiting: [lobbyEntry(), lobbyEntry({ chatId: "wait-2" })],
        counts: { waiting: 2, active: 0, listenersAvailable: 1 },
      });
    });
    expect(chimeMock).toHaveBeenCalledTimes(1);
  });

  it("does not alert a listener who is Away", async () => {
    seed(store, { me: meDto({ presence: "AWAY" }), lobby: lobbyDto() });
    renderLobby(store);
    await act(async () => {
      lastSocket().connect();
      lastSocket().fire("QUEUE_UPDATED", {
        waiting: [lobbyEntry({ chatId: "wait-9" })],
        counts: { waiting: 1, active: 0, listenersAvailable: 0 },
      });
    });
    expect(chimeMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("switches presence with the server and shows the listener's load", async () => {
    seed(store, { me: meDto({ presence: "AWAY", activeChatCount: 1 }), lobby: lobbyDto() });
    fetchRoutes["PUT /v1/helpline/me/presence"] = async request => {
      expect(await request.clone().json()).toEqual({ status: "AVAILABLE" });
      return json(meDto({ presence: "AVAILABLE", activeChatCount: 1 }));
    };
    renderLobby(store);

    expect(screen.getByTestId("listener-load")).toHaveTextContent("1 of 2 chats");
    const available = screen.getByRole("radio", { name: "Available" });
    expect(available).toHaveAttribute("aria-checked", "false");
    fireEvent.click(available);
    expect(available).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(requests("PUT", "/v1/helpline/me/presence")).toHaveLength(1));
  });

  it("rolls presence back when the server refuses", async () => {
    seed(store, { me: meDto({ presence: "AWAY" }), lobby: lobbyDto() });
    fetchRoutes["PUT /v1/helpline/me/presence"] = () =>
      json({ statusCode: 500, message: "boom" }, 500);
    renderLobby(store);

    const available = screen.getByRole("radio", { name: "Available" });
    fireEvent.click(available);
    await waitFor(() => expect(available).toHaveAttribute("aria-checked", "false"));
    expect(toast.error).toHaveBeenCalledWith("Couldn't change your status. Please try again.");
  });
});
