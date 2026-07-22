import type { MutableRefObject, ReactNode } from "react";

import { RoomStatus } from "./SimulationInterface";

export type AgentTurnStatus = "thinking" | "speaking" | "user_turn";

export interface StateInstruction {
  name: string;
  stateId: string;
}

export interface SessionTimeBarProps {
  startTime?: string;
  maxTimeSeconds?: number;
  isPaused?: boolean;
  pausedOffsetMs?: number;
}

export interface SessionProgressProps {
  stateNames: StateInstruction[];
  difficultyLevel: string;
  score: number;
  startTime?: string;
  maxTimeSeconds?: number;
  isPaused?: boolean;
  pausedOffsetMs?: number;
  /** Suppress the title row + time bar (used when the timer is shown
   * elsewhere, e.g. the page header) and render only the state-name stepper. */
  hideTimeBar?: boolean;
}

export interface TurnIndicatorTranslations {
  speaking: string;
  listening: string;
  yourTurnToSpeak: string;
  yourTurnToListen: string;
  thinking: string;
  paused: string;
}

export interface SimulationTranslations {
  mute: string;
  unmute: string;
  pause: string;
  resume: string;
  pauseControlError: string;
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
  /** Session info panel (reminders + challenge description tabs). Optional so
   * existing consumers (admin previews) compile without providing them. */
  remindersTab?: string;
  descriptionTab?: string;
  noRemindersYet?: string;
  turnIndicator: TurnIndicatorTranslations;
}

export interface SimulationEventType {
  score: number | null;
  emoji: string;
  message: string;
  timestamp: string;
}

export interface SimulationEventsProps {
  events: SimulationEventType[];
  /** Suppress the "AI Feedback" header bar (redundant when rendered under a
   * tab already labeled "Live"). */
  hideHeader?: boolean;
}

export interface SessionSidebarProps {
  reminders?: string[];
  description?: string;
  stateNames: StateInstruction[];
  difficultyLevel: string;
  score: number;
  startTime?: string;
  maxTimeSeconds?: number;
  isPaused?: boolean;
  pausedOffsetMs?: number;
  checklistMode: ChecklistMode;
  checklistItems: ChecklistItem[];
  detectedEventIds?: string[];
  events: SimulationEventType[];
  translations?: SimulationTranslations;
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
  isPaused?: boolean;
  pausedOffsetMs?: number;
  translations?: Pick<SimulationTranslations, "sessionDuration">;
}

export interface SessionGoalTimerProps {
  startTime: string;
  maxTimeSeconds: number;
  isPaused?: boolean;
  pausedOffsetMs?: number;
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
  stateNames?: StateInstruction[];
  difficultyLevel?: string;
  translations?: SimulationTranslations;
  agentTurnStatus?: AgentTurnStatus;
}

export interface SimulationControlsProps {
  isEndingSession: boolean;
  isFocusMode: boolean;
  isMuted: boolean;
  showFocusButton: boolean;
  isPaused?: boolean;
  onEndSessionClick: () => void;
  onMuteClick: () => void;
  onFocusButtonClick: () => void;
  onPauseClick?: () => void;
  translations?: Pick<
    SimulationTranslations,
    "mute" | "unmute" | "pause" | "resume" | "focus" | "focused" | "endSession"
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
  showFocusButton: boolean;
  onFocusButtonClick: () => void;
  isPaused?: boolean;
  pausedOffsetMs?: number;
  onPauseClick?: () => void;
  translations?: SimulationTranslations;
}

export enum ChecklistMode {
  GUIDED = "GUIDED",
  UNGUIDED = "UNGUIDED",
  LIST = "LIST",
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
