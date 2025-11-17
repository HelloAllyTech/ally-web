import {
  SessionEvent,
  SessionEventDetectionData,
  SessionEventDetectionType,
  SessionEventDetectionCondition,
} from "@types";
import { UpdateEventDataParam } from "@types";
import { convertTimeToSeconds, convertSecondsToTimeString } from "@utils/common";

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

  // For SENTENCE_SIMILARITY or SEMANTIC_SIMILARITY: get sentences from triggerCondition
  if (
    event.detectionType === "SENTENCE_SIMILARITY" ||
    event.detectionType === SessionEventDetectionType.SENTENCE_SIMILARITY ||
    event.detectionType === "SEMANTIC_SIMILARITY" ||
    event.detectionType === SessionEventDetectionType.SEMANTIC_SIMILARITY
  ) {
    if (
      event.triggerCondition &&
      "sentences" in event.triggerCondition &&
      Array.isArray(event.triggerCondition.sentences) &&
      event.triggerCondition.sentences.length > 0
    ) {
      detectionData.sentences = event.triggerCondition.sentences;
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

  //Add speaker if present (only for sentence/semantic similarity events)
  // if (
  //   event.triggerCondition &&
  //   "speaker" in event.triggerCondition &&
  //   event.triggerCondition.speaker
  // ) {
  //   payload.speaker = event.triggerCondition.speaker;
  // }

  //TO-DO(pass speaker only for sentence and semantic similarity events)
  payload.speaker = "CARE_GIVER";

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

/**
 * Maps backend condition to frontend operator
 * @param condition - Backend condition (e.g., "LT", "GT")
 * @returns Frontend operator (e.g., "LESS_THAN", "GREATER_THAN")
 */
const mapConditionToOperator = (condition: string | undefined): string | undefined => {
  if (!condition) return undefined;

  const mapping: Record<string, string> = {
    [SessionEventDetectionCondition.LT]: "LESS_THAN",
    [SessionEventDetectionCondition.GT]: "GREATER_THAN",
    [SessionEventDetectionCondition.EQ]: "EQUAL",
    [SessionEventDetectionCondition.LTE]: "LESS_THAN_OR_EQUAL",
    [SessionEventDetectionCondition.GTE]: "GREATER_THAN_OR_EQUAL",
  };

  return mapping[condition];
};

/**
 * Maps backend detection type to frontend detection type string
 * @param detectionType - Backend detection type (e.g., "TIME", "SCORE")
 * @returns Frontend detection type (e.g., "TIME_BASED", "SCORE_BASED")
 */
const mapDetectionTypeToFrontend = (detectionType: string | undefined): string | undefined => {
  if (!detectionType) return undefined;

  const mapping: Record<string, string> = {
    [SessionEventDetectionType.TIME]: "TIME_BASED",
    [SessionEventDetectionType.SCORE]: "SCORE_BASED",
    [SessionEventDetectionType.SENTENCE_SIMILARITY]: "SENTENCE_SIMILARITY",
    [SessionEventDetectionType.SEMANTIC_SIMILARITY]: "SEMANTIC_SIMILARITY",
    [SessionEventDetectionType.COMBINATION]: "COMBINATION",
  };

  return mapping[detectionType] || detectionType;
};

/**
 * Converts API response (SessionEvent) to frontend format (UpdateEventDataParam)
 * @param apiEvent - Event data from the API
 * @returns Formatted UpdateEventDataParam for the frontend
 */
export const convertApiResponseToEvent = (apiEvent: SessionEvent): UpdateEventDataParam => {
  // Map backend detection type to frontend format
  const frontendDetectionType = mapDetectionTypeToFrontend(apiEvent.detectionType);

  // Convert detectionData to triggerCondition format
  let triggerCondition: any;

  const detectionData = apiEvent.detectionData;

  if (detectionData) {
    if (frontendDetectionType === "TIME_BASED") {
      // Convert time from seconds to HH:MM:SS format
      const timeString = convertSecondsToTimeString(detectionData.time);
      const operator = mapConditionToOperator(detectionData.condition);
      triggerCondition = {
        operator: operator || "LESS_THAN",
        value: timeString,
      };
    } else if (frontendDetectionType === "SCORE_BASED") {
      const operator = mapConditionToOperator(detectionData.condition);
      triggerCondition = {
        operator: operator || "GREATER_THAN",
        value: detectionData.score || 0,
        speaker: apiEvent.speaker,
      };
    } else if (
      frontendDetectionType === "SENTENCE_SIMILARITY" ||
      frontendDetectionType === "SEMANTIC_SIMILARITY"
    ) {
      // For sentence similarity, triggerCondition contains speaker and sentences
      triggerCondition = {
        speaker: apiEvent.speaker || "CARE_GIVER",
        sentences: detectionData.sentences || [],
      };
    } else if (frontendDetectionType === "COMBINATION") {
      // Combination events have conditions array
      triggerCondition = {
        conditions: [],
      };
    }
  }

  return {
    id: apiEvent.id,
    name: apiEvent.name || "",
    description: apiEvent.description || "",
    score: apiEvent.score ?? 0,
    emoji: apiEvent.emoji || "",
    message: apiEvent.message || "",
    branchInstruction: apiEvent.branchInstruction || "",
    detectionType: frontendDetectionType,
    visibilityType: apiEvent.visibilityType || "",
    triggerCondition,
  };
};
