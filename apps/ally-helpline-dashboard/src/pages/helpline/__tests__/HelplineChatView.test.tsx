import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://api.test");
});

const { trackMock, permissionsRef } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  permissionsRef: {
    current: [
      "view:helpline:lobby",
      "view:helpline:chat",
      "edit:helpline:message",
      "edit:helpline:end",
      "view:helpline:copilot",
      "edit:helpline:summary",
    ] as string[],
  },
}));

vi.mock("socket.io-client", async () => {
  // Not the kit: it imports app code that imports socket.io-client (deadlock).
  const { createFakeIo } = await import("./fakeSocket");
  return { io: createFakeIo() };
});
vi.mock("@hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: trackMock }) }));
vi.mock("@hooks/useUser", () => ({
  useUser: () => ({ permissions: permissionsRef.current, user: { id: 42, roles: ["LISTENER"] } }),
}));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";

import { HelplineChatView } from "../HelplineChatView";
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

const suggestionMessage = staffMessage({
  id: 2,
  type: "SUGGESTION",
  senderRole: "COPILOT",
  visibleToTalker: false,
  content: "",
  metadata: {
    suggestions: [
      { index: 0, text: "It sounds like a lot to carry right now.", skillKey: "empathy" },
      { index: 1, text: "What has been hardest this week?", skillKey: "feelings" },
    ],
  },
});

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

describe("HelplineChatView", () => {
  let store: TestStore;

  beforeEach(() => {
    resetKit();
    trackMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    store = makeStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Use puts a suggestion in the composer to edit — and never sends it", async () => {
    seed(store, {
      me: meDto(),
      chat: chatDetail({ messages: [staffMessage(), suggestionMessage] }),
    });
    renderChat(store);
    await connect();

    const card = screen.getByTestId("suggestion-0");
    expect(within(card).getByText("Show empathy")).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Use" }));

    const composer = screen.getByRole("textbox", { name: "Reply" });
    expect(composer).toHaveValue("It sounds like a lot to carry right now.");
    // The defining property: inserting is not sending.
    expect(allEmits().filter(emit => emit.event === "SEND_MESSAGE")).toHaveLength(0);
    expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_SUGGESTION_INSERTED, {
      chat_id: "chat-1",
      skill_key: "empathy",
      suggestion_index: 0,
    });

    // Only the listener's own Send sends it, edited, with the suggestion it came from.
    fireEvent.change(composer, { target: { value: "That sounds like a lot to carry." } });
    fireEvent.keyDown(composer, { key: "Enter" });
    const sends = allEmits().filter(emit => emit.event === "SEND_MESSAGE");
    expect(sends).toHaveLength(1);
    expect(sends[0].payload).toMatchObject({
      chatId: "chat-1",
      content: "That sounds like a lot to carry.",
      suggestion: { messageId: 2, index: 0 },
    });
    // Pending first, then the server's copy replaces it — either way it stays on screen.
    await waitFor(() =>
      expect(screen.getByText("That sounds like a lot to carry.")).toBeInTheDocument(),
    );
  });

  it("explains, before the talker writes, where suggestions will appear", () => {
    seed(store, { me: meDto(), chat: chatDetail({ messages: [] }) });
    renderChat(store);
    expect(screen.getByText("Suggestions appear after the talker writes.")).toBeInTheDocument();
  });

  it("keeps a risk banner up through live updates until it is acknowledged", async () => {
    seed(store, {
      me: meDto(),
      chat: chatDetail({
        chat: staffChat({ riskLevel: "HIGH" }),
        riskFlags: [riskFlag()],
      }),
    });
    fetchRoutes["POST /v1/helpline/chats/chat-1/risk-flags/flag-1/ack"] = async request => {
      expect(await request.clone().json()).toEqual({ outcome: "CONFIRMED" });
      return json(
        riskFlag({
          acknowledgedAt: "2026-10-05T10:06:00.000Z",
          acknowledgedByName: "Asha",
          outcome: "CONFIRMED",
        }),
      );
    };
    renderChat(store);
    await connect();

    const banner = screen.getByTestId("risk-banner-flag-1");
    expect(banner).toHaveTextContent("High risk");
    expect(banner).toHaveTextContent("Keyword match");
    expect(banner).toHaveTextContent("end it all");
    expect(banner).toHaveTextContent("Your supervisor has been alerted.");
    expect(banner).toHaveTextContent("Emergency resources were sent to the talker.");
    expect(
      within(banner).getByLabelText("Ask directly about thoughts of suicide"),
    ).toBeInTheDocument();
    // The copilot panel can't be collapsed away while a flag is open.
    expect(screen.getByRole("button", { name: "Hide copilot" })).toBeDisabled();

    // Messages keep arriving; the banner does not move.
    await act(async () => {
      lastSocket().fire("MESSAGE_RECEIVED", {
        chatId: "chat-1",
        message: staffMessage({ id: 5, content: "are you still there" }),
      });
    });
    expect(screen.getByTestId("risk-banner-flag-1")).toBeInTheDocument();

    fireEvent.click(within(banner).getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(screen.queryByTestId("risk-banner-flag-1")).not.toBeInTheDocument());
    expect(screen.getByTestId("risk-noted-flag-1")).toHaveTextContent("Risk noted");
    expect(trackMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.HELPLINE_RISK_ACKNOWLEDGED, {
      chat_id: "chat-1",
      risk_level: "HIGH",
      risk_source: "KEYWORD",
      risk_outcome: "CONFIRMED",
    });
  });

  it("shows a flag raised mid-chat over the socket", async () => {
    seed(store, { me: meDto(), chat: chatDetail() });
    renderChat(store);
    await connect();
    expect(screen.queryByTestId("risk-banner-flag-9")).not.toBeInTheDocument();

    await act(async () => {
      lastSocket().fire("RISK_FLAGGED", {
        chatId: "chat-1",
        flag: riskFlag({ id: "flag-9", level: "ELEVATED", source: "CLASSIFIER", subject: "OTHER" }),
      });
    });
    const banner = await screen.findByTestId("risk-banner-flag-9");
    expect(banner).toHaveTextContent("Possible risk");
    expect(banner).toHaveTextContent("About someone else");
    expect(banner).not.toHaveTextContent("Your supervisor has been alerted.");
  });

  it("ending opens the summary review, fills it from the FINAL draft, and saves the edits", async () => {
    seed(store, { me: meDto(), chat: chatDetail() });
    fetchRoutes["POST /v1/helpline/chats/chat-1/end"] = () =>
      json(
        chatDetail({
          chat: staffChat({
            status: "ENDED",
            endedReason: "LISTENER_ENDED",
            endedAt: "2026-10-05T10:30:00Z",
          }),
        }),
      );
    fetchRoutes["PUT /v1/helpline/chats/chat-1/summary"] = async request =>
      json({
        kind: "FINAL",
        fields: (await request.clone().json()).fields,
        throughMessageId: 1,
        editedByName: "Asha",
        version: 2,
        updatedAt: "2026-10-05T10:31:00Z",
      });
    renderChat(store);
    await connect();

    fireEvent.click(screen.getByRole("button", { name: "End chat" }));
    const confirm = screen.getByRole("dialog", { name: "End this chat?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "End chat" }));

    expect(await screen.findByTestId("summary-drafting")).toHaveTextContent("Drafting summary…");
    expect(trackMock).toHaveBeenCalledWith(
      ANALYTICS_EVENTS.HELPLINE_CHAT_ENDED_BY_LISTENER,
      expect.objectContaining({ chat_id: "chat-1" }),
    );

    await act(async () => {
      lastSocket().fire("SUMMARY_UPDATED", {
        chatId: "chat-1",
        summary: {
          kind: "FINAL",
          fields: { presenting_concern: "Trouble sleeping after exams", next_step: "" },
          throughMessageId: 1,
          editedByName: null,
          version: 1,
          updatedAt: "2026-10-05T10:30:05Z",
        },
      });
    });
    const concern = screen.getByLabelText("What they came to talk about");
    expect(concern).toHaveValue("Trouble sleeping after exams");
    fireEvent.change(screen.getByLabelText("Agreed next step"), {
      target: { value: "Talk to a friend tonight" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save and close" }));

    await waitFor(() =>
      expect(requests("PUT", "/v1/helpline/chats/chat-1/summary")).toHaveLength(1),
    );
    const [[saveRequest]] = requests("PUT", "/v1/helpline/chats/chat-1/summary");
    expect(await (saveRequest as Request).clone().json()).toEqual({
      fields: {
        presenting_concern: "Trouble sleeping after exams",
        next_step: "Talk to a friend tonight",
      },
    });
    // Not a high-risk chat: straight back to the lobby.
    expect(await screen.findByTestId("lobby-route")).toBeInTheDocument();
  });

  it("after a HIGH-risk chat, shows the take-a-minute screen with the support contact first", async () => {
    seed(store, {
      me: meDto(),
      chat: chatDetail({
        chat: staffChat({ riskLevel: "HIGH" }),
        riskFlags: [riskFlag({ acknowledgedAt: "2026-10-05T10:06:00Z", outcome: "CONFIRMED" })],
      }),
    });
    fetchRoutes["POST /v1/helpline/chats/chat-1/end"] = () =>
      json(chatDetail({ chat: staffChat({ status: "ENDED", riskLevel: "HIGH" }) }));
    renderChat(store);
    await connect();

    fireEvent.click(screen.getByRole("button", { name: "End chat" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "End this chat?" })).getByRole("button", {
        name: "End chat",
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));

    const interstitial = await screen.findByTestId("wellbeing-interstitial");
    expect(within(interstitial).getByRole("heading", { name: "Take a minute" })).toHaveFocus();
    expect(interstitial).toHaveTextContent("Wellbeing line: 1800-000-000");
    expect(screen.queryByTestId("lobby-route")).not.toBeInTheDocument();
    fireEvent.click(within(interstitial).getByRole("button", { name: "Back to lobby" }));
    expect(await screen.findByTestId("lobby-route")).toBeInTheDocument();
  });

  it("opens the summary review when the talker ends the chat while it is on screen", async () => {
    seed(store, { me: meDto(), chat: chatDetail() });
    renderChat(store);
    await connect();

    await act(async () => {
      lastSocket().fire("CHAT_ENDED", { chatId: "chat-1", endedReason: "TALKER_ENDED" });
    });
    expect(await screen.findByTestId("summary-review")).toBeInTheDocument();
    expect(screen.getByTestId("composer-disabled")).toHaveTextContent("This chat has ended.");
  });

  it("is read-only for anyone but the listener of record, and says why", () => {
    seed(store, {
      me: meDto(),
      chat: chatDetail({
        chat: staffChat({ myAccess: "READ_ONLY", listener: { id: 7, displayName: "Meera" } }),
      }),
    });
    renderChat(store);
    expect(screen.getByTestId("composer-disabled")).toHaveTextContent(
      "Only the listener of record can reply",
    );
    expect(screen.queryByRole("button", { name: "End chat" })).not.toBeInTheDocument();
  });

  it("marks staff-only system lines apart from ones the talker also sees", () => {
    seed(store, {
      me: meDto(),
      chat: chatDetail({
        messages: [
          staffMessage({
            id: 1,
            type: "SYSTEM",
            senderRole: "SYSTEM",
            systemKind: "ACCEPTED",
            metadata: { listenerName: "Asha" },
          }),
          staffMessage({
            id: 2,
            type: "SYSTEM",
            senderRole: "SYSTEM",
            systemKind: "TALKER_DISCONNECTED",
            visibleToTalker: false,
          }),
        ],
      }),
    });
    renderChat(store);
    expect(screen.getByTestId("system-talker-visible")).toHaveTextContent("Asha joined the chat");
    expect(screen.getByTestId("system-staff-only")).toHaveTextContent("Talker disconnected");
    expect(screen.getByTestId("staff-transcript")).toHaveClass("ph-no-capture");
  });

  it("never sends the talker's text anywhere but the socket it came from", () => {
    seed(store, { me: meDto(), chat: chatDetail() });
    renderChat(store);
    // Rendering a chat makes no HTTP request at all once it is cached.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
