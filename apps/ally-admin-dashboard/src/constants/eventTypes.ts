import { EventType } from "@components/event-type-selection-dialog";

/**
 * Frontend event type constants
 * These match the EventType union type values
 */
export const FRONTEND_EVENT_TYPES = {
  SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY" as EventType,
  TIME_BASED: "TIME_BASED" as EventType,
  SCORE_BASED: "SCORE_BASED" as EventType,
  COMBINATION: "COMBINATION" as EventType,
} as const;

