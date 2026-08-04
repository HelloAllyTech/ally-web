/**
 * Trigger Conditions Configuration
 * This configuration file defines the structure and fields for each event type's trigger conditions.
 *
 * HOW TO ADD A NEW EVENT TYPE:
 * 1. Add the event type to the EventType union in the types file
 * 2. Create a new configuration object in TRIGGER_CONDITION_CONFIGS with:
 *    - id: The event type identifier
 *    - label: Display label for the event type
 *    - fields: Array of field configurations defining the inputs
 * 3. Each field should have:
 *    - id: Field identifier (maps to triggerCondition property)
 *    - label: Display label (optional)
 *    - type: Field type (must match a value in TRIGGER_FIELD_TYPES)
 *    - options: Options for dropdown fields (if applicable)
 *    - placeholder: Placeholder text (if applicable)
 *    - defaultValue: Default value for the field
 *    - className: CSS classes for the field (optional)
 *    - labelAfter: Text to display after the field (optional)
 * 4. Ensure the field type is handled in TriggerConditionField component's switch statement
 *
 * HOW THE DYNAMIC RENDERING SYSTEM WORKS:
 * - The TriggerConditions component receives an eventType prop and routes to:
 *   - StandardTriggerConditions: For TIME_BASED, SCORE_BASED, SENTENCE_SIMILARITY event types
 *   - CombinationTriggerConditions: For COMBINATION event type (uses config partially)
 *
 * - StandardTriggerConditions:
 *   - Uses getTriggerConditionConfig(eventType) to get the configuration
 *   - Maps over config.fields and renders TriggerConditionField for each field
 *   - TriggerConditionField maps field.type to renderer components via a switch statement
 *
 * - CombinationTriggerConditions:
 *   - Uses getTriggerConditionConfig("COMBINATION") to get field options/placeholders
 *   - Has custom rendering logic for the expression tree structure
 *   - Does not use the full dynamic field rendering system
 *
 * - Field type to component mapping happens in TriggerConditionField component
 * - This system reduces the need for if(eventType === ...) blocks in most cases
 */

import { EventType } from "@components/event-type-selection-dialog";

import { EVENT_STATUS, COMBINATION_OPERATOR } from "../types/triggerConditions";

/**
 * Field types that can be used in trigger condition configurations
 */
export const TRIGGER_FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  TIME: "time",
  SELECT: "select",
  SEARCHABLE_DROPDOWN: "searchable_dropdown",
  MULTILINE_TEXT: "multiline_text",
  OPERATOR_DROPDOWN: "operator_dropdown",
  SPEAKER_DROPDOWN: "speaker_dropdown",
  STATUS_DROPDOWN: "status_dropdown",
  EVENT_DROPDOWN: "event_dropdown",
} as const;

/**
 * Speaker options for speaker dropdown fields
 * Defined here to avoid circular dependency issues
 */
export const SPEAKER_OPTIONS = [{ value: "CARE_GIVER", label: "Care giver" }];

/**
 * Operator options for comparison fields
 */
export const OPERATOR_OPTIONS = [
  { value: "LESS_THAN", label: "Less than" },
  { value: "LESS_THAN_OR_EQUAL", label: "Less than or equal to" },
  { value: "GREATER_THAN", label: "Greater than" },
  { value: "GREATER_THAN_OR_EQUAL", label: "Greater than or equal to" },
  { value: "EQUAL", label: "Equal to" },
];

/**
 * Status options for event status fields
 */
export const STATUS_OPTIONS = [
  { value: EVENT_STATUS.OCCURRED, label: "Occurred" },
  { value: EVENT_STATUS.NOT_OCCURRED, label: "Not Occurred" },
];

/**
 * Combination operator options (AND/OR)
 */
export const COMBINATION_OPERATOR_OPTIONS = [
  { value: COMBINATION_OPERATOR.AND, label: "AND" },
  { value: COMBINATION_OPERATOR.OR, label: "OR" },
];

/**
 * Configuration for TIME_BASED event type
 * Renders: "if Time Less than/Greater than [time input]"
 */
const TIME_BASED_CONFIG = {
  id: "TIME_BASED" as EventType,
  label: "Time Based",
  fields: [
    {
      id: "operator",
      label: "Operator",
      type: TRIGGER_FIELD_TYPES.OPERATOR_DROPDOWN,
      options: OPERATOR_OPTIONS,
      placeholder: "Less than",
    },
    {
      id: "value",
      label: "Time",
      type: TRIGGER_FIELD_TYPES.TIME,
      placeholder: "hh:mm:ss",
    },
  ],
};

/**
 * Configuration for SCORE_BASED event type
 * Renders: "if Score Greater than/Less than [number input]"
 */
const SCORE_BASED_CONFIG = {
  id: "SCORE_BASED" as EventType,
  label: "Score Based",
  fields: [
    {
      id: "operator",
      label: "Operator",
      type: TRIGGER_FIELD_TYPES.OPERATOR_DROPDOWN,
      options: OPERATOR_OPTIONS,
      placeholder: "Greater than",
    },
    {
      id: "value",
      label: "Value",
      type: TRIGGER_FIELD_TYPES.NUMBER,
      placeholder: "-",
    },
  ],
};

