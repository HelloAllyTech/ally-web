export type ApiMessage = {
  id: number;
  chatId: number;
  senderId: number;
  messageType: string;
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
    messageType: MessageType | string;
    content: string;
    context?: {
      source: string;
    };
    createdAt: string;
  };
  content?: string;
  messageType?: MessageType | string;
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
  ICE_CANDIDATE = "webrtc-ice-candidate",
  WEBRTC_OFFER = "webrtc-offer",
  WEBRTC_ANSWER = "webrtc-answer",
  AUDIO_MESSAGE = "AUDIO_MESSAGE",
  START_AUDIO_CHAT = "START_AUDIO_CHAT",
}

export enum ChatStatus {
  ENDED = "ENDED",
  PAUSED = "PAUSED",
  ACTIVE = "ACTIVE",
}
