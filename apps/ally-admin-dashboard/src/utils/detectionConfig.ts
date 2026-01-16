import { DETECTION_CONFIG_FIELDS, DETECTION_CONFIG_FIELD_IDS } from "@constants";

/**
 * Checks if a given column ID is a detection config field
 * @param columnId - The column ID to check
 * @returns true if the column ID is a detection config field
 */
export const isDetectionConfigField = (columnId: string): boolean => {
  return DETECTION_CONFIG_FIELD_IDS.includes(columnId as any);
};

/**
 * Checks if a value represents an "infinity" state (null or undefined)
 * @param value - The value to check
 * @returns true if the value is null or undefined
 */
export const isInfinityValue = (value: any): boolean => {
  return value === null || value === undefined;
};

/**
 * Checks if a value is a valid non-infinity value
 * @param value - The value to check
 * @returns true if the value is not null or undefined
 */
export const hasFiniteValue = (value: any): boolean => {
  return value !== null && value !== undefined;
};

/**
 * Gets the default value when toggling from infinity to a finite value
 * @param fieldId - The detection config field ID
 * @returns The default finite value for the field
 */
export const getDefaultFiniteValue = (fieldId: string): string | number => {
  switch (fieldId) {
    case DETECTION_CONFIG_FIELDS.END_TIME:
      return "00:01:00";
    case DETECTION_CONFIG_FIELDS.MIN_SCORE:
    case DETECTION_CONFIG_FIELDS.MAX_SCORE:
      return 0;
    default:
      return "00:00:00";
  }
};

/**
 * Toggles a detection config value between infinity (null) and a default finite value
 * @param currentValue - The current value
 * @param fieldId - The detection config field ID
 * @returns The toggled value (null if currently finite, default finite value if currently null)
 */
export const toggleInfinityValue = (currentValue: any, fieldId: string): any => {
  if (isInfinityValue(currentValue)) {
    return getDefaultFiniteValue(fieldId);
  }
  return null;
};

/**
 * Gets the infinity display text for a given field
 * @param fieldId - The detection config field ID
 * @returns The infinity symbol with appropriate sign
 */
export const getInfinityDisplay = (fieldId: string): string => {
  switch (fieldId) {
    case DETECTION_CONFIG_FIELDS.END_TIME:
    case DETECTION_CONFIG_FIELDS.MAX_OCCURRENCES:
      return "∞";
    case DETECTION_CONFIG_FIELDS.MIN_SCORE:
      return "-∞";
    case DETECTION_CONFIG_FIELDS.MAX_SCORE:
      return "+∞";
    default:
      return "∞";
  }
};

/**
 * Normalizes a detection config value for display
 * Handles null/undefined values and ensures proper formatting
 * @param value - The value to normalize
 * @param fieldId - The detection config field ID
 * @returns The normalized value or null
 */
export const normalizeDetectionConfigValue = (value: any, fieldId: string): any => {
  // Handle null/undefined
  if (isInfinityValue(value)) {
    return null;
  }

  // Handle object with nested value property (from table cell structure)
  if (typeof value === "object" && value !== null && "value" in value) {
    return normalizeDetectionConfigValue(value.value, fieldId);
  }

  return value;
};
