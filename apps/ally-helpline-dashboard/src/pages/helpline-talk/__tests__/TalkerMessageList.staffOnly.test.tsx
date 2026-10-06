import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GuestMessageDto } from "@types";

import { TalkerMessageList } from "../components/TalkerMessageList";

import type { TalkerMessage } from "../talkerReducer";

const message = (overrides: Partial<GuestMessageDto> & Record<string, unknown>): TalkerMessage =>
  ({
    id: 1,
    clientMessageId: null,
    from: "LISTENER",
    type: "TEXT",
    systemKind: null,
    content: "Hi, I'm here",
    createdAt: "2026-10-06T10:00:00.000Z",
    ...overrides,
  }) as TalkerMessage;

/**
 * Whispers and staff-only system lines never reach the talker's socket — the
 * server builds guest DTOs from talker-visible rows only. This is the second
 * wall: even if one slipped through, the talker page renders nothing for it.
 */
describe("TalkerMessageList — staff-only content", () => {
  it("never renders a whisper or a staff-only system line", () => {
    render(
      <TalkerMessageList
        messages={[
          message({ id: 1 }),
          message({
            id: 2,
            type: "WHISPER" as GuestMessageDto["type"],
            content: "Supervisor: ask about their plan",
          }),
          message({
            id: 3,
            from: "SERVICE",
            type: "SYSTEM",
            systemKind: "SUPERVISOR_REQUESTED" as GuestMessageDto["systemKind"],
            content: "Asha asked a supervisor for help",
          }),
          message({
            id: 4,
            from: "SERVICE",
            type: "SYSTEM",
            systemKind: "TAKEN_OVER" as GuestMessageDto["systemKind"],
            content: "A supervisor took over this chat",
          }),
        ]}
        listenerName="Asha"
        typing={false}
        onRetry={vi.fn()}
      />,
    );
    const list = screen.getByTestId("talker-message-list");
    expect(list).toHaveTextContent("Hi, I'm here");
    expect(list).not.toHaveTextContent("ask about their plan");
    expect(list).not.toHaveTextContent("asked a supervisor");
    expect(list).not.toHaveTextContent("took over");
    expect(list.querySelectorAll("li")).toHaveLength(1);
  });

  it("still renders the talker-visible service lines", () => {
    render(
      <TalkerMessageList
        messages={[
          message({
            id: 5,
            from: "SERVICE",
            type: "SYSTEM",
            systemKind: "TRANSFERRING",
            content: "Your chat is being passed to another listener",
          }),
        ]}
        listenerName="Asha"
        typing={false}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByTestId("talker-message-list").querySelectorAll("li")).toHaveLength(1);
  });
});
