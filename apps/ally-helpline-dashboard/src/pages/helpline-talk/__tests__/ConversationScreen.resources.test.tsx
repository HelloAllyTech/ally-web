import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GuestChatDto, GuestMessageDto } from "@types";

import { ConversationScreen } from "../components/ConversationScreen";
import { EndedScreen } from "../components/EndedScreen";

import type { TalkerMessage } from "../talkerReducer";

const STATIC_TITLE = "If you need help right now";
const IN_STREAM_TITLE = "Support you can reach right now";
const ORG_RESOURCES = "Call 112, or Tele-MANAS on 14416.";

const chat: GuestChatDto = {
  id: "chat-1",
  status: "WAITING",
  endedReason: null,
  language: "en",
  displayName: "Anonymous",
  listenerName: null,
  queuePosition: 2,
  waitStartedAt: "2026-10-06T10:00:00.000Z",
  claimedAt: null,
  endedAt: null,
  feedbackSubmitted: false,
  org: { name: "Acme Care", logoUrl: null },
};

const message = (overrides: Partial<GuestMessageDto>): TalkerMessage => ({
  id: 1,
  clientMessageId: null,
  from: "ME",
  type: "TEXT",
  systemKind: null,
  content: "Hello",
  createdAt: "2026-10-06T10:01:00.000Z",
  ...overrides,
});

const resourcesLine = message({
  id: 2,
  from: "SERVICE",
  type: "SYSTEM",
  systemKind: "RESOURCES",
  content: ORG_RESOURCES,
});

const renderScreen = (mode: "waiting" | "chat", messages: TalkerMessage[]) =>
  render(
    <ConversationScreen
      mode={mode}
      chat={mode === "chat" ? { ...chat, status: "ACTIVE", listenerName: "Asha" } : chat}
      messages={messages}
      listenerTyping={false}
      resourcesText={ORG_RESOURCES}
      estimatedWaitMinutes={null}
      isReconnecting={false}
      draft=""
      onDraftChange={vi.fn()}
      onSend={vi.fn(() => true)}
      onTyping={vi.fn()}
      onRetry={vi.fn()}
      onLeave={vi.fn()}
    />,
  );

describe("ConversationScreen — the emergency-resources card", () => {
  it("waiting, with no resources line yet: the static card is there so the talker is never without numbers", () => {
    renderScreen("waiting", [message({})]);

    expect(screen.getByRole("heading", { name: STATIC_TITLE })).toBeInTheDocument();
    expect(screen.getAllByTestId("helpline-resources")).toHaveLength(1);
  });

  it("waiting, once a RESOURCES line is in the stream: only the in-stream card remains", () => {
    renderScreen("waiting", [message({}), resourcesLine]);

    expect(screen.queryByRole("heading", { name: STATIC_TITLE })).not.toBeInTheDocument();
    const cards = screen.getAllByTestId("helpline-resources");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent(IN_STREAM_TITLE);
    expect(cards[0]).toHaveTextContent(ORG_RESOURCES);
  });

  it("a RESOURCES line arriving while the talker waits takes the static card away", () => {
    const { rerender } = renderScreen("waiting", [message({})]);
    expect(screen.getByRole("heading", { name: STATIC_TITLE })).toBeInTheDocument();

    rerender(
      <ConversationScreen
        mode="waiting"
        chat={chat}
        messages={[message({}), resourcesLine]}
        listenerTyping={false}
        resourcesText={ORG_RESOURCES}
        estimatedWaitMinutes={null}
        isReconnecting={false}
        draft=""
        onDraftChange={vi.fn()}
        onSend={vi.fn(() => true)}
        onTyping={vi.fn()}
        onRetry={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.queryByRole("heading", { name: STATIC_TITLE })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("helpline-resources")).toHaveLength(1);
  });

  it("only a SYSTEM line of kind RESOURCES counts — talker text that happens to say so does not", () => {
    renderScreen("waiting", [message({ content: "RESOURCES", systemKind: null })]);

    expect(screen.getByRole("heading", { name: STATIC_TITLE })).toBeInTheDocument();
  });

  it("chatting: one card, from the stream, and never a static one", () => {
    renderScreen("chat", [message({}), resourcesLine]);

    expect(screen.queryByRole("heading", { name: STATIC_TITLE })).not.toBeInTheDocument();
    const cards = screen.getAllByTestId("helpline-resources");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent(IN_STREAM_TITLE);
  });
});

describe("the other talker screens keep their static resources card", () => {
  it("the ended screen shows it even though the stream had a RESOURCES line", () => {
    render(
      <EndedScreen
        chat={{
          ...chat,
          status: "ENDED",
          claimedAt: "2026-10-06T10:02:00.000Z",
          listenerName: "Asha",
        }}
        messages={[message({}), resourcesLine]}
        resourcesText={ORG_RESOURCES}
        isSubmittingFeedback={false}
        onSubmitFeedback={vi.fn(async () => true)}
        onStartNew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: STATIC_TITLE })).toBeInTheDocument();
    expect(screen.getByTestId("helpline-resources")).toHaveTextContent(ORG_RESOURCES);
  });
});
