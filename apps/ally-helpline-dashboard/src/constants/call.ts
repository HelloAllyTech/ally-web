export enum CallType {
  MICROPHONE_CHAT = "MICROPHONE_CHAT",
  DICTATION_MODE = "DICTATION_MODE",
  AUDIO_UPLOAD = "AUDIO_UPLOAD",
}

export enum ScribeSessionMode {
  SCRIBE = "SCRIBE",
  DICTATION = "DICTATION",
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
