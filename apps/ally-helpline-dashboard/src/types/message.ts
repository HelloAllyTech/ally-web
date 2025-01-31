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

export enum SocketEvent {
  MESSAGE_RECEIVED = "MESSAGE_RECEIVED",
  SEND_MESSAGE = "SEND_MESSAGE",
  NUDGE = "NUDGE",
  CHAT_ACCEPTED = "CHAT_ACCEPTED",
}

export enum ChatStatus {
  ENDED = "ENDED",
  PAUSED = "PAUSED",
  ACTIVE = "ACTIVE",
}
