import { Room } from "livekit-client";

import { RoomStatus } from "@types";

export interface UseLiveKitRoomReturn {
  room: Room;
  roomStatus: RoomStatus;
  error: string | null;
  startTime: Date;
  handleEndSession: () => void;
  handleRetryConnection: () => void;
}
