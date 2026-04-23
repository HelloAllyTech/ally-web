import { Room } from "livekit-client";

import { RoomStatus } from "@types";

export type AgentTurnStatus = "thinking" | "speaking" | "user_turn";

export interface LiveKitEvent {
  version: string;
  type?: string;
  state?: string;
  data: {
    score: number | null;
    emoji: string;
    message: string;
    detected_event_ids: string[];
  };
  timestamp: string;
}

export interface UseLiveKitRoomReturn {
  error: string | null;
  events: LiveKitEvent[];
  handleRetryConnection: () => void;
  room: Room;
  roomStatus: RoomStatus;
  score: number;
  startTime: Date;
  roomData: any;
  detectedEventIds: string[];
  agentTurnStatus: AgentTurnStatus;
}
