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
 * Expression node for combination events
 * Matches the backend API structure directly for better readability and no conversion needed
 *
 * Examples:
 * - Single event: { id: "event-1" }
 * - NOT event: { type: "NOT", left: { id: "event-1" } }
 * - Two events with AND: { type: "AND", left: { id: "event-1" }, right: { id: "event-2" } }
 * - Complex: { type: "AND", left: { id: "event-1" }, right: { type: "NOT", left: { id: "event-2" } } }
 */
export interface CombinationExpressionNode {
  type?: "AND" | "OR" | "NOT";
  id?: string; // Event ID (present when this is a leaf node)
  left?: CombinationExpressionNode;
  right?: CombinationExpressionNode;
}

/**
 * Combination trigger condition
 * Uses expression tree format to match backend API structure directly
 */
export interface CombinationTriggerCondition {
  expression: CombinationExpressionNode;
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
  return condition && "expression" in condition && typeof condition.expression === "object";
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
      return { expression: null };
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
