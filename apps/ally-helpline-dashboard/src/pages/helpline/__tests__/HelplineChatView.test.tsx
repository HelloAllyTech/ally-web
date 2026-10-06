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
    fireEvent.click(within(card).getByRole("button", { name: "Use this suggestion" }));

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
        riskFlags: [riskFlag({ supervisorsAlerted: 1 })],
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
    // Awaited: the cache is patched inside act, but the modal swaps its skeleton for the fields on
    // a render that does not always land before this line (the test failed about half the time).
    const concern = await screen.findByLabelText("What they came to talk about");
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

  describe("Use", () => {
    const USE_HINT = "Puts this text in your reply box to edit. Nothing is sent.";
    const seedSuggestions = () =>
      seed(store, {
        me: meDto(),
        chat: chatDetail({ messages: [staffMessage(), suggestionMessage] }),
      });

    it("is named for what it does, and its explanation is a description, not its name", async () => {
      seedSuggestions();
      renderChat(store);
      await connect();

      const card = screen.getByTestId("suggestion-0");
      const use = within(card).getByRole("button", { name: "Use this suggestion" });
      // The visible text is unchanged; only the accessible name is fuller.
      expect(use).toHaveTextContent(/^Use$/);
      expect(use).toHaveAccessibleName("Use this suggestion");
      // Carbon hides its tooltip body from the accessibility tree (aria-hidden) but a button's
      // aria-describedby may still point at it, which is how a screen reader reads it second.
      const describedBy = use.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy as string)).toHaveTextContent(USE_HINT);
      // The explanation must never become the name (what it was, via the tooltip).
      expect(within(card).queryByRole("button", { name: USE_HINT })).not.toBeInTheDocument();
      expect(use).not.toHaveAttribute("aria-labelledby");
      expect(use).not.toHaveAttribute("title");
    });

    it("moves the cursor into the empty reply box, after the inserted text, and brings it into view", async () => {
      seedSuggestions();
      renderChat(store);
      await connect();
      const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
      scrollIntoView.mockClear();

      const use = within(screen.getByTestId("suggestion-0")).getByRole("button", {
        name: "Use this suggestion",
      });
      use.focus();
      expect(use).toHaveFocus();
      fireEvent.click(use);

      const composer = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;
      const inserted = "It sounds like a lot to carry right now.";
      expect(composer).toHaveValue(inserted);
      expect(composer).toHaveFocus();
      expect(composer.selectionStart).toBe(inserted.length);
      expect(composer.selectionEnd).toBe(inserted.length);
      expect(scrollIntoView.mock.contexts).toContain(composer);
    });

    it("puts the cursor after the whole of what is there when text was already typed", async () => {
      seedSuggestions();
      renderChat(store);
      await connect();

      const composer = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;
      fireEvent.change(composer, { target: { value: "Thank you for telling me." } });
      // Cursor somewhere else entirely: the start.
      composer.focus();
      composer.setSelectionRange(0, 0);

      fireEvent.click(
        within(screen.getByTestId("suggestion-1")).getByRole("button", {
          name: "Use this suggestion",
        }),
      );

      const expected = "Thank you for telling me. What has been hardest this week?";
      expect(composer).toHaveValue(expected);
      expect(composer).toHaveFocus();
      expect(composer.selectionStart).toBe(expected.length);
      expect(composer.selectionEnd).toBe(expected.length);
    });

    it("does it again on a second Use, even when focus has moved away", async () => {
      seedSuggestions();
      renderChat(store);
      await connect();
      const composer = screen.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement;

      fireEvent.click(
        within(screen.getByTestId("suggestion-0")).getByRole("button", {
          name: "Use this suggestion",
        }),
      );
      expect(composer).toHaveFocus();

      screen.getByRole("button", { name: "Show talker details" }).focus();
      expect(composer).not.toHaveFocus();

      fireEvent.click(
        within(screen.getByTestId("suggestion-1")).getByRole("button", {
          name: "Use this suggestion",
        }),
      );
      expect(composer).toHaveFocus();
      expect(composer.selectionStart).toBe(composer.value.length);
      expect(composer.value.endsWith("What has been hardest this week?")).toBe(true);
    });
  });

  describe("ending a chat with an open risk flag", () => {
    const HIGH_WARNING =
      "This chat has an open high-risk flag. The talker may still be at risk — the checklist says not to end the chat while they are at risk.";
    const ELEVATED_WARNING = "This chat has an open risk flag that hasn't been reviewed.";

    const openEndDialog = () => {
      fireEvent.click(screen.getByRole("button", { name: "End chat" }));
      return screen.getByRole("dialog", { name: "End this chat?" });
    };
    const withFlags = (...flags: ReturnType<typeof riskFlag>[]) =>
      seed(store, {
        me: meDto(),
        chat: chatDetail({
          chat: staffChat({
            riskLevel: flags.some(flag => flag.level === "HIGH") ? "HIGH" : "ELEVATED",
          }),
          riskFlags: flags,
        }),
      });

    it("with no flag it is the plain confirmation: nothing to warn about, End chat", async () => {
      seed(store, { me: meDto(), chat: chatDetail() });
      renderChat(store);
      await connect();

      const dialog = openEndDialog();
      expect(within(dialog).queryByTestId("end-open-risk")).not.toBeInTheDocument();
      expect(dialog).not.toHaveTextContent("open");
      expect(within(dialog).getByRole("button", { name: "End chat" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "End anyway" })).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole("button", { name: "Alert a supervisor" }),
      ).not.toBeInTheDocument();
    });

    it("an open HIGH flag: says the talker may still be at risk, offers Alert a supervisor, End anyway and Cancel", async () => {
      withFlags(riskFlag({ level: "HIGH" }));
      renderChat(store);
      await connect();

      const dialog = openEndDialog();
      // The title is unchanged; the warning is part of what the dialog describes.
      expect(within(dialog).getByRole("heading", { name: "End this chat?" })).toBeInTheDocument();
      const warning = within(dialog).getByTestId("end-open-risk");
      expect(warning).toHaveTextContent(HIGH_WARNING);
      expect(warning).not.toHaveTextContent(ELEVATED_WARNING);
      expect(dialog).toHaveAccessibleDescription(new RegExp("open high-risk flag"));

      expect(within(dialog).getByRole("button", { name: "Alert a supervisor" })).toBeEnabled();
      expect(within(dialog).getByRole("button", { name: "End anyway" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
      // The confirm button is renamed, not duplicated.
      expect(within(dialog).queryByRole("button", { name: "End chat" })).not.toBeInTheDocument();
      // Focus still starts on the safe choice.
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("an open ELEVATED flag: the softer line, with the same three choices", async () => {
      withFlags(riskFlag({ level: "ELEVATED", source: "CLASSIFIER" }));
      renderChat(store);
      await connect();

      const dialog = openEndDialog();
      const warning = within(dialog).getByTestId("end-open-risk");
      expect(warning).toHaveTextContent(ELEVATED_WARNING);
      expect(warning).not.toHaveTextContent("high-risk");
      expect(
        within(dialog).getByRole("button", { name: "Alert a supervisor" }),
      ).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "End anyway" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });

    it("one HIGH among several open flags is a HIGH warning", async () => {
      withFlags(
        riskFlag({ id: "flag-a", level: "ELEVATED" }),
        riskFlag({ id: "flag-b", level: "HIGH" }),
      );
      renderChat(store);
      await connect();

      expect(within(openEndDialog()).getByTestId("end-open-risk")).toHaveTextContent(HIGH_WARNING);
    });

    it("a flag that has been acknowledged is not open: no warning, End chat as before", async () => {
      withFlags(
        riskFlag({ acknowledgedAt: "2026-10-05T10:06:00.000Z", outcome: "CONFIRMED" }),
        riskFlag({
          id: "flag-2",
          level: "ELEVATED",
          acknowledgedAt: "2026-10-05T10:07:00.000Z",
          outcome: "FALSE_POSITIVE",
        }),
      );
      renderChat(store);
      await connect();

      const dialog = openEndDialog();
      expect(within(dialog).queryByTestId("end-open-risk")).not.toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "End chat" })).toBeInTheDocument();
      expect(within(dialog).queryByRole("button", { name: "End anyway" })).not.toBeInTheDocument();
    });

    it("the warning goes away if the flag is acknowledged while the dialog is open", async () => {
      withFlags(riskFlag());
      renderChat(store);
      await connect();
      const dialog = openEndDialog();
      expect(within(dialog).getByTestId("end-open-risk")).toBeInTheDocument();

      await act(async () => {
        lastSocket().fire("RISK_FLAGGED", {
          chatId: "chat-1",
          flag: riskFlag({ acknowledgedAt: "2026-10-05T10:08:00.000Z", outcome: "CONFIRMED" }),
        });
      });

      await waitFor(() =>
        expect(within(dialog).queryByTestId("end-open-risk")).not.toBeInTheDocument(),
      );
      expect(within(dialog).getByRole("button", { name: "End chat" })).toBeInTheDocument();
    });

    it("Alert a supervisor opens the same note panel and sends — without ending the chat or closing the dialog", async () => {
      withFlags(riskFlag());
      fetchRoutes["POST /v1/helpline/chats/chat-1/alert-supervisor"] = () =>
        json({ alertedCount: 1 });
      renderChat(store);
      await connect();
      const dialog = openEndDialog();

      fireEvent.click(within(dialog).getByRole("button", { name: "Alert a supervisor" }));
      fireEvent.change(
        within(dialog).getByRole("textbox", { name: "What do you need? (optional)" }),
        {
          target: { value: "They said they have a plan" },
        },
      );
      fireEvent.click(within(dialog).getByRole("button", { name: "Send alert" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/alert-supervisor")).toHaveLength(1),
      );
      const [[alertRequest]] = requests("POST", "/v1/helpline/chats/chat-1/alert-supervisor");
      expect(await (alertRequest as Request).clone().json()).toEqual({
        note: "They said they have a plan",
      });
      // Still here, still deciding; nothing was ended.
      expect(screen.getByRole("dialog", { name: "End this chat?" })).toBeInTheDocument();
      expect(requests("POST", "/v1/helpline/chats/chat-1/end")).toHaveLength(0);
      expect(
        await within(dialog).findByRole("button", { name: "Alerted just now" }),
      ).toBeDisabled();
      // The button disabled itself, so focus is placed back on the safe choice, not left behind.
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    });

    it("End anyway ends the chat", async () => {
      withFlags(riskFlag());
      fetchRoutes["POST /v1/helpline/chats/chat-1/end"] = () =>
        json(chatDetail({ chat: staffChat({ status: "ENDED", riskLevel: "HIGH" }) }));
      renderChat(store);
      await connect();

      fireEvent.click(within(openEndDialog()).getByRole("button", { name: "End anyway" }));

      await waitFor(() =>
        expect(requests("POST", "/v1/helpline/chats/chat-1/end")).toHaveLength(1),
      );
      expect(trackMock).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.HELPLINE_CHAT_ENDED_BY_LISTENER,
        expect.objectContaining({ chat_id: "chat-1", risk_level: "HIGH" }),
      );
    });

    it("Cancel leaves the chat running", async () => {
      withFlags(riskFlag());
      renderChat(store);
      await connect();

      fireEvent.click(within(openEndDialog()).getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog", { name: "End this chat?" })).not.toBeInTheDocument();
      expect(requests("POST", "/v1/helpline/chats/chat-1/end")).toHaveLength(0);
    });
  });
});
