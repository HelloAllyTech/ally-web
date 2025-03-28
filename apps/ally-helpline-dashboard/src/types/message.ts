export type ApiMessage = {
  id: number;
  chatId: number;
  senderId: number;
  type: string;
  content: string;
  context?: {
    source: string;
  };
  createdAt: string;
};

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

export enum MessageType {
  TEXT = "TEXT",
  NUDGE = "NUDGE",
}

// TODO: Update the socket event names to UPPER CASE
export enum SocketEvent {
  NUDGE = "NUDGE",
  STAGE = "STAGE",
  SEND_MESSAGE = "SEND_MESSAGE",
  CHAT_ACCEPTED = "CHAT_ACCEPTED",
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  AUDIO_CHAT_MUTED = "AUDIO_CHAT_MUTED",
  ICE_CANDIDATE = "webrtc-ice-candidate",
  WEBRTC_OFFER = "webrtc-offer",
  WEBRTC_ANSWER = "webrtc-answer",
  AUDIO_MESSAGE = "AUDIO_MESSAGE",
  START_AUDIO_CHAT = "START_AUDIO_CHAT",
  CHAT_ENDED = "CHAT_ENDED",
  UTTERANCE_ENDED = "UTTERANCE_ENDED",
  USER_JOINED = "USER_JOINED",
  USER_DISCONNECTED = "USER_DISCONNECTED",
}

export enum ChatStatus {
  ENDED = "ENDED",
  PAUSED = "PAUSED",
  ACTIVE = "ACTIVE",
}
