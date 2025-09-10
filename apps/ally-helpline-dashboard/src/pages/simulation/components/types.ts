import { Track, TrackPublication } from "livekit-client";

import { RoomStatus } from "@types";

export interface SimulationControlsProps {
  isEndSessionDisabled: boolean;
  isMuted: boolean;
  onEndSessionClick: () => void;
  onMuteClick: () => void;
}

export interface CircleConfig {
  scale: number;
  isStatic: boolean;
}

export interface CircleProps {
  circleNumber: number;
  config: CircleConfig;
  audioLevel: number;
}

export interface AudioTrackRef {
  participant: any;
  source: Track.Source;
  publication?: TrackPublication;
}

export interface SimulationInterfaceProps {
  roomStatus: RoomStatus;
}

export interface SimulationTimerProps {
  isWarning: boolean;
  onTimeLimit: () => void;
  onWarning: () => void;
  startTime: string;
  timeLimit?: number;
}

export interface SimulationScoreMeterProps {
  score?: number;
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
