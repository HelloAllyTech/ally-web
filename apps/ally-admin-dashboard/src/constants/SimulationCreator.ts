import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { cellTypes } from "@components";
import { CreatorFieldGroups, FormFieldConfig } from "@types";

export const minInputHeight = {
  narrativeContext: "250",
};

export const DEFAULT_SIMULATION_STATUS_OPTIONS = [
  { id: "ACTIVE", label: "Published" },
  { id: "ARCHIVED", label: "Archived" },
  { id: "DRAFT", label: "Draft" },
];

export const EVENT_TYPE_OPTIONS = [
  { value: "TIME_BASED", label: "Time Based" },
  { value: "SCORE_BASED", label: "Score Based" },
  { value: "SENTENCE_SIMILARITY", label: "Sentence Similarity" },
  { value: "SEMANTIC_SIMILARITY", label: "Semantic Similarity" },
  { value: "COMBINATION", label: "Combination" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

export const GENDER_IDENTITY_OPTIONS = [
  { value: "Agender", label: "Agender" },
  { value: "Female/Woman", label: "Female/Woman" },
  { value: "Genderqueer", label: "Genderqueer" },
  { value: "Gender Fluid", label: "Gender Fluid" },
  { value: "Gender Non-Conforming", label: "Gender Non-Conforming" },
  { value: "Intergender", label: "Intergender" },
  { value: "Intersex", label: "Intersex" },
  { value: "Male/Man", label: "Male/Man" },
  { value: "Nonbinary", label: "Nonbinary" },
  { value: "Other", label: "Other" },
  { value: "Transgender", label: "Transgender" },
  { value: "Trans Man/Male", label: "Trans Man/Male" },
  { value: "Trans Woman/Female", label: "Trans Woman/Female" },
];

export const SEXUAL_ORIENTATION_OPTIONS = [
  { value: "Asexual", label: "Asexual" },
  { value: "Bisexual", label: "Bisexual" },
  { value: "Gay", label: "Gay" },
  { value: "Heterosexual (straight)", label: "Heterosexual (straight)" },
  { value: "Lesbian", label: "Lesbian" },
  { value: "Pansexual", label: "Pansexual" },
  { value: "Queer", label: "Queer" },
  { value: "Questioning", label: "Questioning" },
];

export const SIMULATION_CREATOR_STEP_IDS = {
  basicInfo: "basic-info",
  characterIdentity: "character-identity",
  traitsNeeds: "traits-and-needs",
  conversationStyle: "conversation-style",
  eventConfiguration: "event-configuration",
};

export const StepperList = [
  { id: SIMULATION_CREATOR_STEP_IDS.basicInfo, title: "Basic Information" },
  { id: SIMULATION_CREATOR_STEP_IDS.characterIdentity, title: "Character Identity" },
  { id: SIMULATION_CREATOR_STEP_IDS.traitsNeeds, title: "Traits & Needs" },
  { id: SIMULATION_CREATOR_STEP_IDS.conversationStyle, title: "Conversation Style" },
  { id: SIMULATION_CREATOR_STEP_IDS.eventConfiguration, title: "Event Configuration" },
];

export const FORM_FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  SELECT: "select",
  IMAGE_UPLOAD: "image_upload",
  VIDEO_UPLOAD: "video_upload",
  CUSTOM: {
    VOICE_DROPDOWN: "voice_dropdown",
    AUTO_TERMINATION_RULE: "auto_termination_rule",
  },
  TOGGLE_BUTTON: "toggle_button",
  TAG_AND_DROPDOWN: "tag_and_dropdown",
};

export const SIMULATION_CREATOR_FIELD_GROUPS: CreatorFieldGroups[] = [
  {
    id: SIMULATION_CREATOR_STEP_IDS.basicInfo,
    label: "Basic Information",
    fields: [
      {
        id: "isGlobal",
        label: "Default org-level visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "title",
        label: "Title",
        placeholder: "Enter title",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        fullWidth: true,
        maxLength: 100,
      },
      {
        id: "coverImageUrl",
        label: "Cover Image",
        type: FORM_FIELD_TYPES.IMAGE_UPLOAD,
        isMandatory: true,
        fullWidth: true,
      },
      {
        id: "coverVideoUrl",
        label: "Cover Video",
        type: FORM_FIELD_TYPES.VIDEO_UPLOAD,
        isMandatory: false,
        fullWidth: true,
      },

      {
        id: "description",
        label: "Learning goal",
        placeholder: "What is the primary learning goal?",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      FEATURE_FLAGS_MAP.TRIGGER_WARNINGS_FLAG && {
        id: "triggerWarningIds",
        label: "Trigger Warnings",
        type: FORM_FIELD_TYPES.TAG_AND_DROPDOWN,
        options: SEXUAL_ORIENTATION_OPTIONS,
        fullWidth: true,
      },
      {
        id: "agentGoal",
        label: "Agent goal",
        placeholder: "Describe the agent’s goal for this session.",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
    ].filter(Boolean) as FormFieldConfig[],
  },
  {
    id: SIMULATION_CREATOR_STEP_IDS.characterIdentity,
    label: "Character Identity",
    fields: [
      {
        id: "name",
        label: "Your name",
        placeholder: "Enter name",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        maxLength: 100,
      },
      {
        id: "age",
        label: "Your age",
        placeholder: "e.g. 25",
        type: FORM_FIELD_TYPES.NUMBER,
        isMandatory: true,
        maxLength: 100,
      },
      {
        id: "gender",
        label: "Your gender",
        type: FORM_FIELD_TYPES.SELECT,
        options: GENDER_OPTIONS,
        isMandatory: true,
      },
      {
        id: "genderIdentity",
        label: "Your gender identity",
        type: FORM_FIELD_TYPES.SELECT,
        options: GENDER_IDENTITY_OPTIONS,
        maxLength: 100,
      },
      {
        id: "sexualOrientation",
        label: "Your sexual orientation",
        placeholder: "Select sexual orientation",
        type: FORM_FIELD_TYPES.SELECT,
        options: SEXUAL_ORIENTATION_OPTIONS,
        maxLength: 100,
      },
      {
        id: "profession",
        label: "Your profession",
        placeholder: "e.g. Software Engineer",
        type: FORM_FIELD_TYPES.TEXT,
        maxLength: 100,
      },
      {
        id: "currentLocation",
        label: "Current location",
        placeholder: "e.g. Kolkata, India",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        maxLength: 100,
      },
      {
        id: "context",
        label: "Your current context",
        placeholder: "Describe the immediate situations",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        isDashedLineAbove: true,
        maxLength: 1000,
      },
      {
        id: "lifeHistory",
        label: "Summary of your life's history",
        placeholder: "Describe the key life events",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "coreMemories",
        label: "Your core memories influencing your beliefs & actions",
        placeholder: "Describe core influencing memories",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
    ],
  },
  {
    id: SIMULATION_CREATOR_STEP_IDS.traitsNeeds,
    label: "Traits & Needs",
    fields: [
      {
        id: "personality",
        label: "Your personality",
        placeholder: "Describe personality",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "startingState",
        label: "Your current thoughts:",
        placeholder: "Describe current thoughts",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "emotionalNeeds",
        label: "Your emotional needs from this counselling session:",
        placeholder: "Describe emotional needs",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
    ],
  },
  {
    id: SIMULATION_CREATOR_STEP_IDS.conversationStyle,
    label: "Conversation Style",
    fields: [
      {
        id: "voiceId",
        label: "Voice",
        type: FORM_FIELD_TYPES.CUSTOM.VOICE_DROPDOWN,
        isMandatory: true,
      },
      {
        id: "tone",
        label: "Your tone",
        type: FORM_FIELD_TYPES.TEXT,
        placeholder: "e.g. Casual",
        maxLength: 100,
      },
      {
        id: "openingStatements",
        label: "Begin the conversation by saying:",
        type: FORM_FIELD_TYPES.TEXT,
        placeholder: "Add opening statements as new line",
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "sessionBehaviorGuidelines",
        label: "How will you behave in this session:",
        type: FORM_FIELD_TYPES.TEXT,
        placeholder: "How should the character act during the session?",
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "autoTerminationStatus",
        label: "Auto termination",
        fullWidth: true,
        type: FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE,
      },
    ],
  },
];

export const EVENT_MANAGEMENT_TABLE_COLUMNS = [
  {
    id: "name",
    label: "Event name",
    accessor: "name",
    placeholder: "Add Event Name",
    dataType: cellTypes.editableText,
    minWidth: 180,
  },
  {
    id: "eventCode",
    label: "Event code",
    accessor: "eventCode",
    dataType: cellTypes.normalText,
    minWidth: 120,
  },
  {
    id: "detectionType",
    label: "Event type",
    accessor: "detectionType",
    dataType: cellTypes.dropdown,
    options: EVENT_TYPE_OPTIONS,
    minWidth: 150,
  },
  {
    id: "triggerCondition",
    label: "Trigger conditions",
    accessor: "triggerCondition",
    dataType: cellTypes.triggerConditions,
    minWidth: 420,
  },
  {
    id: "branchInstruction",
    label: "Default branch description",
    accessor: "branchInstruction",
    placeholder: "Add Instruction",
    dataType: cellTypes.editableText,
    options: [],
    minWidth: 240,
  },
  {
    id: "score",
    label: "Default session quality score",
    accessor: "score",
    dataType: cellTypes.number,
    options: [],
    minWidth: 200,
  },
  {
    id: "message",
    label: "Default real time feedback message",
    accessor: "message",
    placeholder: "Add Feedback",
    dataType: cellTypes.editableText,
    options: [],
    minWidth: 240,
  },
  {
    id: "emoji",
    label: "Default real time feedback emoji",
    accessor: "emoji",
    dataType: cellTypes.emoji_select,
    options: [],
    minWidth: 200,
  },
];

export const SESSION_EVENT_STATUS_OPTIONS = {
  ACTIVE: "ACTIVE",
};
