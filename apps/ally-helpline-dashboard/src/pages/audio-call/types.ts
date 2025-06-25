import { MutableRefObject } from "react";

import { Chat, FeedbackResponse } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: (triggerApi: boolean) => void;
  isMicrophoneMode: boolean;
}

export interface CallInterfaceProps {
  activeChat: Chat;
  isCounsellor: boolean;
  isUserJoined: boolean;
  mediaRecorder: MediaRecorder | null;
  remoteMediaRecorder: MediaRecorder | null;
  remoteStreamRef: MutableRefObject<MediaStream>;
}

export interface RealTimeTranscriptProps {
  isFocusMode: boolean;
  transcriptions: Transcription[];
}

export interface CallControlsProps {
  isCounsellor: boolean;
  isFocusMode: boolean;
  isMuted: boolean;
  isUserJoined: boolean;
  onCutCallButtonClick: () => void;
  onFocusButtonClick: (isFocused: boolean) => void;
  onMuteButtonClick: () => void;
}

export interface CallSidebarProps {
  isCounsellor: boolean;
  isFocusMode: boolean;
  isUserJoined: boolean;
  onClose: () => void;
  stage: string;
  nudges: Nudge[];
}

export interface Transcription {
  id: number;
  message: string;
  senderId: number;
  timestamp: string;
  isFinal?: boolean;
  isSentenceComplete?: boolean;
}

export interface Nudge {
  content: string;
  id: number;
  feedback: FeedbackResponse;
}