/**
 * Configuration for SENTENCE_SIMILARITY event type
 * Renders: "if [speaker] says [multiline textarea]"
 *
 * @deprecated Retired from EVENT_TYPE_POPUP_OPTIONS (can no longer be
 * created). Kept here so an EXISTING event of this type still renders its
 * speaker/sentences fields when viewed/edited — removing this entry would
 * make getTriggerConditionConfig() return undefined for that event, silently
 * blanking its trigger-condition UI.
 */
const SENTENCE_SIMILARITY_CONFIG = {
  id: "SENTENCE_SIMILARITY" as EventType,
  label: "Sentence Similarity",
  fields: [
    {
      id: "speaker",
      label: "Speaker",
      type: TRIGGER_FIELD_TYPES.SPEAKER_DROPDOWN,
      options: SPEAKER_OPTIONS,
      placeholder: "Care giver",
      className: "flex-shrink-0",
      labelAfter: "Says", // Text to display after this field
    },
    {
      id: "sentences",
      label: "Sentences",
      type: TRIGGER_FIELD_TYPES.MULTILINE_TEXT,
      placeholder: "Add description",
    },
  ],
};

/**
 * Configuration for SEMANTIC_SIMILARITY event type
 * Renders: "if [speaker] Says [multiline textarea]"
 *
 * @deprecated Retired from EVENT_TYPE_POPUP_OPTIONS (can no longer be
 * created). Kept here so an EXISTING event of this type still renders its
 * speaker/sentences fields when viewed/edited — removing this entry would
 * make getTriggerConditionConfig() return undefined for that event, silently
 * blanking its trigger-condition UI.
 */
const SEMANTIC_SIMILARITY_CONFIG = {
  id: "SEMANTIC_SIMILARITY" as EventType,
  label: "Semantic Similarity",
  fields: [
    {
      id: "speaker",
      label: "Speaker",
      type: TRIGGER_FIELD_TYPES.SPEAKER_DROPDOWN,
      options: SPEAKER_OPTIONS,
      placeholder: "Care giver",
      className: "flex-shrink-0",
      labelAfter: "Says", // Text to display after this field
    },
    {
      id: "sentences",
      label: "Sentences",
      type: TRIGGER_FIELD_TYPES.MULTILINE_TEXT,
      placeholder: "Add description",
    },
  ],
};
/**
 * Configuration for BINARY_CLASSIFIER event type**/
const BINARY_CLASSIFIER_CONFIG = {
  id: "BINARY_CLASSIFIER" as EventType,
  label: "Binary Classification",
  fields: [
    {
      id: "speaker",
      label: "Speaker",
      type: TRIGGER_FIELD_TYPES.SPEAKER_DROPDOWN,
      options: SPEAKER_OPTIONS,
      placeholder: "Care giver",
      className: "flex-shrink-0",
      labelAfter: "Said something", // Text to display after this field
    },
    {
      id: "className",
      label: "className",
      type: TRIGGER_FIELD_TYPES.MULTILINE_TEXT,
      placeholder: "Add classification",
    },
  ],
};
/**
 * Configuration for COMBINATION event type
 * Renders: "if [event dropdown] has [status] AND/OR if [event dropdown] has [status]"
 * Maximum 2 conditions supported
 */
const COMBINATION_CONFIG = {
  id: "COMBINATION" as EventType,
  label: "Combination Events",
  fields: [
    {
      id: "eventId",
      label: "Event",
      type: TRIGGER_FIELD_TYPES.EVENT_DROPDOWN,
      placeholder: "Select an event",
      defaultValue: "",
    },
    {
      id: "status",
      label: "Status",
      type: TRIGGER_FIELD_TYPES.STATUS_DROPDOWN,
      options: STATUS_OPTIONS,
      placeholder: "Occurred",
      defaultValue: EVENT_STATUS.OCCURRED,
    },
    {
      id: "operator",
      label: "Combination Operator",
      type: TRIGGER_FIELD_TYPES.SELECT,
      options: COMBINATION_OPERATOR_OPTIONS,
      defaultValue: COMBINATION_OPERATOR.AND,
    },
  ],
};

/**
 * Main configuration object mapping event types to their field configurations
 */
export const TRIGGER_CONDITION_CONFIGS = {
  TIME_BASED: TIME_BASED_CONFIG,
  SCORE_BASED: SCORE_BASED_CONFIG,
  SENTENCE_SIMILARITY: SENTENCE_SIMILARITY_CONFIG,
  SEMANTIC_SIMILARITY: SEMANTIC_SIMILARITY_CONFIG,
  BINARY_CLASSIFIER: BINARY_CLASSIFIER_CONFIG,
  COMBINATION: COMBINATION_CONFIG,
} as const;

/**
 * Get configuration for a specific event type
 */
export const getTriggerConditionConfig = (eventType: EventType | string | undefined) => {
  if (!eventType) return null;
  return TRIGGER_CONDITION_CONFIGS[eventType as EventType] || null;
};
