import { Chat } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: (triggerApi: boolean) => void;
}

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: number;
  isFinal?: boolean;
  isSentenceComplete?: boolean;
}
