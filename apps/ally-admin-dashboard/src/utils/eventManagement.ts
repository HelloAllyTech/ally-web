import { EVENT_DETECTION_TYPES, EVENT_CONDITION_MAP } from "@constants";
import {
  SessionEvent,
  SessionEventDetectionData,
  SessionEventDetectionType,
  SessionEventDetectionCondition,
  UpdateEventDataParam,
} from "@types";
import {
  convertTimeToSeconds,
  convertSecondsToTimeString,
  isNonEmptyArray,
  isNumber,
  isNonEmptyString,
  isNonEmptyObject,
} from "@utils";

import type { CombinationExpressionNode } from "@types";

/**
 * Maps frontend operator to backend condition
 * @param operator - Frontend operator (e.g., "LESS_THAN", "GREATER_THAN")
 * @returns Backend condition (e.g., "LT", "GT")
 */
export const mapOperatorToCondition = (
  operator?: string | undefined,
): SessionEventDetectionCondition | undefined => {
  if (!operator) return null;

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
    BINARY_CLASSIFICATION: SessionEventDetectionType.BINARY_CLASSIFIER,
    COMBINATION: SessionEventDetectionType.COMBINATION,
  };

  return mapping[detectionType] || detectionType;
};

/**
 * Extracts event ID from a combination expression node, handling NOT nodes
 * @param node - The expression node to extract event ID from
 * @returns The event ID or empty string
 */
const extractEventId = (node: CombinationExpressionNode | undefined): string => {
  if (!node) return "";
  if (node.type === "NOT") {
    return node.left?.id || "";
  }
  return node.id || "";
};

/**
 * Checks if both events are selected in a combination expression
 * @param expression - The combination expression node
 * @returns true if both left and right events have valid IDs
 */
export const areBothEventsSelected = (
  expression: CombinationExpressionNode | undefined,
): boolean => {
  if (!expression) return false;

  const leftEventId = extractEventId(expression.left);
  const rightEventId = extractEventId(expression.right);

  return (
    isNonEmptyString(leftEventId) &&
    isNonEmptyString(rightEventId) &&
    leftEventId.trim() !== "" &&
    rightEventId.trim() !== ""
  );
};

/**
 * Checks if exactly one event is selected in a combination expression
 * @param expression - The combination expression node
 * @returns true if exactly one event (left or right) has a valid ID
 */
export const isExactlyOneEventSelected = (
  expression: CombinationExpressionNode | undefined,
): boolean => {
  if (!expression) return false;

  const leftEventId = extractEventId(expression.left);
  const rightEventId = extractEventId(expression.right);

  const leftSelected = isNonEmptyString(leftEventId) && leftEventId.trim() !== "";
  const rightSelected = isNonEmptyString(rightEventId) && rightEventId.trim() !== "";

  // Exactly one is selected (XOR logic)
  return (leftSelected && !rightSelected) || (!leftSelected && rightSelected);
};

/**
 * Converts UpdateEventDataParam to the expected API payload format (SessionEvent)
 * @param event - Event data from the frontend
 * @returns Formatted SessionEvent payload for the API
 */
