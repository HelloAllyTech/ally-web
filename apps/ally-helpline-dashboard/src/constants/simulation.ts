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

export const AGENT_STATE_EVENT_TYPE = "AGENT_STATE" as const;
export const AGENT_STATE_THINKING = "thinking" as const;
export const AGENT_STATE_DONE_THINKING = "done_thinking" as const;
export const AGENT_STATE_SPEAKING = "speaking" as const;

// Live supervisor notes arrive on their own LiveKit data-channel topic so they
// can never be mistaken for scored coaching events. Must match
// SUPERVISOR_DATA_TOPIC in ally-ai-learn's app/core/supervisor/service.py.
export const SUPERVISOR_TOPIC = "supervisor" as const;
export const SUPERVISOR_NOTE_EVENT_TYPE = "supervisor.note" as const;

// Topics whose packets belong to the scored coaching-event feed. Coaching
// events are published on "events"; AGENT_STATE and the pause/resume control
// packets carry no topic at all. Anything else — the v2 "director" feed, or a
// topic added later — is dropped rather than folded into `events`, where it
// would silently contribute to the session score.
export const EVENT_FEED_TOPICS: readonly (string | undefined)[] = [undefined, "", "events"];
