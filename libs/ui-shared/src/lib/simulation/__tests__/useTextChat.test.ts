import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TEXT_CHAT_REPLY_TOPIC, TEXT_CHAT_SEND_TOPIC, useTextChat } from "../useTextChat";

vi.mock("../../../logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

type Listener = (...args: any[]) => void;

const makeRoom = () => {
  const listeners = new Map<string, Set<Listener>>();
  const handlers = new Map<string, Listener>();
  const room = {
    localParticipant: {
      identity: "learner-1",
      sendText: vi.fn().mockResolvedValue({ id: "sent" }),
    },
    remoteParticipants: new Map<string, any>(),
    registerTextStreamHandler: vi.fn((topic: string, handler: Listener) => {
      handlers.set(topic, handler);
    }),
    unregisterTextStreamHandler: vi.fn((topic: string) => handlers.delete(topic)),
    on: vi.fn((event: string, fn: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    }),
    off: vi.fn((event: string, fn: Listener) => listeners.get(event)?.delete(fn)),
  };
  const emit = (event: string, ...args: any[]) => listeners.get(event)?.forEach(fn => fn(...args));
  const reply = (text: string, identity = "agent-1", id = `seg-${Math.random()}`) =>
    handlers.get(TEXT_CHAT_REPLY_TOPIC)?.(
      { readAll: () => Promise.resolve(text), info: { id } },
      { identity },
    );
  return { room, emit, reply, handlers };
};

describe("useTextChat", () => {
  it("registers nothing for a voice session", () => {
    const { room } = makeRoom();

    renderHook(() => useTextChat(room, false));

    expect(room.registerTextStreamHandler).not.toHaveBeenCalled();
    expect(room.on).not.toHaveBeenCalled();
  });

  it("shows each completed reply from the client as one message", async () => {
    const { room, reply } = makeRoom();
    const { result } = renderHook(() => useTextChat(room, true));

    expect(room.registerTextStreamHandler).toHaveBeenCalledWith(
      TEXT_CHAT_REPLY_TOPIC,
      expect.any(Function),
    );

    act(() => {
      reply("  hey. not sure why i'm even messaging  ");
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0]).toEqual(
      expect.objectContaining({
        role: "client",
        text: "hey. not sure why i'm even messaging",
        status: "sent",
      }),
    );
  });

  it("never renders a stream from the learner's own identity, or a blank one", async () => {
    const { room, reply } = makeRoom();
    const { result } = renderHook(() => useTextChat(room, true));

    act(() => {
      reply("echo", "learner-1");
      reply("   ");
      reply("real one");
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].text).toBe("real one");
  });

  it("sends on lk.chat and marks the message sent", async () => {
    const { room } = makeRoom();
    const { result } = renderHook(() => useTextChat(room, true));

    await act(async () => {
      await result.current.send("  What's been happening tonight?  ");
    });

    expect(room.localParticipant.sendText).toHaveBeenCalledWith("What's been happening tonight?", {
      topic: TEXT_CHAT_SEND_TOPIC,
    });
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: "learner", status: "sent" }),
    ]);
  });

  it("marks a failed send and moves it to the end when retried", async () => {
    const { room, reply } = makeRoom();
    room.localParticipant.sendText.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useTextChat(room, true));

    await act(async () => {
      await result.current.send("first try");
    });
    expect(result.current.messages[0].status).toBe("failed");

    act(() => {
      reply("are you there?");
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.retry(result.current.messages[0].id);
    });

    expect(result.current.messages.map(m => [m.role, m.status])).toEqual([
      ["client", "sent"],
      ["learner", "sent"],
    ]);
    expect(room.localParticipant.sendText).toHaveBeenCalledTimes(2);
  });

  it("reports the client typing while the agent thinks or writes", () => {
    const { room, emit } = makeRoom();
    const { result } = renderHook(() => useTextChat(room, true));
    const agent = { identity: "agent-1", attributes: { "lk.agent.state": "thinking" } };

    act(() => emit("participantAttributesChanged", {}, agent));
    expect(result.current.isClientTyping).toBe(true);

    act(() =>
      emit(
        "participantAttributesChanged",
        {},
        { ...agent, attributes: { "lk.agent.state": "listening" } },
      ),
    );
    expect(result.current.isClientTyping).toBe(false);
  });

  it("stops listening when unmounted", () => {
    const { room } = makeRoom();
    const { unmount } = renderHook(() => useTextChat(room, true));

    unmount();

    expect(room.unregisterTextStreamHandler).toHaveBeenCalledWith(TEXT_CHAT_REPLY_TOPIC);
    expect(room.off).toHaveBeenCalled();
  });
});
