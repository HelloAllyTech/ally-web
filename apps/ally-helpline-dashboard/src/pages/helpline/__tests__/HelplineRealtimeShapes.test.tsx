import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const LISTENER = [
  "view:helpline:lobby",
  "view:helpline:chat",
  "edit:helpline:message",
  "edit:helpline:end",
  "view:helpline:copilot",
  "edit:helpline:summary",
];
const SUPERVISOR = [
  ...LISTENER,
  "view:helpline:monitor",
  "edit:helpline:whisper",
  "edit:helpline:transfer",
];

const { permissionsRef, toastMock, alertToneMock } = vi.hoisted(() => ({
  permissionsRef: { current: [] as string[] },
  toastMock: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
  alertToneMock: vi.fn(),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: [] } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("../alerts", async importOriginal => ({
  ...(await importOriginal<typeof import("../alerts")>()),
  playAlertTone: alertToneMock,
}));

import type { RiskFlagDto } from "@types";

import { HelplineChatView } from "../HelplineChatView";
import {
  allEmits,
  chatDetail,
  fakeSockets,
  fetchMock,
  fetchRoutes,
  json,
  lastSocket,
  makeStore,
  meDto,
  requests,
  resetKit,
  riskFlag,
  renderWorkspace,
  seed,
  staffChat,
  staffMessage,
  type TestStore,
} from "./helplineTestKit";

const renderChat = (store: TestStore) =>
  renderWorkspace(store, <HelplineChatView />, {
    path: "/helpline/chat/:chatId",
    url: "/helpline/chat/chat-1",
  });

const connect = async () => {
  await act(async () => {
    lastSocket().connect();
  });
};

const fire = async (event: string, payload: unknown) => {
  await act(async () => {
    lastSocket().fire(event, payload);
  });
};

const flagUpdate = (flag: Partial<RiskFlagDto>) =>
  fire("RISK_FLAG_UPDATED", { chatId: "chat-1", flag: riskFlag(flag) });

describe("helpline realtime — the backend's final shapes", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    alertToneMock.mockReset();
    toastMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    permissionsRef.current = LISTENER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fold-until-acknowledged risk flags", () => {
    it("folds repeated hits into one banner that counts them and quotes the latest", async () => {
      seed(store, {
        me: meDto(),
        chat: chatDetail({ chat: staffChat({ riskLevel: "HIGH" }), riskFlags: [riskFlag()] }),
      });
      renderChat(store);
      await connect();
      expect(screen.queryByTestId("risk-fold")).not.toBeInTheDocument();

      await flagUpdate({
        hitCount: 3,
        lastHitAt: "2026-10-05T10:09:00Z",
        latestSignal: "no point anymore",
      });
      expect(await screen.findByTestId("risk-fold")).toHaveTextContent(
        "Flagged 3 times · latest: ‘no point anymore’",
      );
      expect(screen.getAllByTestId(/^risk-banner-/)).toHaveLength(1);
      // A fold at the same level doesn't sound again.
      expect(alertToneMock).not.toHaveBeenCalled();

      // Erased latest wording: fall back to the first signal.
      await flagUpdate({ hitCount: 4, latestSignal: null });
      await waitFor(() =>
        expect(screen.getByTestId("risk-fold")).toHaveTextContent(
          "Flagged 4 times · latest: ‘end it all’",
        ),
      );
    });

    it("an upgrade to HIGH re-opens a folded-away banner, says so, and replays the tone", async () => {
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          chat: staffChat({ riskLevel: "ELEVATED" }),
          riskFlags: [
            riskFlag({ level: "ELEVATED", source: "CLASSIFIER", supervisorsAlerted: null }),
          ],
        }),
      });
      renderChat(store);
      await connect();

      const banner = screen.getByTestId("risk-banner-flag-1");
      fireEvent.click(within(banner).getByRole("button", { name: "Hide steps" }));
      expect(within(banner).getByTestId("risk-details")).not.toBeVisible();

      await flagUpdate({ level: "HIGH", source: "CLASSIFIER", hitCount: 2, supervisorsAlerted: 1 });
      const raised = await screen.findByTestId("risk-raised");
      const upgraded = screen.getByTestId("risk-banner-flag-1");
      expect(upgraded).toHaveTextContent("High risk");
      expect(raised).toHaveTextContent("Raised from possible to high risk.");
      expect(within(upgraded).getByTestId("risk-details")).toBeVisible();
      // A high-risk banner can't be folded away.
      expect(within(upgraded).queryByRole("button", { name: /steps/ })).not.toBeInTheDocument();
      expect(alertToneMock).toHaveBeenCalledTimes(1);
      expect(screen.getAllByTestId("risk-badge-HIGH").length).toBeGreaterThan(0);
    });

    it("after acknowledgement, a new hit is a new flag and a new banner", async () => {
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          chat: staffChat({ riskLevel: "HIGH" }),
          riskFlags: [riskFlag({ acknowledgedAt: "2026-10-05T10:06:00Z", outcome: "CONFIRMED" })],
        }),
      });
      renderChat(store);
      await connect();
      expect(screen.queryByTestId(/^risk-banner-/)).not.toBeInTheDocument();

      await fire("RISK_FLAGGED", { chatId: "chat-1", flag: riskFlag({ id: "flag-2" }) });
      expect(await screen.findByTestId("risk-banner-flag-2")).toBeInTheDocument();
      expect(screen.getByTestId("risk-noted-flag-1")).toBeInTheDocument();
      expect(alertToneMock).toHaveBeenCalledTimes(1);
    });

    it("marks a folded hit in the transcript as a small 'Flagged again'", () => {
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          messages: [
            staffMessage(),
            staffMessage({
              id: 2,
              type: "RISK",
              senderRole: "SYSTEM",
              visibleToTalker: false,
              content: "",
              metadata: { flagId: "flag-1", level: "HIGH", source: "KEYWORD", folded: true },
            }),
          ],
        }),
      });
      renderChat(store);
      expect(screen.getByTestId("risk-folded-marker")).toHaveTextContent(
        "Flagged again · High risk",
      );
    });
  });

  describe("staff-only system kinds", () => {
    it("names who a chat went to, and shows a listener's note to the supervisor", () => {
      const system = (id: number, systemKind: string, extra = {}) =>
        staffMessage({
          id,
          type: "SYSTEM",
          senderRole: "SYSTEM",
          systemKind,
          visibleToTalker: false,
          content: "",
          ...extra,
        });
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          messages: [
            staffMessage({
              id: 1,
              type: "SYSTEM",
              senderRole: "SYSTEM",
              systemKind: "ACCEPTED",
              metadata: { params: { listenerName: "Asha" } },
            }),
            system(2, "TRANSFERRED", { metadata: { params: { listenerName: "Zoya" } } }),
            system(3, "ASSIGNED", { metadata: { params: { listenerName: "Bilal" } } }),
            system(4, "TAKEN_OVER", { metadata: { params: { listenerName: "Priya" } } }),
            system(5, "SUPERVISOR_REQUESTED", {
              senderRole: "LISTENER",
              senderUserId: 42,
              senderName: "Asha",
              content: "Please join",
            }),
            system(6, "SUPERVISOR_REQUESTED", { senderRole: "LISTENER", senderName: "Asha" }),
          ],
        }),
      });
      renderChat(store);
      expect(screen.getByTestId("system-talker-visible")).toHaveTextContent("Asha joined the chat");
      expect(screen.getAllByTestId("system-staff-only").map(line => line.textContent)).toEqual([
        "Only staff see this:Transferred to Zoya",
        "Only staff see this:Assigned to Bilal",
        "Only staff see this:Priya took over this chat",
        "Only staff see this:Asha asked a supervisor for help: “Please join”",
        "Only staff see this:Asha asked a supervisor for help",
      ]);
    });
  });

  describe("copilot rows and status", () => {
    it("starts from the chat's copilot status and takes suggestions and nudges from their own events", async () => {
      const me = meDto();
      seed(store, {
        me: {
          ...me,
          settings: {
            ...me.settings,
            copilot: { suggestions: true, nudges: true, riskClassifier: false },
          },
        },
        chat: chatDetail({ copilot: { status: "UNAVAILABLE", stage: null } }),
      });
      renderChat(store);
      await connect();
      // COPILOT_STATUS only arrives on change: the first render reads the chat.
      expect(screen.getByTestId("copilot-status")).toHaveTextContent("Copilot unavailable");
      await fire("COPILOT_STATUS", { chatId: "chat-1", status: "OK" });
      await waitFor(() => expect(screen.queryByTestId("copilot-status")).not.toBeInTheDocument());

      await fire("SUGGESTIONS", {
        chatId: "chat-1",
        message: staffMessage({
          id: 7,
          type: "SUGGESTION",
          senderRole: "COPILOT",
          visibleToTalker: false,
          content: "Suggested replies",
          metadata: {
            suggestions: [{ index: 0, text: "What feels hardest today?", skillKey: "feelings" }],
          },
        }),
      });
      expect(await screen.findByTestId("suggestion-0")).toHaveTextContent(
        "What feels hardest today?",
      );

      await fire("NUDGE", {
        chatId: "chat-1",
        message: staffMessage({
          id: 8,
          type: "NUDGE",
          senderRole: "COPILOT",
          visibleToTalker: false,
          content: "Try reflecting the feeling before asking more",
        }),
      });
      expect(await screen.findByTestId("copilot-nudge")).toHaveTextContent(
        "Try reflecting the feeling",
      );
      // Neither lands in the transcript.
      expect(screen.getByTestId("staff-transcript")).not.toHaveTextContent("What feels hardest");
    });
  });

  describe("reconnect", () => {
    it("re-joins and then re-syncs every chat on screen, and re-reads it", async () => {
      permissionsRef.current = SUPERVISOR;
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          chat: staffChat({ myAccess: "READ_ONLY", listener: { id: 7, displayName: "Meera" } }),
        }),
      });
      fetchRoutes["GET /v1/helpline/chats/chat-1"] = () =>
        json(
          chatDetail({
            chat: staffChat({ myAccess: "READ_ONLY", listener: { id: 7, displayName: "Meera" } }),
          }),
        );
      renderChat(store);
      await connect();

      const first = lastSocket();
      await act(async () => {
        first.connected = false;
        first.fire("disconnect", "transport close");
        window.dispatchEvent(new Event("online"));
      });
      expect(fakeSockets.length).toBe(2);
      await connect();

      const second = lastSocket();
      const events = second.acked.map(item => `${item.event}:${item.payload?.chatId ?? ""}`);
      const join = events.indexOf("JOIN_CHAT:chat-1");
      const sync = events.indexOf("SYNC_SINCE:chat-1");
      expect(join).toBeGreaterThanOrEqual(0);
      expect(sync).toBeGreaterThan(join);
      await waitFor(() =>
        expect(requests("GET", "/v1/helpline/chats/chat-1").length).toBeGreaterThan(0),
      );
      expect(allEmits().filter(emit => emit.event === "SEND_MESSAGE")).toHaveLength(0);
    });
  });
});
