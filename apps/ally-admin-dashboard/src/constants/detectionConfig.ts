/**
 * Constants for Event Detection Config
 * Centralizes all detection config related constants
 */

export const DETECTION_CONFIG_FIELDS = {
  MAX_OCCURRENCES: "maxOccurrences",
  MIN_GAP_TIME: "minGapTime",
  START_TIME: "startTime",
  END_TIME: "endTime",
  MIN_SCORE: "minScore",
  MAX_SCORE: "maxScore",
  MIN_TRIGGER_COUNT: "minTriggerCount",
} as const;

export type DetectionConfigField =
  (typeof DETECTION_CONFIG_FIELDS)[keyof typeof DETECTION_CONFIG_FIELDS];

/**
 * Array of all detection config field IDs for easy iteration
 */
export const DETECTION_CONFIG_FIELD_IDS = Object.values(DETECTION_CONFIG_FIELDS);

/**
 * Time-based detection config fields
 */
export const TIME_BASED_CONFIG_FIELDS = [
  DETECTION_CONFIG_FIELDS.START_TIME,
  DETECTION_CONFIG_FIELDS.END_TIME,
  DETECTION_CONFIG_FIELDS.MIN_GAP_TIME,
] as const;

/**
 * Score-based detection config fields
 */
export const SCORE_BASED_CONFIG_FIELDS = [
  DETECTION_CONFIG_FIELDS.MIN_SCORE,
  DETECTION_CONFIG_FIELDS.MAX_SCORE,
] as const;

/**
 * Occurrence-based detection config fields
 */
export const OCCURRENCE_BASED_CONFIG_FIELDS = [
  DETECTION_CONFIG_FIELDS.MAX_OCCURRENCES,
  DETECTION_CONFIG_FIELDS.MIN_GAP_TIME,
  DETECTION_CONFIG_FIELDS.MIN_TRIGGER_COUNT,
] as const;

/**
 * Default values for detection config fields
 */
export const DETECTION_CONFIG_DEFAULTS = {
  [DETECTION_CONFIG_FIELDS.MAX_OCCURRENCES]: 1,
  [DETECTION_CONFIG_FIELDS.MIN_GAP_TIME]: "00:00:00",
  [DETECTION_CONFIG_FIELDS.START_TIME]: "00:00:00",
  [DETECTION_CONFIG_FIELDS.END_TIME]: null,
  [DETECTION_CONFIG_FIELDS.MIN_SCORE]: null,
  [DETECTION_CONFIG_FIELDS.MAX_SCORE]: null,
} as const;

/**
 * Infinity display values for nullable fields
 */
export const INFINITY_DISPLAY = {
  [DETECTION_CONFIG_FIELDS.END_TIME]: "∞",
  [DETECTION_CONFIG_FIELDS.MIN_SCORE]: "-∞",
  [DETECTION_CONFIG_FIELDS.MAX_SCORE]: "+∞",
} as const;
