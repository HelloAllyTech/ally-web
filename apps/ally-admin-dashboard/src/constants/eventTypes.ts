import { EventType } from "@components";

/**
 * Event detection type constants
 */
export const EVENT_DETECTION_TYPES = {
  SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY" as EventType,
  TIME_BASED: "TIME_BASED" as EventType,
  SCORE_BASED: "SCORE_BASED" as EventType,
  COMBINATION: "COMBINATION" as EventType,
  SEMANTIC_SIMILARITY: "SEMANTIC_SIMILARITY" as EventType,
  BINARY_CLASSIFICATION: "BINARY_CLASSIFICATION" as EventType,
} as const;
