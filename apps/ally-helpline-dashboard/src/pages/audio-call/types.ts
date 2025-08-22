import { MutableRefObject } from "react";

import { SocketDisconnectionReasons } from "@constants";
import { Chat, FeedbackResponse, Transcription } from "@types";

export interface CallTranscriptProps {
  activeChat: Chat;
  microphoneChatId: number;
  endSession: (triggerApi: boolean, chatId: number) => void;
  // TODO: Refactor isMicrophoneMode and isExotelMode props to use callMode prop
  isMicrophoneMode: boolean;
  isExotelMode: boolean;
  setMicrophoneChatId: (chatId: number) => void;
}

export interface CallInterfaceProps {
  activeChat: Chat;
  isCounsellor: boolean;
  isUserJoined: boolean;
  mediaRecorder: MediaRecorder | null;
  remoteMediaRecorder: MediaRecorder | null;
  remoteStreamRef: MutableRefObject<MediaStream>;
  // TODO: Refactor isMicrophoneMode and isExotelMode props to use callMode prop
  isMicrophoneMode: boolean;
  isExotelMode: boolean;
  socketDisconnectionReason?: SocketDisconnectionReasons;
}

export interface RealTimeTranscriptProps {
  isFocusMode: boolean;
  transcriptions: Transcription[];
}

export interface CallControlsProps {
  isFocusMode: boolean;
  isPaused: boolean;
  isEndSessionDisabled: boolean;
  isFocusButtonDisabled: boolean;
  isPauseTranscriptionDisabled: boolean;
  onEndSessionClick?: () => void;
  onFocusButtonClick: (isFocused: boolean) => void;
  onPauseTranscriptionClick?: () => void;
  showEndSession: boolean;
  showFocusButton: boolean;
  showPauseTranscription: boolean;
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
