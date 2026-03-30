/**
 * Type definitions for Event Detection Config
 */

import { DETECTION_CONFIG_FIELDS } from "@constants";

/**
 * Type-safe detection config field keys
 */
export type DetectionConfigFieldKey =
  (typeof DETECTION_CONFIG_FIELDS)[keyof typeof DETECTION_CONFIG_FIELDS];

/**
 * Detection config with proper typing
 */
export interface EventDetectionConfig {
  [DETECTION_CONFIG_FIELDS.START_TIME]?: string | number | null;
  [DETECTION_CONFIG_FIELDS.END_TIME]?: string | number | null;
  [DETECTION_CONFIG_FIELDS.MAX_OCCURRENCES]?: number;
  [DETECTION_CONFIG_FIELDS.MIN_GAP_TIME]?: string | number | null;
  [DETECTION_CONFIG_FIELDS.MIN_SCORE]?: number | null;
  [DETECTION_CONFIG_FIELDS.MAX_SCORE]?: number | null;
  [DETECTION_CONFIG_FIELDS.MIN_TRIGGER_COUNT]?: number;
}

/**
 * Helper type for detection config update handlers
 */
export type DetectionConfigUpdateHandler<T = any> = (value: T) => void;

/**
 * Props for components that handle detection config updates
 */
export interface DetectionConfigHandlers {
  onMaxOccurrencesChange?: DetectionConfigUpdateHandler<number>;
  onMinGapTimeChange?: DetectionConfigUpdateHandler<string>;
  onStartTimeChange?: DetectionConfigUpdateHandler<string>;
  onEndTimeChange?: DetectionConfigUpdateHandler<string | null>;
  onMinScoreChange?: DetectionConfigUpdateHandler<number | null>;
  onMaxScoreChange?: DetectionConfigUpdateHandler<number | null>;
}
