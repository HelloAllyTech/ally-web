import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { trackMock, permissionsRef, toastMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  permissionsRef: {
    current: [
      "view:helpline:lobby",
      "view:helpline:chat",
      "view:helpline:monitor",
      "edit:helpline:transfer",
      "edit:helpline:whisper",
      "view:helpline:qa",
    ] as string[],
  },
  toastMock: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: ["ADMIN"] } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";
import type { MonitorDto } from "@types";

import { HelplineMonitor } from "../HelplineMonitor";
import {
  fetchMock,
  fetchRoutes,
  json,
  lastSocket,
  lobbyEntry,
  makeStore,
  meDto,
  requests,
  resetKit,
  renderWorkspace,
  seed,
  type TestStore,
} from "./helplineTestKit";

const monitorDto = (overrides: Partial<MonitorDto> = {}): MonitorDto => ({
  tiles: { waiting: 2, active: 1, listenersAvailable: 2, openHighFlags: 1 },
  activeChats: [
    {
      id: "chat-1",
      status: "ACTIVE",
      talkerName: "Ravi",
      language: "en",
      listener: { id: 7, displayName: "Meera" },
      riskLevel: "HIGH",
      waitStartedAt: "2026-10-05T10:00:00.000Z",
      claimedAt: "2026-10-05T10:03:00.000Z",
      endedAt: null,
      endedReason: null,
      lastMessageAt: "2026-10-05T10:20:00.000Z",
      messageCount: 12,
      erased: false,
      lastMessageAgeSeconds: 90,
      listenerConnected: true,
      talkerConnected: false,
      transferPending: true,
      openFlags: 1,
    },
  ],
  waiting: [
    lobbyEntry({ chatId: "wait-1", displayName: "Anonymous" }),
    lobbyEntry({ chatId: "wait-2", displayName: "Kiran", riskLevel: "HIGH", priority: 100 }),
  ],
  listeners: [
    {
      userId: 9,
      displayName: "Zoya",
      presence: "OFFLINE",
      activeChatCount: 0,
      maxConcurrentChats: 2,
      languages: ["en"],
    },
    {
      userId: 7,
      displayName: "Meera",
      presence: "AVAILABLE",
      activeChatCount: 1,
      maxConcurrentChats: 2,
      languages: ["en", "hi"],
    },
    {
      userId: 8,
      displayName: "Arun",
      presence: "AWAY",
      activeChatCount: 0,
      maxConcurrentChats: 2,
      languages: ["ta"],
    },
    {
      userId: 6,
      displayName: "Bilal",
      presence: "AVAILABLE",
      activeChatCount: 0,
      maxConcurrentChats: 3,
      languages: ["en"],
    },
  ],
  ...overrides,
});

const renderMonitor = (store: TestStore, url = "/helpline/monitor") =>
  renderWorkspace(store, <HelplineMonitor />, { path: "/helpline/monitor", url });

