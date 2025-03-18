import { MessageType } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: (triggerApi: boolean) => void;
}

export interface Chat {
  chatId: number;
  startedAt: string;
  currentStage?: string;
  messages: {
    content: string;
    id: number;
    createdAt: number;
    senderId: number;
    type: MessageType;
  }[];
}

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: number;
  isFinal?: boolean;
  isSentenceComplete?: boolean;
}
