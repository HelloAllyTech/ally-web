"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RoomEvent } from "livekit-client";

import { logger } from "../../logger";

/**
 * Text-chat roleplays run in the same LiveKit room as a voice call, with audio
 * switched off in the agent. Text travels both ways as LiveKit text streams:
 *
 * - the learner's messages go out on `lk.chat`, which the agent turns into a
 *   turn (ally-ai-learn `app/core/livekit/text_chat.py`);
 * - each of the client's replies arrives as one stream on `lk.transcription`,
 *   closed once the reply is complete.
 *
 * Scores, events, supervisor hints and the transcript all keep flowing through
 * the channels the voice session already uses — this hook only owns the
 * messages on screen.
 */
export const TEXT_CHAT_SEND_TOPIC = "lk.chat";
export const TEXT_CHAT_REPLY_TOPIC = "lk.transcription";
/** Matches the agent's own cap (TEXT_CHAT_MAX_MESSAGE_CHARS). */
export const TEXT_CHAT_MAX_MESSAGE_LENGTH = 2000;

// LiveKit Agents publishes its state on the agent participant as this
// attribute: initializing | listening | thinking | speaking.
const AGENT_STATE_ATTRIBUTE = "lk.agent.state";
const COMPOSING_AGENT_STATES = new Set(["thinking", "speaking"]);

export type TextChatMessageRole = "learner" | "client";
export type TextChatMessageStatus = "sending" | "sent" | "failed";

export interface TextChatMessage {
  id: string;
  role: TextChatMessageRole;
  text: string;
  sentAt: number;
  status: TextChatMessageStatus;
}

export interface TextChatController {
  messages: TextChatMessage[];
  /** The client is composing a reply (agent thinking or writing). */
  isClientTyping: boolean;
  send: (text: string) => Promise<void>;
  /** Re-send a message that failed, moving it to the end of the thread. */
  retry: (id: string) => Promise<void>;
}

const newMessageId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Messages for a text-chat roleplay. Inert unless `enabled`, so the voice page
 * can call it unconditionally (hooks cannot be conditional) without registering
 * anything.
 *
 * Must be mounted for the whole session — the page, not the chat panel: the
 * client's opening message can land during the 3-2-1 countdown, before the
 * panel exists, and a stream nobody was listening for is gone.
 */
export const useTextChat = (room: any, enabled: boolean): TextChatController => {
  const [messages, setMessages] = useState<TextChatMessage[]>([]);
  const [agentState, setAgentState] = useState<string | undefined>(undefined);
  const messagesRef = useRef<TextChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (!enabled || typeof room?.registerTextStreamHandler !== "function") return undefined;

    const onReply = (reader: any, participantInfo: { identity?: string }) => {
      // Our own sends never come back on this topic, but a stream from the
      // local participant must never be rendered as the client speaking.
      if (participantInfo?.identity === room.localParticipant?.identity) return;
      reader
        .readAll()
        .then((text: string) => {
          const trimmed = text?.trim();
          if (!trimmed) return;
          setMessages(prev => [
            ...prev,
            {
              id: reader.info?.id ?? newMessageId(),
              role: "client",
              text: trimmed,
              sentAt: Date.now(),
              status: "sent",
            },
          ]);
        })
        .catch((error: unknown) => {
          logger.warn(`Failed to read a text-chat reply: ${error}`);
        });
    };

    try {
      room.registerTextStreamHandler(TEXT_CHAT_REPLY_TOPIC, onReply);
    } catch (error) {
      logger.warn(`Could not listen for text-chat replies: ${error}`);
      return undefined;
    }
    return () => {
      try {
        room.unregisterTextStreamHandler(TEXT_CHAT_REPLY_TOPIC);
      } catch {
        /* already gone with the room */
      }
    };
  }, [room, enabled]);

  useEffect(() => {
    if (!enabled || typeof room?.on !== "function") return undefined;

    const readState = (participant: any) => {
      if (!participant || participant.identity === room.localParticipant?.identity) return;
      const state = participant.attributes?.[AGENT_STATE_ATTRIBUTE];
      if (state) setAgentState(state);
    };
    const onAttributesChanged = (_changed: Record<string, string>, participant: any) =>
      readState(participant);
    const onParticipantConnected = (participant: any) => readState(participant);
    const onParticipantDisconnected = (participant: any) => {
      if (participant?.identity !== room.localParticipant?.identity) setAgentState(undefined);
    };

    room.on(RoomEvent.ParticipantAttributesChanged, onAttributesChanged);
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.remoteParticipants?.forEach?.(readState);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, onAttributesChanged);
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    };
  }, [room, enabled]);

  const deliver = useCallback(
    async (id: string, text: string) => {
      try {
        await room.localParticipant.sendText(text, { topic: TEXT_CHAT_SEND_TOPIC });
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, status: "sent" } : m)));
      } catch (error) {
        logger.warn(`Failed to send a text-chat message: ${error}`);
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, status: "failed" } : m)));
      }
    },
    [room],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, TEXT_CHAT_MAX_MESSAGE_LENGTH);
      if (!enabled || !text || !room?.localParticipant) return;
      const id = newMessageId();
      setMessages(prev => [
        ...prev,
        { id, role: "learner", text, sentAt: Date.now(), status: "sending" },
      ]);
      await deliver(id, text);
    },
    [enabled, room, deliver],
  );

  const retry = useCallback(
    async (id: string) => {
      const failed = messagesRef.current.find(m => m.id === id && m.status === "failed");
      if (!failed || !room?.localParticipant) return;
      // To the end of the thread: the client will read it now, after whatever
      // it has already said, so that is where it belongs.
      setMessages(prev => [
        ...prev.filter(m => m.id !== id),
        { ...failed, status: "sending", sentAt: Date.now() },
      ]);
      await deliver(id, failed.text);
    },
    [room, deliver],
  );

  return {
    messages,
    isClientTyping: enabled && !!agentState && COMPOSING_AGENT_STATES.has(agentState),
    send,
    retry,
  };
};
