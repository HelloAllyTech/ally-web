/**
 * Trigger Conditions Configuration
 * This configuration file defines the structure and fields for each event type's trigger conditions.
 
 * HOW TO ADD A NEW EVENT TYPE:
 * 1. Add the event type to the EventType union in the types file
 * 2. Create a new configuration object in TRIGGER_CONDITION_CONFIGS with:
 *    - id: The event type identifier
 *    - label: Display label for the event type
 *    - fields: Array of field configurations defining the inputs
 * 3. Each field should have:
 *    - id: Field identifier (maps to triggerCondition property)
 *    - label: Display label (optional)
 *    - type: Field type (maps to a renderer component)
 *    - options: Options for dropdown fields (if applicable)
 *    - placeholder: Placeholder text (if applicable)
 *    - defaultValue: Default value for the field
 * 4. Create or reuse a field renderer component if needed
 * 
 * HOW THE DYNAMIC RENDERING SYSTEM WORKS:
 * - The TriggerConditions component receives an eventType prop
 * - It looks up the configuration for that event type
 * - For each field in the configuration, it maps the field.type to a renderer component
 * - The renderer component receives the field config, value, and onChange handler
 * - This eliminates the need for if(eventType === ...) blocks
 */

import { EventType } from "@components/event-type-selection-dialog";

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
  { value: "GREATER_THAN", label: "Greater than" },
];

/**
 * Status options for event status fields
 */
export const STATUS_OPTIONS = [
  { value: "OCCURRED", label: "Occurred" },
  { value: "NOT_OCCURRED", label: "Not Occurred" },
];

/**
 * Combination operator options (AND/OR)
 */
export const COMBINATION_OPERATOR_OPTIONS = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
];

/**
 * Score type options
 */
export const SCORE_TYPE_OPTIONS = [{ value: "SCORE", label: "Score" }];

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
      defaultValue: "LESS_THAN",
    },
    {
      id: "value",
      label: "Time",
      type: TRIGGER_FIELD_TYPES.TIME,
      placeholder: "00:20:00",
      defaultValue: "00:20:00",
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
      id: "score",
      label: "Score Type",
      type: TRIGGER_FIELD_TYPES.SELECT,
      options: SCORE_TYPE_OPTIONS,
      defaultValue: "SCORE",
    },
    {
      id: "operator",
      label: "Operator",
      type: TRIGGER_FIELD_TYPES.OPERATOR_DROPDOWN,
      options: OPERATOR_OPTIONS,
      placeholder: "Greater than",
      defaultValue: "GREATER_THAN",
    },
    {
      id: "value",
      label: "Value",
      type: TRIGGER_FIELD_TYPES.NUMBER,
      defaultValue: 0,
    },
  ],
};

/**
 * Configuration for SENTENCE_SIMILARITY event type
 * Renders: "if [speaker] says [multiline textarea]"
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
      defaultValue: "CARE_GIVER",
      labelAfter: "says", // Text to display after this field
    },
    {
      id: "sentences",
      label: "Sentences",
      type: TRIGGER_FIELD_TYPES.MULTILINE_TEXT,
      placeholder: "Enter phrases, one per line...",
      defaultValue: [],
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
      defaultValue: "OCCURRED",
    },
    {
      id: "operator",
      label: "Combination Operator",
      type: TRIGGER_FIELD_TYPES.SELECT,
      options: COMBINATION_OPERATOR_OPTIONS,
      defaultValue: "AND",
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
  COMBINATION: COMBINATION_CONFIG,
} as const;

/**
 * Get configuration for a specific event type
 */
export const getTriggerConditionConfig = (eventType: EventType | string | undefined) => {
  if (!eventType) return null;
  return TRIGGER_CONDITION_CONFIGS[eventType as EventType] || null;
};
