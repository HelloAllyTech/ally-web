export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
}

export enum FeedbackSectionType {
  BULLET_TEXT = "BULLET_TEXT",
  TABLE = "TABLE",
}

export interface SimulationCredits {
  consumedCredits: number;
  creditLimit: number;
  secondsAllowedPerCredit: number;
}
