import { describe, expect, it } from "vitest";

import type { GuestChatDto, GuestMessageDto, PublicStatusEnabled } from "@types";

import {
  initialTalkerState,
  lastServerMessageId,
  mergeTalkerMessages,
  talkerReducer,
  type TalkerAction,
  type TalkerState,
} from "../talkerReducer";

const openStatus: PublicStatusEnabled = {
  enabled: true,
  open: true,
  closedReason: null,
  org: { name: "Acme Care", logoUrl: null },
  languages: ["en", "hi"],
  hours: null,
  estimatedWaitMinutes: 4,
  resources: { en: "Call 112." },
  consent: { version: "v1", retentionDays: 90, ageNotice: null },
};

const chat = (overrides: Partial<GuestChatDto> = {}): GuestChatDto => ({
  id: "chat-1",
  status: "WAITING",
  endedReason: null,
  language: "en",
  displayName: "Anonymous",
  listenerName: null,
  queuePosition: 2,
  waitStartedAt: "2026-10-05T10:00:00.000Z",
  claimedAt: null,
  endedAt: null,
  feedbackSubmitted: false,
  org: { name: "Acme Care", logoUrl: null },
  ...overrides,
});

const message = (overrides: Partial<GuestMessageDto> = {}): GuestMessageDto => ({
  id: 1,
  clientMessageId: null,
  from: "LISTENER",
  type: "TEXT",
  systemKind: null,
  content: "Hello",
  createdAt: "2026-10-05T10:01:00.000Z",
  ...overrides,
});

const run = (actions: TalkerAction[], from: TalkerState = initialTalkerState) =>
  actions.reduce(talkerReducer, from);

