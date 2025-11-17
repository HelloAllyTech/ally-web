/**
 * Trigger Condition Types
 *
 * This file defines a type-safe structure for trigger conditions that mirrors
 * the backend's detectionData concept but is adapted for frontend use.
 *
 */

/**
 * Common operator types for comparison operations
 */
export type ComparisonOperator =
  | "LESS_THAN"
  | "GREATER_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "GREATER_THAN_OR_EQUAL"
  | "EQUAL";

/**
 * Speaker types
 */
export type Speaker = "CARE_GIVER";

/**
 * Event status for combination events
 */
export type EventStatus = "OCCURRED" | "NOT_OCCURRED";

/**
 * Combination operator
 */
export type CombinationOperator = "AND" | "OR";

/**
 * Time-based trigger condition
 * Contains: operator and time value in HH:MM:SS format
 */
export interface TimeBasedTriggerCondition {
  operator: ComparisonOperator;
  value: string; // Time in HH:MM:SS format (e.g., "00:20:00")
}

/**
 * Score-based trigger condition
 * Contains: operator, score value, and optional speaker
 */
export interface ScoreBasedTriggerCondition {
  operator: ComparisonOperator;
  value: number; // Score value
}

/**
 * Sentence similarity trigger condition
 * Contains: speaker and array of sentences to match
 */
export interface SentenceSimilarityTriggerCondition {
  speaker: Speaker;
  sentences: string[];
}

/**
 * Single condition in a combination event
 */
export interface CombinationConditionItem {
  eventId: string;
  status: EventStatus;
  operator?: CombinationOperator; // Present for 2nd+ conditions
}

/**
 * Combination trigger condition
 * Contains: array of event conditions (max 2)
 */
export interface CombinationTriggerCondition {
  conditions: CombinationConditionItem[];
}

export type TriggerCondition =
  | TimeBasedTriggerCondition
  | ScoreBasedTriggerCondition
  | SentenceSimilarityTriggerCondition
  | CombinationTriggerCondition;

/**
 * Type guards to check trigger condition types
 */
export function isTimeBasedTriggerCondition(
  condition: any,
): condition is TimeBasedTriggerCondition {
  return condition && "operator" in condition && typeof condition.value === "string";
}

export function isScoreBasedTriggerCondition(
  condition: any,
): condition is ScoreBasedTriggerCondition {
  return condition && "operator" in condition && typeof condition.value === "number";
}

export function isSentenceSimilarityTriggerCondition(
  condition: any,
): condition is SentenceSimilarityTriggerCondition {
  return condition && "sentences" in condition && "speaker" in condition;
}

export function isCombinationTriggerCondition(
  condition: any,
): condition is CombinationTriggerCondition {
  return condition && "conditions" in condition && Array.isArray(condition.conditions);
}

/**
 * Helper to create default trigger condition based on event type
 */
export function createDefaultTriggerCondition(
  eventType: string | undefined,
): TriggerCondition | undefined {
  switch (eventType) {
    case "TIME_BASED":
      return {
        operator: "LESS_THAN",
        value: "00:20:00",
      };
    case "SCORE_BASED":
      return {
        operator: "GREATER_THAN",
        value: 0,
      };
    case "SENTENCE_SIMILARITY":
    case "SEMANTIC_SIMILARITY":
      return {
        speaker: "CARE_GIVER",
        sentences: [],
      };
    case "COMBINATION":
      return {
        conditions: [
          { eventId: "", status: "OCCURRED" },
          { eventId: "", status: "OCCURRED", operator: "AND" },
        ],
      };
    default:
      return undefined;
  }
}

/**
 * Helper to validate trigger condition matches event type
 */
export function validateTriggerCondition(
  eventType: string,
  condition: TriggerCondition | undefined,
): boolean {
  if (!condition) return false;

  switch (eventType) {
    case "TIME_BASED":
      return isTimeBasedTriggerCondition(condition);
    case "SCORE_BASED":
      return isScoreBasedTriggerCondition(condition);
    case "SENTENCE_SIMILARITY":
    case "SEMANTIC_SIMILARITY":
      return isSentenceSimilarityTriggerCondition(condition);
    case "COMBINATION":
      return isCombinationTriggerCondition(condition);
    default:
      return false;
  }
}
