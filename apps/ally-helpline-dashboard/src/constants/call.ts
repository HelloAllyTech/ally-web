export enum CallType {
  WEBRTC_CHAT = "WEBRTC_CHAT",
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
  EXOTEL_CONFERENCE_CHAT = "EXOTEL_CONFERENCE_CHAT",
}

export enum CallProvider {
  MICROPHONE = "MICROPHONE",
  EXOTEL_CONFERENCE_CALL = "EXOTEL_CONFERENCE_CALL",
  OZONETEL = "OZONETEL",
  AUDIO_UPLOAD = "AUDIO_UPLOAD",
}

export const CloudTelephonyList = [CallProvider.EXOTEL_CONFERENCE_CALL, CallProvider.OZONETEL];

export const CallSummaryGenerationDataMap = {
  [CallProvider.MICROPHONE]: {
    durationInSeconds: 2503, // 41 mins 43 secs
    summaryGenerationDurationInSeconds: 178, // 2 mins 58 secs
  },
  [CallProvider.AUDIO_UPLOAD]: {
    durationInSeconds: 2503, // 41 mins 43 secs
    summaryGenerationDurationInSeconds: 178, // 2 mins 58 secs
  },
  [CallProvider.OZONETEL]: {
    durationInSeconds: 2503, // 41 mins 43 secs
    summaryGenerationDurationInSeconds: 178, // 2 mins 58 secs
  },
  [CallProvider.EXOTEL_CONFERENCE_CALL]: {
    durationInSeconds: 2503, // 41 mins 43 secs
    summaryGenerationDurationInSeconds: 178, // 2 mins 58 secs
  },
};
