import type { MutableRefObject, ReactNode } from "react";

import { RoomStatus } from "./SimulationInterface";

export interface SimulationEventType {
  score: number | null;
  emoji: string;
  message: string;
  timestamp: string;
}

export interface SimulationEventsProps {
  events: SimulationEventType[];
}

export interface SimulationScoreMeterProps {
  score?: number;
}

export interface SimulationTimerProps {
  isWarning: boolean;
  onTimeLimit: () => void;
  onWarning: () => void;
  startTime: string;
  timeLimit?: number;
}

export interface SessionGoalTimerProps {
  startTime: string;
  maxTimeValue: string;
}

export interface RenderControlsParams {
  isMuted: boolean;
  isEndingSession: boolean;
  onMuteClick: () => void;
  onEndSessionClick: () => void;
}

export interface RenderWarningDialogParams {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onEnd: () => void;
}

export interface TriggerWarning {
  id: number;
  name: string;
}

export interface SimulationPageProps {
  room: any; // LiveKit Room instance; typed as any to avoid hard dependency for consumers
  roomData: any;
  sessionId?: string;
  isEndingSession: boolean;
  startTime: string;
  events: SimulationEventType[];
  detectedEventIds?: string[];
  score?: number;
  roomStatus: RoomStatus;
  isPreview?: boolean;
  onEndSimulation: () => Promise<void> | void;
  renderWarningDialog: (params: RenderWarningDialogParams) => ReactNode;
  renderFooter?: () => ReactNode;
  endSessionButtonRef: MutableRefObject<boolean>;
}

export interface SimulationControlsProps {
  isEndingSession: boolean;
  isFocusMode: boolean;
  isMuted: boolean;
  onEndSessionClick: () => void;
  onMuteClick: () => void;
  onFocusButtonClick: () => void;
}

export interface CircleConfig {
  scale: number;
  isStatic: boolean;
}

export interface BottomSectionProps {
  isWarning: boolean;
  onTimeLimitWarning: () => void;
  onEndSimulation: () => void;
  onMuteSimulation: () => void;
  isMuted: boolean;
  isEndingSession: boolean;
  startTime: string;
  isFocusMode: boolean;
  onFocusButtonClick: () => void;
}

export enum ChecklistMode {
  GUIDED = "GUIDED",
  UNGUIDED = "UNGUIDED",
  OFF = "OFF",
}

export interface ChecklistItem {
  id: string;
  name?: string;
  rank?: number;
  score?: number;
  message?: string;
}
