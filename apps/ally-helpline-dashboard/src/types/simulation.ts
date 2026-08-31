export enum RoomStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  DISCONNECTING = "disconnecting",
  AGENT_JOINED = "agent_joined",
  /**
   * LiveKit's SDK is transparently re-establishing the connection after a
   * network blip. The session is NOT over and the learner is NOT kicked back
   * to a loading screen — but data-channel packets (supervisor hints in
   * particular) are being dropped while this lasts, so it has to be visible
   * rather than silently rendered as CONNECTED. Resolves back to
   * AGENT_JOINED/CONNECTED on RoomEvent.Reconnected.
   */
  RECONNECTING = "reconnecting",
}

export interface SimulationCredits {
  consumedCredits: number;
  creditLimit: number;
  secondsAllowedPerCredit: number;
}

export const pageType = {
  CASE: "case",
  TRACK: "track",
};
