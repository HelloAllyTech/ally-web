import { MutableRefObject } from "react";

import { Chat, FeedbackResponse, Transcription } from "@/types/message";

export interface CallTranscriptProps {
  activeChat: Chat;
  endSession: (triggerApi: boolean, chatId: number) => void;
  isMicrophoneMode: boolean;
}

export interface CallInterfaceProps {
  activeChat: Chat;
  isCounsellor: boolean;
  isUserJoined: boolean;
  mediaRecorder: MediaRecorder | null;
  remoteMediaRecorder: MediaRecorder | null;
  remoteStreamRef: MutableRefObject<MediaStream>;
  isMicrophoneMode: boolean;
}

export interface RealTimeTranscriptProps {
  isFocusMode: boolean;
  transcriptions: Transcription[];
}

export interface CallControlsProps {
  isFocusMode: boolean;
  isMuted: boolean;
  isSecondaryButtonDisabled: boolean;
  showFocusButton: boolean;
  onCutCallButtonClick: () => void;
  onFocusButtonClick: (isFocused: boolean) => void;
  onMuteButtonClick: () => void;
}

export interface CallSidebarProps {
  isFocusMode: boolean;
  showSidebar: boolean;
  onClose: () => void;
  stage: string;
  nudges: Nudge[];
}

export interface Nudge {
  content: string;
  id: number;
  feedback: FeedbackResponse;
}
