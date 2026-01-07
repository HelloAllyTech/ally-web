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
 * Event status constants
 */
export const EVENT_STATUS = {
  OCCURRED: "OCCURRED" as const,
  NOT_OCCURRED: "NOT_OCCURRED" as const,
} as const;

/**
 * Combination operator
 */
export type CombinationOperator = "AND" | "OR";

/**
 * Combination operator constants
 */
export const COMBINATION_OPERATOR = {
  AND: "AND" as const,
  OR: "OR" as const,
} as const;

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
  type?: CombinationOperator | "NOT";
  id?: string; // Event ID (present when this is a leaf node)
  name?: string;
  left?: CombinationExpressionNode;
  right?: CombinationExpressionNode;
}
export interface BinaryClassificationTriggerCondition {
  className: string;
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
  | CombinationTriggerCondition
  | BinaryClassificationTriggerCondition;

/**
 * Type guard to check if a condition is a combination trigger condition
 */
export function isCombinationTriggerCondition(
  condition: any,
): condition is CombinationTriggerCondition {
  return condition && "expression" in condition && typeof condition.expression === "object";
}
