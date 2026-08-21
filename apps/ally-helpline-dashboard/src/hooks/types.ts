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

/**
 * One live supervisor note, as published by ally-ai-learn on the "supervisor"
 * data-channel topic. `seq` is 1-based per session and is what the client
 * de-duplicates on, since LiveKit can redeliver a reliable packet.
 */
export interface SupervisorNote {
  note: string;
  seq: number;
  turn_index?: number;
  timestamp?: string;
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
  supervisorNotes: SupervisorNote[];
}