export const convertEventToApiPayload = (event: UpdateEventDataParam): SessionEvent | null => {
  const backendDetectionType = mapDetectionTypeToBackend(event.detectionType);

  const detectionData: SessionEventDetectionData = {};
  const { sentences, speaker, className, value, operator, expression } =
    (event?.triggerCondition as any) || {};

  if (
    event.detectionType === EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY ||
    event.detectionType === EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY
  ) {
    if (isNonEmptyObject(event.triggerCondition)) {
      if (isNonEmptyArray(sentences)) detectionData.sentences = sentences as string[];
      if (isNonEmptyString(speaker)) detectionData.speaker = speaker;
    }
  }
  if (event.detectionType === EVENT_DETECTION_TYPES.BINARY_CLASSIFICATION) {
    if (isNonEmptyObject(event.triggerCondition)) {
      if (isNonEmptyArray(className)) detectionData.className = className?.join(" ");
      if (isNonEmptyString(speaker)) detectionData.speaker = speaker;
    } else {
      detectionData.className = "";
    }
  }
  if (event.detectionType === EVENT_DETECTION_TYPES.SCORE_BASED) {
    if (isNonEmptyObject(event.triggerCondition)) {
      if (isNumber(value)) {
        detectionData.score = value;
      }
      if (isNonEmptyString(operator)) {
        const condition = mapOperatorToCondition(operator);
        if (condition) {
          detectionData.condition = condition;
        }
      }
    } else {
      detectionData.score = 0;
      detectionData.condition = SessionEventDetectionCondition.GT;
    }
  }

  if (event.detectionType === EVENT_DETECTION_TYPES.TIME_BASED) {
    if (isNonEmptyObject(event.triggerCondition)) {
      if (isNonEmptyString(value)) {
        detectionData.time = convertTimeToSeconds(value);
      }
      if (isNonEmptyString(operator)) {
        const condition = mapOperatorToCondition(operator);
        if (condition) {
          detectionData.condition = condition;
        }
      }
    } else {
      detectionData.time = 0;
      detectionData.condition = SessionEventDetectionCondition.LT;
    }
  }

  if (event.detectionType === EVENT_DETECTION_TYPES.COMBINATION) {
    if (isNonEmptyObject(expression) && areBothEventsSelected(expression)) {
      // Only include expression if both events are selected
      detectionData.expression = expression;
    }
  }

  const payload: SessionEvent = {
    name: event.name || "",
    description: event.description || "",
    score: Number.isInteger(event.score) ? event.score : 0,
    emoji: event.emoji || "",
    message: event.message || "",
    branchInstruction: event.branchInstruction || "",
    detectionType: backendDetectionType,
    visibilityType: event.visibilityType || "",
    detectionConfig: event.detectionConfig,
  };

  if (Object.keys(detectionData).length > 0) {
    payload.detectionData = detectionData;
  }

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
    [SessionEventDetectionCondition.LT]: EVENT_CONDITION_MAP.LESS_THAN,
    [SessionEventDetectionCondition.GT]: EVENT_CONDITION_MAP.GREATER_THAN,
    [SessionEventDetectionCondition.EQ]: EVENT_CONDITION_MAP.EQUAL,
    [SessionEventDetectionCondition.LTE]: EVENT_CONDITION_MAP.LESS_THAN_OR_EQUAL,
    [SessionEventDetectionCondition.GTE]: EVENT_CONDITION_MAP.GREATER_THAN_OR_EQUAL,
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
    [SessionEventDetectionType.TIME]: EVENT_DETECTION_TYPES.TIME_BASED,
    [SessionEventDetectionType.SCORE]: EVENT_DETECTION_TYPES.SCORE_BASED,
    [SessionEventDetectionType.SENTENCE_SIMILARITY]: EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY,
    [SessionEventDetectionType.SEMANTIC_SIMILARITY]: EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY,
    [SessionEventDetectionType.COMBINATION]: EVENT_DETECTION_TYPES.COMBINATION,
    [SessionEventDetectionType.BINARY_CLASSIFIER]: EVENT_DETECTION_TYPES.BINARY_CLASSIFICATION,
  };

  return mapping[detectionType] || detectionType;
};

/**
 * @param apiEvent - Event data from the API
 * @returns Formatted UpdateEventDataParam for the frontend
 */
export const convertApiResponseToEvent = (apiEvent: SessionEvent): UpdateEventDataParam => {
  // Map backend detection type to frontend format
  const frontendDetectionType = mapDetectionTypeToFrontend(apiEvent.detectionType);

  // Convert detectionData to triggerCondition format
  let triggerCondition: any = undefined;

  const detectionData = apiEvent.detectionData;

  if (detectionData) {
    if (frontendDetectionType === EVENT_DETECTION_TYPES.TIME_BASED) {
      const hasTime = detectionData.time !== undefined && detectionData.time !== null;
      const hasCondition =
        detectionData.condition !== undefined && detectionData.condition !== null;

      if (hasTime || hasCondition) {
        const operator = mapConditionToOperator(detectionData.condition);
        triggerCondition = {
          operator: operator || undefined,
          value: hasTime ? convertSecondsToTimeString(detectionData.time) : undefined,
        };
      }
    } else if (frontendDetectionType === EVENT_DETECTION_TYPES.SCORE_BASED) {
      const hasScore = detectionData.score !== undefined && detectionData.score !== null;
      const hasCondition =
        detectionData.condition !== undefined && detectionData.condition !== null;

      if (hasScore || hasCondition) {
        const operator = mapConditionToOperator(detectionData.condition);
        triggerCondition = {
          operator: operator || undefined,
          value: hasScore ? detectionData.score : undefined,
        };
      }
    } else if (
      frontendDetectionType === EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY ||
      frontendDetectionType === EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY
    ) {
      const hasSentences = detectionData.sentences && detectionData.sentences.length > 0;
      const hasSpeaker = detectionData.speaker !== undefined && detectionData.speaker !== null;

      if (hasSentences || hasSpeaker) {
        triggerCondition = {
          speaker: detectionData.speaker || undefined,
          sentences: detectionData.sentences || undefined,
        };
      }
    } else if (frontendDetectionType === EVENT_DETECTION_TYPES.BINARY_CLASSIFICATION) {
      if (detectionData.className) {
        triggerCondition = {
          className: [detectionData.className],
        };
      }
    } else if (frontendDetectionType === EVENT_DETECTION_TYPES.COMBINATION) {
      if (detectionData.expression) {
        triggerCondition = {
          expression: detectionData.expression,
        };
      }
    }
  }

  return {
    id: apiEvent.id,
    name: apiEvent.name || "",
    eventCode: apiEvent.eventCode || "",
    description: apiEvent.description || "",
    score: apiEvent.score ?? 0,
    emoji: apiEvent.emoji || "",
    message: apiEvent.message || "",
    branchInstruction: apiEvent.branchInstruction || "",
    detectionType: frontendDetectionType,
    visibilityType: apiEvent.visibilityType || "",
    triggerCondition,
    detectionConfig: apiEvent.detectionConfig,
  };
};
