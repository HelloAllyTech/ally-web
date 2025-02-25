export type ApiMessage = {
  message_id: number;
  chat_id: number;
  sender_id: number;
  message_type: string;
  content: string;
  context?: {
    source: string;
  };
  created_at: string;
};

export type SocketMessage = {
  type: SocketEvent | string;
  payload?: {
    message_id: number;
    chat_id: number;
    sender_id: number;
    message_type: MessageType | string;
    content: string;
    context?: {
      source: string;
    };
    created_at: string;
  };
  content?: string;
  message_type?: MessageType | string;
  context?: {
    source: string;
  };
  created_at?: string;
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