describe("talkerReducer — the talker page state machine", () => {
  it("starts on loading", () => {
    expect(initialTalkerState.screen).toBe("loading");
  });

  it("walks consent → waiting → chat → ended", () => {
    const consent = run([{ type: "STATUS_LOADED", status: openStatus }]);
    expect(consent.screen).toBe("consent");

    const waiting = run([{ type: "SESSION_STARTED", chat: chat(), messages: [] }], consent);
    expect(waiting.screen).toBe("waiting");
    expect(waiting.chat?.queuePosition).toBe(2);

    const moved = run([{ type: "QUEUE_POSITION", chatId: "chat-1", position: 1 }], waiting);
    expect(moved.chat?.queuePosition).toBe(1);

    const chatting = run(
      [
        {
          type: "CHAT_ACCEPTED",
          chat: chat({ status: "ACTIVE", listenerName: "Asha", claimedAt: "2026-10-05T10:03:00Z" }),
        },
      ],
      moved,
    );
    expect(chatting.screen).toBe("chat");
    expect(chatting.chat?.listenerName).toBe("Asha");

    const ended = run(
      [{ type: "CHAT_ENDED", chatId: "chat-1", endedReason: "LISTENER_ENDED" }],
      chatting,
    );
    expect(ended.screen).toBe("ended");
    expect(ended.chat?.status).toBe("ENDED");
    expect(ended.chat?.endedReason).toBe("LISTENER_ENDED");
  });

  it("shows the closed screen with its reason when nobody is available", () => {
    const state = run([
      {
        type: "STATUS_LOADED",
        status: { ...openStatus, open: false, closedReason: "OUTSIDE_HOURS" },
      },
    ]);
    expect(state.screen).toBe("closed");
    expect(state.closedReason).toBe("OUTSIDE_HOURS");
  });

  it("shows not-available for a disabled helpline or an unknown code", () => {
    const state = run([{ type: "STATUS_LOADED", status: { enabled: false } }]);
    expect(state.screen).toBe("notAvailable");
  });

  it("treats a 409 at session start as closed, and a 503 queue-full as very busy", () => {
    const consent = run([{ type: "STATUS_LOADED", status: openStatus }]);
    expect(run([{ type: "START_FAILED", reason: "closed" }], consent).screen).toBe("closed");
    const busy = run([{ type: "START_FAILED", reason: "queueFull" }], consent);
    expect(busy.screen).toBe("closed");
    expect(busy.closedReason).toBe("QUEUE_FULL");
  });

  it("keeps the talker on consent with a notice for blocked, outdated consent and network errors", () => {
    const consent = run([{ type: "STATUS_LOADED", status: openStatus }]);
    for (const reason of ["blocked", "consentOutdated", "network", "rateLimited"] as const) {
      const state = run([{ type: "START_FAILED", reason }], consent);
      expect(state.screen).toBe("consent");
      expect(state.notice).toBe(reason);
    }
  });

  describe("resume from a stored guest token", () => {
    it("jumps straight to the chat when the token still works", () => {
      const state = run([
        { type: "RESUME_STARTED" },
        // Status lands first: it must not knock the talker onto consent mid-resume.
        { type: "STATUS_LOADED", status: openStatus },
        {
          type: "RESUMED",
          chat: chat({ status: "ACTIVE", listenerName: "Asha" }),
          messages: [message({ id: 3 }), message({ id: 2, from: "ME", content: "hi" })],
        },
      ]);
      expect(state.screen).toBe("chat");
      expect(state.messages.map(item => item.id)).toEqual([2, 3]);
      expect(state.messages[0].localStatus).toBe("sent");
    });

    it("resumes an ended chat onto the ended screen", () => {
      const state = run([
        { type: "RESUME_STARTED" },
        { type: "RESUMED", chat: chat({ status: "ENDED" }), messages: [] },
      ]);
      expect(state.screen).toBe("ended");
    });

    it("falls back to consent with a notice when the token was expired or revoked", () => {
      const state = run([
        { type: "STATUS_LOADED", status: openStatus },
        { type: "RESUME_STARTED" },
        { type: "RESUME_FAILED", expired: true },
      ]);
      expect(state.screen).toBe("consent");
      expect(state.chat).toBeNull();
      expect(state.notice).toBe("sessionExpired");
    });

    it("still reaches consent when the resume fails before the status has loaded", () => {
      const state = run([
        { type: "RESUME_STARTED" },
        { type: "RESUME_FAILED", expired: true },
        { type: "STATUS_LOADED", status: openStatus },
      ]);
      expect(state.screen).toBe("consent");
    });

    it("lands on not-available, not a spinner, when the helpline is off and the token is stale", () => {
      const state = run([
        { type: "RESUME_STARTED" },
        { type: "STATUS_LOADED", status: { enabled: false } },
        { type: "RESUME_FAILED", expired: true },
      ]);
      expect(state.screen).toBe("notAvailable");
    });
  });

  it("never pulls a talker out of an open chat when a status refresh says the helpline is closed", () => {
    const chatting = run([
      { type: "STATUS_LOADED", status: openStatus },
      { type: "SESSION_STARTED", chat: chat({ status: "ACTIVE" }), messages: [] },
    ]);
    const after = run(
      [
        {
          type: "STATUS_LOADED",
          status: { ...openStatus, open: false, closedReason: "NO_LISTENERS" },
        },
      ],
      chatting,
    );
    expect(after.screen).toBe("chat");
  });

  it("ignores events for another chat", () => {
    const waiting = run([
      { type: "STATUS_LOADED", status: openStatus },
      { type: "SESSION_STARTED", chat: chat(), messages: [] },
    ]);
    const after = run(
      [
        { type: "QUEUE_POSITION", chatId: "other", position: 9 },
        { type: "CHAT_ENDED", chatId: "other", endedReason: "TALKER_ENDED" },
      ],
      waiting,
    );
    expect(after.chat?.queuePosition).toBe(2);
    expect(after.screen).toBe("waiting");
  });

  it("erases everything on DELETED and stays deleted when late events arrive", () => {
    const deleted = run([
      { type: "STATUS_LOADED", status: openStatus },
      { type: "SESSION_STARTED", chat: chat({ status: "ACTIVE" }), messages: [message()] },
      { type: "DELETED" },
      { type: "MESSAGES_MERGED", messages: [message({ id: 9 })] },
      { type: "CHAT_UPDATED", chat: chat({ status: "ENDED" }) },
    ]);
    expect(deleted.screen).toBe("deleted");
    expect(deleted.chat).toBeNull();
    expect(deleted.messages).toEqual([]);
  });

  it("RESET returns to consent with nothing left over (Start a new chat)", () => {
    const state = run([
      { type: "STATUS_LOADED", status: openStatus },
      { type: "SESSION_STARTED", chat: chat({ status: "ENDED" }), messages: [message()] },
      { type: "RESET" },
    ]);
    expect(state.screen).toBe("consent");
    expect(state.chat).toBeNull();
    expect(state.messages).toEqual([]);
  });

  describe("own messages: pending → sent, failed → retry", () => {
    const base = run([
      { type: "STATUS_LOADED", status: openStatus },
      { type: "SESSION_STARTED", chat: chat({ status: "ACTIVE" }), messages: [] },
      {
        type: "MESSAGE_QUEUED",
        localId: -1,
        clientMessageId: "c-1",
        content: "I need to talk",
        createdAt: "2026-10-05T10:02:00Z",
      },
    ]);

    it("shows a queued message at once as pending", () => {
      expect(base.messages).toHaveLength(1);
      expect(base.messages[0].localStatus).toBe("pending");
    });

    it("replaces the pending copy with the server message on ack", () => {
      const acked = run(
        [
          {
            type: "MESSAGE_ACKED",
            clientMessageId: "c-1",
            message: message({
              id: 7,
              from: "ME",
              clientMessageId: "c-1",
              content: "I need to talk",
            }),
          },
        ],
        base,
      );
      expect(acked.messages).toHaveLength(1);
      expect(acked.messages[0]).toMatchObject({ id: 7, localStatus: "sent" });
    });

    it("does not duplicate a message that arrives by ack and by MESSAGE_RECEIVED", () => {
      const server = message({
        id: 7,
        from: "ME",
        clientMessageId: "c-1",
        content: "I need to talk",
      });
      const state = run(
        [
          { type: "MESSAGES_MERGED", messages: [server] },
          { type: "MESSAGE_ACKED", clientMessageId: "c-1", message: server },
          { type: "MESSAGES_MERGED", messages: [server] },
        ],
        base,
      );
      expect(state.messages).toHaveLength(1);
    });

    it("marks a failed send and lets it be retried", () => {
      const failed = run(
        [{ type: "MESSAGE_FAILED", clientMessageId: "c-1", failure: "timeout" }],
        base,
      );
      expect(failed.messages[0]).toMatchObject({ localStatus: "failed", failure: "timeout" });
      const retrying = run([{ type: "MESSAGE_RETRYING", clientMessageId: "c-1" }], failed);
      expect(retrying.messages[0].localStatus).toBe("pending");
    });
  });

  it("orders server messages by id and keeps unsent ones last", () => {
    const merged = mergeTalkerMessages(
      [
        {
          ...message({ id: -1, from: "ME", clientMessageId: "c-9", content: "draft" }),
          localStatus: "failed",
        },
      ],
      [message({ id: 5 }), message({ id: 3 })],
    );
    expect(merged.map(item => item.id)).toEqual([3, 5, -1]);
    expect(lastServerMessageId(merged)).toBe(5);
  });
});
