import type { MutableRefObject, ReactNode } from "react";

import { RoomStatus } from "./SimulationInterface";

export interface StateInstruction {
  name: string;
  stateId: string;
}

export interface SessionProgressProps {
  stateInstructions: StateInstruction[];
  difficultyLevel: string;
  score: number;
  startTime?: string;
  maxTimeSeconds?: number;
}

export interface SimulationTranslations {
  mute: string;
  unmute: string;
  focus: string;
  focused: string;
  endSession: string;
  sessionDuration: string;
  dataSafe: string;
  waitingForAgent: string;
  connectingToSession: string;
  allowMicrophone: string;
  microphonePromptBrowser: string;
  microphonePrompt: string;
  clickToAllow: string;
  closePreview: string;
  points: string;
  sessionTimer: string;
  timeRemaining: string;
  sessionChecklist: string;
  progress: string;
  completed: string;
  of: string;
  min: string;
  sec: string;
}

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
  translations?: Pick<SimulationTranslations, "points">;
}

export interface SimulationTimerProps {
  isWarning: boolean;
  onTimeLimit: () => void;
  onWarning: () => void;
  startTime: string;
  timeLimit?: number;
  translations?: Pick<SimulationTranslations, "sessionDuration">;
}

export interface SessionGoalTimerProps {
  startTime: string;
  maxTimeSeconds: number;
  translations?: Pick<SimulationTranslations, "sessionTimer" | "timeRemaining" | "min" | "sec">;
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
  stateInstructions?: StateInstruction[];
  difficultyLevel?: string;
  translations?: SimulationTranslations;
}

export interface SimulationControlsProps {
  isEndingSession: boolean;
  isFocusMode: boolean;
  isMuted: boolean;
  onEndSessionClick: () => void;
  onMuteClick: () => void;
  onFocusButtonClick: () => void;
  translations?: Pick<
    SimulationTranslations,
    "mute" | "unmute" | "focus" | "focused" | "endSession"
  >;
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
  timeLimit?: number;
  isFocusMode: boolean;
  onFocusButtonClick: () => void;
  translations?: SimulationTranslations;
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

export enum DifficultyLevel {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  HARD = "HARD",
}

export interface ScoreRange {
  min?: number;
  max?: number;
}

export interface StateScoreConfig {
  stateId: string;
  scoreRange: ScoreRange;
}
