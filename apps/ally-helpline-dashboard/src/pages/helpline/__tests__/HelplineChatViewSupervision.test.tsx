import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const LISTENER_PERMISSIONS = [
  "view:helpline:lobby",
  "view:helpline:chat",
  "edit:helpline:message",
  "edit:helpline:end",
  "view:helpline:copilot",
  "edit:helpline:summary",
];
const SUPERVISOR_PERMISSIONS = [
  ...LISTENER_PERMISSIONS,
  "view:helpline:monitor",
  "edit:helpline:whisper",
  "edit:helpline:transfer",
  "view:helpline:qa",
];

const { trackMock, permissionsRef, toastMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  permissionsRef: { current: [] as string[] },
  toastMock: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock("socket.io-client", async () => {
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: ["LISTENER"] } }),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";

import { HelplineChatView } from "../HelplineChatView";
import { resetSupervisorAlertCooldowns } from "../useSupervisorAlert";
import {
  allEmits,
  chatDetail,
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

const openInfo = () => fireEvent.click(screen.getByRole("button", { name: "Show talker details" }));

const bodyOf = async (method: string, path: string) => {
  const [[request]] = requests(method, path);
  return (request as Request).clone().json();
};

/** A supervisor (user 42) watching Meera's (user 7) chat. */
const monitoredChat = (overrides = {}) =>
  chatDetail({
    chat: staffChat({
      myAccess: "READ_ONLY",
      listener: { id: 7, displayName: "Meera" },
      ...overrides,
    }),
  });

describe("HelplineChatView — supervision", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    resetSupervisorAlertCooldowns();
    trackMock.mockReset();
    toastMock.mockReset();
    toastMock.success.mockReset();
    toastMock.warning.mockReset();
    toastMock.error.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
    permissionsRef.current = SUPERVISOR_PERMISSIONS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("whispers", () => {
    it("a monitoring supervisor joins the room and gets the whisper composer, not the reply box", async () => {
      seed(store, { me: meDto(), chat: monitoredChat() });
      fetchRoutes["POST /v1/helpline/chats/chat-1/whisper"] = async request =>
        json(
          staffMessage({
            id: 50,
            type: "WHISPER",
            senderRole: "SUPERVISOR",
            senderUserId: 42,
            senderName: "Asha",
            visibleToTalker: false,
            content: (await request.clone().json()).content,
          }),
        );
      renderChat(store);
      await connect();

      expect(allEmits()).toContainEqual({ event: "JOIN_CHAT", payload: { chatId: "chat-1" } });
      expect(screen.queryByRole("textbox", { name: "Reply" })).not.toBeInTheDocument();
      const composer = screen.getByTestId("whisper-composer");
      expect(composer).toHaveTextContent("only staff see this, never the talker");

      fireEvent.change(within(composer).getByRole("textbox", { name: "Whisper to Meera" }), {
        target: { value: "Ask about sleep tonight" },
      });
      fireEvent.click(within(composer).getByRole("button", { name: "Send whisper" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/whisper")).toHaveLength(1),
      );
      expect(await bodyOf("POST", "/v1/helpline/chats/chat-1/whisper")).toEqual({
        content: "Ask about sleep tonight",
      });
      // Shown inline as the sender's own whisper, and in the copilot panel's Whispers.
      expect(await screen.findByTestId("transcript-whisper")).toHaveTextContent(
        "Your whisper to Meera — the talker can't see this",
      );
      expect(screen.getByTestId("whispers")).toHaveTextContent("Ask about sleep tonight");
      // Never over the talker's socket, and the event carries no content.
      expect(allEmits().filter(emit => emit.event === "SEND_MESSAGE")).toHaveLength(0);
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_WHISPER_SENT, {
        chat_id: "chat-1",
      });
    });

    it("the listener of record sees a whisper inline as only theirs, and keeps their reply box", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, { me: meDto(), chat: chatDetail() });
      renderChat(store);
      await connect();

      await act(async () => {
        lastSocket().fire("WHISPER", {
          chatId: "chat-1",
          message: staffMessage({
            id: 60,
            type: "WHISPER",
            senderRole: "SUPERVISOR",
            senderUserId: 9,
            senderName: "Priya",
            visibleToTalker: false,
            content: "You're doing well — try reflecting the feeling",
          }),
        });
      });
      const inline = await screen.findByTestId("transcript-whisper");
      expect(inline).toHaveTextContent("Supervisor whisper — only you can see this");
      expect(inline).toHaveTextContent("Priya");
      expect(screen.getByRole("textbox", { name: "Reply" })).toBeInTheDocument();
      expect(screen.queryByTestId("whisper-composer")).not.toBeInTheDocument();
    });

    it("no whisper composer without the whisper permission, nor for the listener of record", async () => {
      permissionsRef.current = [...LISTENER_PERMISSIONS, "view:helpline:monitor"];
      seed(store, { me: meDto(), chat: monitoredChat() });
      const { unmount } = renderChat(store);
      expect(screen.queryByTestId("whisper-composer")).not.toBeInTheDocument();
      expect(screen.getByTestId("composer-disabled")).toBeInTheDocument();
      unmount();

      permissionsRef.current = SUPERVISOR_PERMISSIONS;
      seed(store, { chat: chatDetail() });
      renderChat(store);
      expect(screen.queryByTestId("whisper-composer")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Reply" })).toBeInTheDocument();
    });
  });

  describe("transfer, take over, block", () => {
    it("the listener of record requests a transfer, then sees it pending", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, { me: meDto(), chat: chatDetail() });
      fetchRoutes["POST /v1/helpline/chats/chat-1/transfer"] = () =>
        json(chatDetail({ chat: staffChat({ transferPending: true }) }));
      renderChat(store);
      await connect();
      openInfo();

      fireEvent.click(screen.getByRole("button", { name: "Request transfer" }));
      const dialog = screen.getByRole("dialog", { name: "Pass this chat to another listener?" });
      // A listener can't see who is available: no picker, "anyone" it is.
      expect(within(dialog).queryByRole("combobox")).not.toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole("button", { name: "Request transfer" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/transfer")).toHaveLength(1),
      );
      expect(await bodyOf("POST", "/v1/helpline/chats/chat-1/transfer")).toEqual({});
      expect(await screen.findByTestId("transfer-pending-banner")).toHaveTextContent(
        "Transfer requested — waiting for another listener",
      );
      expect(screen.queryByRole("button", { name: "Request transfer" })).not.toBeInTheDocument();
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_TRANSFER_REQUESTED, {
        chat_id: "chat-1",
        actor: "listener",
        has_target: false,
      });
    });

    it("a supervisor can aim a transfer at one available listener with room", async () => {
      seed(store, { me: meDto(), chat: monitoredChat() });
      fetchRoutes["GET /v1/helpline/monitor"] = () =>
        json({
          tiles: { waiting: 0, active: 1, listenersAvailable: 2, openHighFlags: 0 },
          activeChats: [],
          waiting: [],
          listeners: [
            {
              userId: 7,
              displayName: "Meera",
              presence: "AVAILABLE",
              activeChatCount: 1,
              maxConcurrentChats: 2,
              languages: ["en"],
            },
            {
              userId: 8,
              displayName: "Zoya",
              presence: "AVAILABLE",
              activeChatCount: 0,
              maxConcurrentChats: 2,
              languages: ["en"],
            },
            {
              userId: 9,
              displayName: "Bilal",
              presence: "AWAY",
              activeChatCount: 0,
              maxConcurrentChats: 2,
              languages: ["en"],
            },
            {
              userId: 10,
              displayName: "Arun",
              presence: "AVAILABLE",
              activeChatCount: 2,
              maxConcurrentChats: 2,
              languages: ["en"],
            },
          ],
        });
      fetchRoutes["POST /v1/helpline/chats/chat-1/transfer"] = () =>
        json(monitoredChat({ transferPending: true }));
      renderChat(store);
      await connect();
      openInfo();

      fireEvent.click(screen.getByRole("button", { name: "Request transfer" }));
      const dialog = screen.getByRole("dialog", { name: "Pass this chat to another listener?" });
      const picker = await within(dialog).findByRole("combobox", { name: "Pass to (optional)" });
      // Not the current listener, not Away, not at capacity.
      const options = within(picker)
        .getAllByRole("option")
        .map(option => option.textContent);
      expect(options).toEqual(["Anyone available", "Zoya · 0 of 2 chats"]);
      fireEvent.change(picker, { target: { value: "8" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Request transfer" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/transfer")).toHaveLength(1),
      );
      expect(await bodyOf("POST", "/v1/helpline/chats/chat-1/transfer")).toEqual({
        targetListenerId: 8,
      });
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_TRANSFER_REQUESTED, {
        chat_id: "chat-1",
        actor: "supervisor",
        has_target: true,
      });
    });

    it("take over asks first, then makes the supervisor the listener", async () => {
      seed(store, { me: meDto(), chat: monitoredChat() });
      fetchRoutes["POST /v1/helpline/chats/chat-1/take-over"] = () =>
        json(chatDetail({ chat: staffChat({ listener: { id: 42, displayName: "Asha" } }) }));
      renderChat(store);
      await connect();
      openInfo();

      fireEvent.click(screen.getByRole("button", { name: "Take over" }));
      const dialog = screen.getByRole("dialog", { name: "Take over this chat?" });
      expect(dialog).toHaveTextContent("Meera can no longer reply");
      expect(requests("POST", "/v1/helpline/chats/chat-1/take-over")).toHaveLength(0);
      fireEvent.click(within(dialog).getByRole("button", { name: "Take over" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/take-over")).toHaveLength(1),
      );
      expect(await screen.findByRole("textbox", { name: "Reply" })).toBeInTheDocument();
      expect(toastMock).toHaveBeenCalledWith("You're now this chat's listener.");
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_CHAT_TAKEN_OVER, {
        chat_id: "chat-1",
        risk_level: "NONE",
      });
    });

    it("block explains the 24 h refusal, takes an optional reason, and posts it", async () => {
      seed(store, { me: meDto(), chat: monitoredChat() });
      fetchRoutes["POST /v1/helpline/talkers/t-1/block"] = () =>
        new Response(null, { status: 204 });
      fetchRoutes["GET /v1/helpline/chats/chat-1"] = () =>
        json(
          monitoredChat({
            status: "ENDED",
            endedReason: "TALKER_BLOCKED",
            talker: { ...staffChat().talker, blocked: true },
          }),
        );
      renderChat(store);
      await connect();
      openInfo();

      fireEvent.click(screen.getByRole("button", { name: "Block talker" }));
      const dialog = screen.getByRole("dialog", { name: "Block this talker?" });
      expect(dialog).toHaveTextContent("ends the chat now");
      expect(dialog).toHaveTextContent("24 hours");
      fireEvent.change(within(dialog).getByRole("textbox", { name: "Reason (optional)" }), {
        target: { value: "Repeated abuse" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Block and end chat" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/talkers/t-1/block")).toHaveLength(1),
      );
      expect(await bodyOf("POST", "/v1/helpline/talkers/t-1/block")).toEqual({
        reason: "Repeated abuse",
      });
      expect(toastMock.success).toHaveBeenCalledWith("Talker blocked. The chat has ended.");
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_TALKER_BLOCKED, {
        chat_id: "chat-1",
        has_reason: true,
      });
    });

    it("a listener has none of the supervisor actions", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, { me: meDto(), chat: chatDetail() });
      renderChat(store);
      openInfo();
      expect(screen.queryByRole("button", { name: "Take over" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Block talker" })).not.toBeInTheDocument();
    });

    it("the previous listener sees the chat read-only with a banner once it moves on", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          messages: [
            staffMessage(),
            staffMessage({ id: 2, senderRole: "LISTENER", senderUserId: 42, content: "I'm here" }),
          ],
        }),
      });
      renderChat(store);
      await connect();

      await act(async () => {
        lastSocket().fire("CHAT_UPDATED", {
          chat: staffChat({ myAccess: "READ_ONLY", listener: { id: 8, displayName: "Zoya" } }),
        });
      });
      expect(await screen.findByTestId("previous-listener-banner")).toHaveTextContent(
        "This chat is now with Zoya. You can still read it, but only they can reply.",
      );
      expect(screen.getByTestId("composer-disabled")).toHaveTextContent(
        "This chat is now with Zoya. Only they can reply.",
      );
      expect(toastMock).toHaveBeenCalledWith("This chat is now with Zoya.");
    });
  });

  describe("Alert a supervisor", () => {
    it("sends an optional note, confirms, then pauses for two minutes", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, { me: meDto(), chat: chatDetail() });
      fetchRoutes["POST /v1/helpline/chats/chat-1/alert-supervisor"] = () =>
        json({ alertedCount: 2 });
      renderChat(store);
      await connect();
      openInfo();

      fireEvent.click(screen.getByRole("button", { name: "Alert a supervisor" }));
      fireEvent.change(screen.getByRole("textbox", { name: "What do you need? (optional)" }), {
        target: { value: "Please join, they mentioned a plan" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send alert" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/alert-supervisor")).toHaveLength(1),
      );
      expect(await bodyOf("POST", "/v1/helpline/chats/chat-1/alert-supervisor")).toEqual({
        note: "Please join, they mentioned a plan",
      });
      await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Supervisor alerted"));
      expect(screen.getByRole("button", { name: "Alerted just now" })).toBeDisabled();
      expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_SUPERVISOR_ALERTED, {
        chat_id: "chat-1",
        has_note: true,
        alerted_count: 2,
      });
    });

    it("says plainly when no supervisor is set up, with the support contact", async () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({ chat: staffChat({ riskLevel: "HIGH" }), riskFlags: [riskFlag()] }),
      });
      fetchRoutes["POST /v1/helpline/chats/chat-1/alert-supervisor"] = () =>
        json({ alertedCount: 0 });
      renderChat(store);
      await connect();

      // Inside the risk banner, next to the checklist's "tell a supervisor" step.
      const banner = screen.getByTestId("risk-banner-flag-1");
      fireEvent.click(within(banner).getByRole("button", { name: "Alert a supervisor" }));
      fireEvent.click(within(banner).getByRole("button", { name: "Send alert" }));

      await waitFor(() => expect(toastMock.warning).toHaveBeenCalled());
      const [message, options] = toastMock.warning.mock.calls[0];
      expect(message).toContain("No supervisor is set up for your organisation");
      expect(message).toContain("Wellbeing line: 1800-000-000");
      expect(options).toEqual({ duration: Number.POSITIVE_INFINITY });
      expect(within(banner).getByRole("alert")).toHaveTextContent(
        "follow your organisation's emergency procedure",
      );
    });

    it("isn't offered to someone who isn't the listener of record", () => {
      seed(store, { me: meDto(), chat: monitoredChat() });
      renderChat(store);
      openInfo();
      expect(screen.queryByRole("button", { name: "Alert a supervisor" })).not.toBeInTheDocument();
    });
  });

  describe("risk banner and copilot status", () => {
    it("only claims a supervisor was alerted when one was", () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          chat: staffChat({ riskLevel: "HIGH" }),
          riskFlags: [
            riskFlag({ id: "flag-a", supervisorsAlerted: 0 }),
            riskFlag({ id: "flag-b", supervisorsAlerted: null }),
          ],
        }),
      });
      renderChat(store);
      const none = screen.getByTestId("risk-banner-flag-a");
      expect(none).not.toHaveTextContent("Your supervisor has been alerted.");
      expect(within(none).getByTestId("risk-no-supervisor")).toHaveTextContent(
        "No supervisor could be alerted automatically",
      );
      expect(within(none).getByTestId("risk-no-supervisor")).toHaveTextContent(
        "Wellbeing line: 1800-000-000",
      );
      const unknown = screen.getByTestId("risk-banner-flag-b");
      expect(unknown).not.toHaveTextContent("Your supervisor has been alerted.");
      expect(within(unknown).queryByTestId("risk-no-supervisor")).not.toBeInTheDocument();
    });

    it("names every checklist checkbox by its step", () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({ chat: staffChat({ riskLevel: "HIGH" }), riskFlags: [riskFlag()] }),
      });
      renderChat(store);
      const banner = screen.getByTestId("risk-banner-flag-1");
      const boxes = within(banner).getAllByRole("checkbox");
      expect(boxes.map(box => box.getAttribute("aria-labelledby"))).not.toContain(null);
      expect(
        within(banner).getByRole("checkbox", { name: "Ask directly about thoughts of suicide" }),
      ).toBeInTheDocument();
      expect(
        within(banner).getByRole("checkbox", { name: "Tell a supervisor now" }),
      ).toBeInTheDocument();
    });

    it("never says the org turned the copilot off when every feature is on", () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({ copilot: { status: "OFF", stage: null } }),
      });
      renderChat(store);
      expect(screen.getByTestId("copilot-status")).toHaveTextContent(
        "Copilot is unavailable right now",
      );
      expect(screen.queryByText("Copilot is off for your organisation.")).not.toBeInTheDocument();
    });

    it("keeps 'off for your organisation' when the org really switched features off", () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      const me = meDto();
      seed(store, {
        me: {
          ...me,
          settings: {
            ...me.settings,
            copilot: { suggestions: false, nudges: false, riskClassifier: false },
          },
        },
        chat: chatDetail({ copilot: { status: "OFF", stage: null } }),
      });
      renderChat(store);
      expect(screen.getByTestId("copilot-status")).toHaveTextContent(
        "Copilot is off for your organisation.",
      );
    });

    it("renders a SUPERVISOR_REQUESTED line as staff-only", () => {
      permissionsRef.current = LISTENER_PERMISSIONS;
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          messages: [
            staffMessage({
              id: 3,
              type: "SYSTEM",
              senderRole: "SYSTEM",
              systemKind: "SUPERVISOR_REQUESTED",
              visibleToTalker: false,
              metadata: { listenerName: "Asha" },
            }),
          ],
        }),
      });
      renderChat(store);
      expect(screen.getByTestId("system-staff-only")).toHaveTextContent(
        "Asha asked a supervisor for help",
      );
    });
  });
});
