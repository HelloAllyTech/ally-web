export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
}

export interface SimulationCredits {
  consumedCredits: number;
  creditLimit: number;
  secondsAllowedPerCredit: number;
}
