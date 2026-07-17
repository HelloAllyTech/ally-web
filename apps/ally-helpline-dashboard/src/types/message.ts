import { CallProvider } from "@constants";

import { User } from "./user";

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export type ChatMessage = {
  chatId: number;
  content: string;
  context?: {
    source: string;
  };
  createdAt: string;
  feedback?: FeedbackResponse;
  id: number;
  senderId: number;
  type: MessageType;
  updatedAt: string;
};

export enum ChatStatus {
  ENDED = "ENDED",
  PAUSED = "PAUSED",
  ACTIVE = "ACTIVE",
}

export interface Chat {
  chatId: number;
  client: User;
  clientId: number;
  counselor: User;
  counselorId: number;
  endedAt: string | null;
  messages: ChatMessage[];
  startedAt: string;
  status: ChatStatus;
  provider: CallProvider;
  platform: "WEB" | "MOBILE";
}

export enum QueueStatus {
  WAITING = "WAITING",
  MATCHED = "MATCHED",
  ENDED = "ENDED",
}

export type SocketMessage = {
  type: SocketEvent | string;
  payload?: {
    id: number;
    chatId: number;
    senderId: number;
    type: MessageType | string;
    content: string;
    context?: {
      source: string;
    };
    createdAt: string;
  };
  content?: string;
  context?: {
    source: string;
  };
  createdAt?: string;
};

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: string;
  isFinal?: boolean;
  isSentenceComplete?: boolean;
}

export enum MessageType {
  NUDGE = "NUDGE",
  STAGE = "STAGE",
  TEXT = "TEXT",
}

export enum SocketEvent {
  NUDGE = "NUDGE",
  STAGE = "STAGE",
  SEND_MESSAGE = "SEND_MESSAGE",
  CHAT_ACCEPTED = "CHAT_ACCEPTED",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  AUDIO_CHAT_MUTED = "AUDIO_CHAT_MUTED",
  AUDIO_MESSAGE = "AUDIO_MESSAGE",
  START_AUDIO_CHAT = "START_AUDIO_CHAT",
  CHAT_ENDED = "CHAT_ENDED",
  UTTERANCE_ENDED = "UTTERANCE_ENDED",
  USER_JOINED = "USER_JOINED",
  USER_DISCONNECTED = "USER_DISCONNECTED",
  SESSION_CREATED = "SESSION_CREATED",
  AUDIO_CHAT_ENDED = "AUDIO_CHAT_ENDED",
  AUDIO_STREAM = "AUDIO_STREAM",
  DISCONNECT = "disconnect",
  // socket.io fires "connect" on both the initial connection and every
  // reconnect — used to resume a recording after a transient drop.
  CONNECT = "connect",
}

export interface FeedbackInput {
  rating?: number;
}

export interface FeedbackResponse {
  rating: number;
  messageId: number;
  userId: number;
  modifiedContent: string | null;
  createdAt: string;
  updatedAt: string;
  feedbackId: number;
}
