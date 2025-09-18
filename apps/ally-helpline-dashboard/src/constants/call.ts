export enum CallType {
  WEBRTC_CHAT = "WEBRTC_CHAT",
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
  EXOTEL_CONFERENCE_CHAT = "EXOTEL_CONFERENCE_CHAT",
}

export enum CallProvider {
  WEBRTC = "WEBRTC",
  MICROPHONE = "MICROPHONE",
  EXOTEL_CONFERENCE_CALL = "EXOTEL_CONFERENCE_CALL",
  OZONETEL = "OZONETEL",
}

export const CloudTelephonyList = [CallProvider.EXOTEL_CONFERENCE_CALL, CallProvider.OZONETEL];

export const CallSummaryGenerationData = {
  durationInSeconds: 2503, // 41 mins 43 secs
  summaryGenerationDurationInSeconds: 178, // 2 mins 58 secs
};
