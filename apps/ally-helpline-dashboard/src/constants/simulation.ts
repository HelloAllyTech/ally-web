import type { RoomOptions } from "livekit-client";

export const LIVEKIT_CONFIG: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [],
  },
  disconnectOnPageLeave: false,
};

export const audioLevelConfig = {
  fftSize: 256,
  normalizationFactor: 128,
  threshold: 0.01,
} as const;

export const SIMULATON_BENCHMARK_SCORE = 50;

export const AUTO_CLOSE_DIALOG_DURATION = 5000;
