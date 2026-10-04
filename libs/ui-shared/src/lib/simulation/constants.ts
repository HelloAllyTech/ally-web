import { DifficultyLevel, StateScoreConfig } from "./types";

export const STATE_COLORS = {
  active: "#10B981",
  completed: "#10B981",
  inactive: "#4B5563",
};

export const DIFFICULTY_STATE_SCORE_MAP: Record<DifficultyLevel, StateScoreConfig[]> = {
  [DifficultyLevel.EASY]: [
    { stateId: "1", scoreRange: { max: -50 } },
    { stateId: "2", scoreRange: { min: -50, max: 20 } },
    { stateId: "3", scoreRange: { min: 20, max: 70 } },
    { stateId: "4", scoreRange: { min: 70 } },
  ],
  [DifficultyLevel.MEDIUM]: [
    { stateId: "1", scoreRange: { max: -20 } },
    { stateId: "2", scoreRange: { min: -20, max: 50 } },
    { stateId: "3", scoreRange: { min: 50, max: 100 } },
    { stateId: "4", scoreRange: { min: 100 } },
  ],
  [DifficultyLevel.HARD]: [
    { stateId: "1", scoreRange: { max: -10 } },
    { stateId: "2", scoreRange: { min: -10, max: 100 } },
    { stateId: "3", scoreRange: { min: 100, max: 200 } },
    { stateId: "4", scoreRange: { min: 200 } },
  ],
};

/**
 * How a roleplay is conducted, as ally-be's start/preview responses and the
 * session record spell it. VOICE is the default and what an absent value
 * means; TEXT is a text-chat roleplay (same room, audio off).
 */
export const INTERACTION_MODE = {
  VOICE: "VOICE",
  TEXT: "TEXT",
} as const;

export type InteractionMode = (typeof INTERACTION_MODE)[keyof typeof INTERACTION_MODE];

/** True only for an explicit TEXT; anything else is a voice session. */
export const isTextChatSession = (roomData?: { interactionMode?: string } | null): boolean =>
  roomData?.interactionMode === INTERACTION_MODE.TEXT;
