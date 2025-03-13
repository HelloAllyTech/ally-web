import { MessageType } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: () => void;
}

export interface Chat {
    chatId: number;
    messages: {
      content: string;
      id: number;
      createdAt: number;
      senderId: number;
      type: MessageType;
    }[]; 
};

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: number;
}
