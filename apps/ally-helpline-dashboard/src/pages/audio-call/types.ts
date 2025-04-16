import { Chat } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: (triggerApi: boolean) => void;
}

export interface RealTimeTranscriptProps {
  isFocusMode: boolean;
  transcriptions: Transcription[];
}

export interface CallSidebarProps {
  isCounsellor: boolean;
  isFocusMode: boolean;
  isUserJoined: boolean;
  onClose: () => void;
  stage: string;
  nudges: string[];
}

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: string;
  isFinal?: boolean;
  isSentenceComplete?: boolean;
}
