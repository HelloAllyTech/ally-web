export enum CallType {
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
}

export enum CallProvider {
  MICROPHONE = "MICROPHONE",
  OZONETEL = "OZONETEL",
  AUDIO_UPLOAD = "AUDIO_UPLOAD",
}

export const CloudTelephonyList = [CallProvider.OZONETEL];

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
};
