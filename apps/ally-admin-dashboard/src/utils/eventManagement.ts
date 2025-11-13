import {
  SessionEvent,
  SessionEventDetectionData,
  SessionEventDetectionType,
  SessionEventDetectionCondition,
} from "@types";
import { UpdateEventDataParam } from "@types";
import { convertTimeToSeconds } from "@utils/common";

/**
 * Maps frontend operator to backend condition
 * @param operator - Frontend operator (e.g., "LESS_THAN", "GREATER_THAN")
 * @returns Backend condition (e.g., "LT", "GT")
 */
export const mapOperatorToCondition = (
  operator: string | undefined,
): SessionEventDetectionCondition | undefined => {
  if (!operator) return undefined;

  const mapping: Record<string, SessionEventDetectionCondition> = {
    LESS_THAN: SessionEventDetectionCondition.LT,
    GREATER_THAN: SessionEventDetectionCondition.GT,
    EQUAL: SessionEventDetectionCondition.EQ,
    LESS_THAN_OR_EQUAL: SessionEventDetectionCondition.LTE,
    GREATER_THAN_OR_EQUAL: SessionEventDetectionCondition.GTE,
  };

  return mapping[operator];
};

/**
 * Maps frontend detection type string to backend detection type enum
 * @param detectionType - Frontend detection type (e.g., "TIME_BASED", "SCORE_BASED")
 * @returns Backend detection type enum value
 */
const mapDetectionTypeToBackend = (detectionType: string | undefined): string | undefined => {
  if (!detectionType) return undefined;

  const mapping: Record<string, string> = {
    TIME_BASED: SessionEventDetectionType.TIME,
    SCORE_BASED: SessionEventDetectionType.SCORE,
    SENTENCE_SIMILARITY: SessionEventDetectionType.SENTENCE_SIMILARITY,
    SEMANTIC_SIMILARITY: SessionEventDetectionType.SEMANTIC_SIMILARITY,
    COMBINATION: SessionEventDetectionType.COMBINATION,
  };

  return mapping[detectionType] || detectionType;
};

/**
 * Converts UpdateEventDataParam to the expected API payload format (SessionEvent)
 * @param event - Event data from the frontend
 * @returns Formatted SessionEvent payload for the API, or null if COMBINATION event
 */
export const convertEventToApiPayload = (event: UpdateEventDataParam): SessionEvent | null => {
  // Block API calls for COMBINATION events for now
  if (
    event.detectionType === "COMBINATION" ||
    event.detectionType === SessionEventDetectionType.COMBINATION
  ) {
    return null;
  }

  // Map frontend detection type to backend format
  const backendDetectionType = mapDetectionTypeToBackend(event.detectionType);

  // Build detectionData based on event type - only include relevant fields
  const detectionData: SessionEventDetectionData = {};

  // For SENTENCE_SIMILARITY or SEMANTIC_SIMILARITY: only include sentences
  if (
    event.detectionType === "SENTENCE_SIMILARITY" ||
    event.detectionType === SessionEventDetectionType.SENTENCE_SIMILARITY ||
    event.detectionType === "SEMANTIC_SIMILARITY" ||
    event.detectionType === SessionEventDetectionType.SEMANTIC_SIMILARITY
  ) {
    if (event.sentences && event.sentences.length > 0) {
      detectionData.sentences = event.sentences;
    }
  }

  // For SCORE_BASED: only include score and condition
  if (
    event.detectionType === "SCORE_BASED" ||
    event.detectionType === SessionEventDetectionType.SCORE
  ) {
    if (
      event.triggerCondition &&
      "value" in event.triggerCondition &&
      typeof event.triggerCondition.value === "number"
    ) {
      detectionData.score = event.triggerCondition.value;
    }
    // Include condition if operator exists
    if (event.triggerCondition && "operator" in event.triggerCondition) {
      const condition = mapOperatorToCondition(event.triggerCondition.operator);
      if (condition) {
        detectionData.condition = condition;
      }
    }
  }

  // For TIME_BASED: only include time (in seconds) and condition
  if (
    event.detectionType === "TIME_BASED" ||
    event.detectionType === SessionEventDetectionType.TIME
  ) {
    if (
      event.triggerCondition &&
      "value" in event.triggerCondition &&
      typeof event.triggerCondition.value === "string"
    ) {
      detectionData.time = convertTimeToSeconds(event.triggerCondition.value);
    }
    // Include condition if operator exists
    if (event.triggerCondition && "operator" in event.triggerCondition) {
      const condition = mapOperatorToCondition(event.triggerCondition.operator);
      if (condition) {
        detectionData.condition = condition;
      }
    }
  }

  // Build the SessionEvent payload
  const payload: SessionEvent = {
    name: event.name || "",
    description: event.description || "",
    score: Number.isInteger(event.score) ? event.score : 0,
    emoji: event.emoji || "",
    message: event.message || "",
    branchInstruction: event.branchInstruction || "",
    detectionType: backendDetectionType,
    visibilityType: event.visibilityType || "",
  };

  // Add speaker if present (for sentence similarity events)
  if (event.speaker) {
    payload.speaker = event.speaker;
  }

  // Only add detectionData if it has content
  if (Object.keys(detectionData).length > 0) {
    payload.detectionData = detectionData;
  }

  // Include id if present (for updates)
  if (event.id) {
    payload.id = event.id;
  }

  return payload;
};
