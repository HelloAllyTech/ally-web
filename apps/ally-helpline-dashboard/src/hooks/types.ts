import { Room } from "livekit-client";

import { RoomStatus } from "@types";

export interface LiveKitEvent {
  version: string;
  data: {
    score: number | null;
    emoji: string;
    message: string;
  };
  timestamp: string;
}

export interface UseLiveKitRoomReturn {
  error: string | null;
  events: LiveKitEvent[];
  handleEndSession: () => void;
  handleRetryConnection: () => void;
  room: Room;
  roomStatus: RoomStatus;
  score: number;
  startTime: Date;
}
