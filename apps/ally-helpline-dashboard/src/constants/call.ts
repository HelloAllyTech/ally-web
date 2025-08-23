export enum CallType {
  WEBRTC_CHAT = "WEBRTC_CHAT",
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
  EXOTEL_CONFERENCE_CHAT = "EXOTEL_CONFERENCE_CHAT",
}

export enum CallProvider {
  WEBRTC = "WEBRTC",
  MICROPHONE = "MICROPHONE",
  EXOTEL_CONFERENCE_CALL = "EXOTEL_CONFERENCE_CALL",
}

export const CallSummaryGenerationData = {
  durationInSeconds: 30 * 60, // 30 mins
  summaryGenerationDurationInSeconds: 5 * 60, // 10 mins
};