describe("HelplineMonitor", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    trackMock.mockReset();
    toastMock.mockReset();
    toastMock.success.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    seed(store, { me: meDto() });
    fetchRoutes["GET /v1/helpline/monitor"] = () => json(monitorDto());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the four tiles, the active chats, the queue and the roster", async () => {
    renderMonitor(store);

    const tiles = await screen.findByTestId("monitor-tiles");
    expect(within(tiles).getByTestId("tile-waiting")).toHaveTextContent("Waiting2");
    expect(within(tiles).getByTestId("tile-active")).toHaveTextContent("Active chats1");
    expect(within(tiles).getByTestId("tile-listeners")).toHaveTextContent("Listeners available2");
    expect(within(tiles).getByTestId("tile-high-flags")).toHaveTextContent("Open high-risk flags1");

    const row = screen.getByTestId("monitor-chat-chat-1");
    expect(row).toHaveTextContent("Meera");
    expect(row).toHaveTextContent("Ravi");
    expect(row).toHaveTextContent("High risk");
    expect(row).toHaveTextContent("Waiting for a listener");
    // Listener connected, talker not — said in words, not colour alone.
    expect(within(row).getAllByText("Connected")).toHaveLength(1);
    expect(within(row).getAllByText("Disconnected")).toHaveLength(1);

    // HIGH risk first in the queue.
    const queue = screen.getByTestId("monitor-waiting-table");
    const queueRows = within(queue).getAllByRole("row").slice(1);
    expect(queueRows[0]).toHaveTextContent("Kiran");
    expect(queueRows[1]).toHaveTextContent("Anonymous");

    // A roster grouped by status, then by name — never ranked by load.
    const roster = within(screen.getByTestId("monitor-listeners-table"))
      .getAllByRole("row")
      .slice(1)
      .map(tr => tr.querySelector("td")?.textContent);
    expect(roster).toEqual(["Bilal", "Meera", "Arun", "Zoya"]);
  });

  it("a row opens the chat view", async () => {
    renderMonitor(store);
    fireEvent.click(await screen.findByTestId("monitor-chat-chat-1"));
    expect(await screen.findByTestId("chat-route")).toBeInTheDocument();
  });

  it("assigns a waiting chat to an available listener with room", async () => {
    fetchRoutes["POST /v1/helpline/chats/wait-2/assign"] = () => json({});
    renderMonitor(store);

    const row = await screen.findByTestId("monitor-waiting-wait-2");
    fireEvent.click(within(row).getByRole("button", { name: "Assign to…" }));
    const dialog = screen.getByRole("dialog", { name: "Assign Kiran" });
    const confirm = within(dialog).getByRole("button", { name: "Assign" });
    expect(confirm).toBeDisabled();

    const picker = within(dialog).getByRole("combobox", { name: "Listener" });
    expect(
      within(picker)
        .getAllByRole("option")
        .map(option => option.textContent),
    ).toEqual(["Choose a listener", "Bilal · 0 of 3 chats", "Meera · 1 of 2 chats"]);
    fireEvent.change(picker, { target: { value: "6" } });
    fireEvent.click(confirm);

    await waitFor(() =>
      expect(requests("POST", "/v1/helpline/chats/wait-2/assign")).toHaveLength(1),
    );
    const [[request]] = requests("POST", "/v1/helpline/chats/wait-2/assign");
    expect(await (request as Request).clone().json()).toEqual({ listenerId: 6 });
    await waitFor(() =>
      expect(toastMock.success).toHaveBeenCalledWith("Assigned to Bilal. They've been alerted."),
    );
    expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_CHAT_ASSIGNED, {
      chat_id: "wait-2",
      risk_level: "HIGH",
    });
  });

  it("refreshes when the queue changes over the socket", async () => {
    renderMonitor(store);
    await screen.findByTestId("monitor-tiles");
    await act(async () => {
      lastSocket().connect();
    });
    const before = requests("GET", "/v1/helpline/monitor").length;
    await act(async () => {
      lastSocket().fire("QUEUE_UPDATED", {
        waiting: [],
        counts: { waiting: 0, active: 1, listenersAvailable: 2 },
      });
    });
    await waitFor(
      () => expect(requests("GET", "/v1/helpline/monitor").length).toBeGreaterThan(before),
      { timeout: 4000 },
    );
  });

  it("risk calibration shows outcomes, sources and a chat link per flag", async () => {
    fetchRoutes["GET /v1/helpline/risk-flags"] = request => {
      expect(new URL(request.url).searchParams.get("days")).toBe("7");
      const counts = (UNREVIEWED: number, CONFIRMED: number, FALSE_POSITIVE: number) => ({
        UNREVIEWED,
        CONFIRMED,
        FALSE_POSITIVE,
      });
      return json({
        items: [
          {
            id: "flag-1",
            chatId: "chat-1",
            chatStatus: "ENDED",
            chatRiskLevel: "HIGH",
            listener: { id: 7, displayName: "Meera" },
            erased: false,
            messageId: 3,
            level: "HIGH",
            source: "CLASSIFIER",
            confidence: 0.82,
            subject: "SELF",
            signal: "a live signal that must never be shown here",
            resourcesSent: true,
            supervisorsAlerted: 2,
            acknowledgedAt: "2026-10-05T10:06:00.000Z",
            acknowledgedByName: "Meera",
            outcome: "FALSE_POSITIVE",
            outcomeNote: "Song lyrics",
            createdAt: "2026-10-05T10:05:00.000Z",
            hitCount: 3,
            lastHitAt: "2026-10-05T10:09:00.000Z",
            latestSignal: "another live signal",
          },
        ],
        counts: counts(2, 5, 1),
        bySource: {
          KEYWORD: { ...counts(1, 4, 1), total: 6 },
          CLASSIFIER: { ...counts(1, 1, 0), total: 2 },
        },
        classifierByConfidence: [
          { from: 0, to: 0.5, ...counts(0, 0, 0) },
          { from: 0.6, to: 0.7, ...counts(1, 0, 0) },
          { from: 0.7, to: 0.8, ...counts(0, 1, 0) },
        ],
        riskHighConfidence: 0.7,
        days: 7,
      });
    };
    renderMonitor(store, "/helpline/monitor?view=calibration");

    const panel = await screen.findByTestId("risk-calibration");
    expect(await within(panel).findByTestId("calibration-outcome-CONFIRMED")).toHaveTextContent(
      "Confirmed5",
    );
    expect(within(panel).getByTestId("calibration-outcome-FALSE_POSITIVE")).toHaveTextContent(
      "False positive1",
    );
    expect(within(panel).getByTestId("calibration-source-KEYWORD")).toHaveTextContent(
      "Keyword match6",
    );
    expect(within(panel).getByTestId("calibration-source-KEYWORD-outcomes")).toHaveTextContent(
      "4 confirmed · 1 false positive · 1 unreviewed",
    );
    expect(panel).toHaveTextContent("82%");
    expect(panel).toHaveTextContent("Song lyrics");
    expect(within(panel).getByTestId("calibration-hits")).toHaveTextContent("3");
    // Rows carry live signals; this view never renders them.
    expect(panel).not.toHaveTextContent("live signal");
    // Classifier outcomes by confidence, with the org's threshold marked.
    const bands = within(within(panel).getByTestId("calibration-bands")).getAllByRole("row");
    expect(bands[3]).toHaveTextContent("0.70–0.80");
    expect(bands[3]).toHaveTextContent("Your threshold");
    expect(bands[2]).not.toHaveTextContent("Your threshold");
    expect(within(panel).getByRole("link", { name: "Open chat" })).toHaveAttribute(
      "href",
      "/helpline/chat/chat-1",
    );
    // The explainer tooltip's trigger.
    expect(panel.querySelector('button[aria-label="About risk calibration"]')).not.toBeNull();
  });

  it("says plainly when the caller isn't a supervisor", () => {
    permissionsRef.current = ["view:helpline:lobby"];
    renderMonitor(store);
    expect(screen.getByText("The Monitor is for supervisors.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    permissionsRef.current = [
      "view:helpline:lobby",
      "view:helpline:chat",
      "view:helpline:monitor",
      "edit:helpline:transfer",
      "edit:helpline:whisper",
      "view:helpline:qa",
    ];
  });
});
