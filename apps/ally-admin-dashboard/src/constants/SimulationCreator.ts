import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
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
  { value: "BINARY_CLASSIFICATION", label: "Binary Classification" },
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

export const DIFFICULTY_LEVEL_OPTIONS = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

export const RESPONSE_LENGTH_OPTIONS = [
  { value: "VERY_BRIEF", label: "Very Brief" },
  { value: "BRIEF", label: "Brief" },
  { value: "MEDIUM", label: "Medium" },
  { value: "ELABORATE", label: "Elaborate" },
];
export const SIMULATION_CREATOR_STEP_IDS = {
  overview: "overview",
  basicSettings: "basic-settings",
  advancedSettings: "advanced-settings",
};

export const StepperList = [
  { id: SIMULATION_CREATOR_STEP_IDS.overview, title: "Overview" },
  { id: SIMULATION_CREATOR_STEP_IDS.basicSettings, title: "Basic Settings" },
  { id: SIMULATION_CREATOR_STEP_IDS.advancedSettings, title: "Advanced Settings" },
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
    LANGUAGE_VOICE_MAPPING: "language_voice_mapping",
  },
  TOGGLE_BUTTON: "toggle_button",
  TAG_AND_DROPDOWN: "tag_and_dropdown",
  CUSTOM_FIELDS: "custom_fields",
};

export const FORM_FIELD_IDS = {
  BASIC_INFO: "basicInfo",
  CHARACTER_IDENTITY: "characterIdentity",
  TRAITS_NEEDS: "traitsNeeds",
  CONVERSATION_STYLE: "conversationStyle",
  EVENT_CONFIGURATION: "eventConfiguration",
  IS_GLOBAL: "isGlobal",
  TITLE: "title",
  DESCRIPTION: "description",
  AGE: "age",
  NAME: "name",
  CONTEXT: "context",
  CORE_MEMORIES: "coreMemories",
  AGENT_GOAL: "agentGoal",
  CURRENT_LOCATION: "currentLocation",
  EMOTIONAL_NEEDS: "emotionalNeeds",
  GENDER: "gender",
  GENDER_IDENTITY: "genderIdentity",
  COVER_IMAGE_URL: "coverImageUrl",
  COVER_VIDEO_URL: "coverVideoUrl",
  TRIGGER_WARNING_IDS: "triggerWarningIds",
  CUSTOM_FIELDS: "customFields",
  LIFE_HISTORY: "lifeHistory",
  OPENING_STATEMENTS: "openingStatements",
  PERSONALITY: "personality",
  PROFESSION: "profession",
  SESSION_BEHAVIOR_GUIDELINES: "sessionBehaviorGuidelines",
  SEXUAL_ORIENTATION: "sexualOrientation",
  STARTING_STATE: "startingState",
  TONE: "tone",
  VOICE_ID: "voiceId",
  AUTO_TERMINATION_STATUS: "autoTerminationStatus",
  TERMINATION_EVENT_ID: "terminationEventId",
  TERMINATION_MESSAGE: "terminationMessage",
  TERMINATION_NAME: "terminationName",
};

const DEFAULT_ROLE_INSTRUCTION = `You are an AI roleplay assistant for counselor training. In this simulation, you must act ONLY as the client in a therapy session. Stay fully in character, provide realistic dialogue, and do not switch roles unless explicitly instructed.\n\nImportant Instructions:\n - Prefer first-person phrasing (e.g., "I feel…", "I've been struggling with…").\n - Allow the counselor to guide the conversation.\n - If the counselor is silent or open-ended, share one thought, feeling, or small story, then stop.\n - Maintain consistency with your life history but allow natural variation in tone and detail.\n - Respond naturally, as a real client would.\n - Keep answers concise (2–6 sentences), unless a longer response is natural.\n - Reveal information gradually, not all at once.\n - Start with few details and open up more as the counsellor asks questions.\n - Show authentic emotions and natural hesitations.\n - Do not give therapy advice or act as the counselor.\n - If sensitive topics arise, respond realistically but without graphic detail.\n - Keep each reply under ~120 words.`;

export const SIMULATION_CREATOR_FIELD_GROUPS: CreatorFieldGroups[] = [
  {
    id: SIMULATION_CREATOR_STEP_IDS.overview,
    label: "Overview",
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
        label: "Challenge Description",
        placeholder: "What is the primary learning goal?",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "difficultyLevel",
        label: "Difficulty level",
        type: FORM_FIELD_TYPES.SELECT,
        options: DIFFICULTY_LEVEL_OPTIONS,
        isMandatory: true,
      },
      {
        id: "triggerWarningIds",
        label: "Trigger warnings",
        type: FORM_FIELD_TYPES.TAG_AND_DROPDOWN,
        fullWidth: true,
      },
      {
        id: "name",
        label: "Your name",
        placeholder: "Enter name",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        maxLength: 100,
        isDashedLineAbove: true,
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
    ].filter(Boolean) as FormFieldConfig[],
  },
  {
    id: SIMULATION_CREATOR_STEP_IDS.basicSettings,
    label: "Character Identity",
    fields: [
      {
        id: "prompt",
        label: "Role instruction",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1500,
        defaultValue: DEFAULT_ROLE_INSTRUCTION,
        isMandatory: true,
      },
      {
        id: "responseLength",
        label: "Length of your responses",
        type: FORM_FIELD_TYPES.SELECT,
        isMandatory: true,
        options: RESPONSE_LENGTH_OPTIONS,
      },
      {
        id: "genderIdentity",
        label: "Your gender identity",
        type: FORM_FIELD_TYPES.SELECT,
        options: GENDER_IDENTITY_OPTIONS,
        maxLength: 100,
        isDashedLineAbove: true,
        isMandatory: true,
      },
      {
        id: "sexualOrientation",
        label: "Your sexual orientation",
        placeholder: "Select sexual orientation",
        type: FORM_FIELD_TYPES.SELECT,
        options: SEXUAL_ORIENTATION_OPTIONS,
        maxLength: 100,
        isMandatory: true,
      },
      {
        id: "context",
        label: "Your context",
        placeholder: "Describe the immediate situations",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
      },
      {
        id: "customFields",
        label: "Custom fields",
        type: FORM_FIELD_TYPES.CUSTOM_FIELDS,
        fullWidth: true,
      },
      {
        id: "agentDialogues",
        label: "Your dialogues",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
        isMandatory: true,
      },
      {
        id: "openingStatements",
        label: "Opening dialogues",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
        isMandatory: true,
      },
      {
        id: "voiceId",
        label: "Voice",
        type: FORM_FIELD_TYPES.CUSTOM.VOICE_DROPDOWN,
        isMandatory: true,
        fullWidth: true,
      },
      {
        id: "languageVoices",
        label: "Language-Voice",
        type: FORM_FIELD_TYPES.CUSTOM.LANGUAGE_VOICE_MAPPING,
        isMandatory: true,
        fullWidth: true,
      },
      {
        id: "tone",
        label: "Voice instruction",
        type: FORM_FIELD_TYPES.TEXT,
        placeholder: "e.g. Casual",
        maxLength: 100,
      },
      {
        id: "autoTerminationStatus",
        label: "Auto termination",
        fullWidth: true,
        type: FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE,
      },
    ] as FormFieldConfig[],
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
  ...(FEATURE_FLAGS_MAP.EVENT_DETECTION_CONFIG_FLAG
    ? [
        {
          id: "startTime",
          label: "Applicable from",
          accessor: "startTime",
          dataType: cellTypes.timeInput,
          options: [],
          minWidth: 120,
        },
        {
          id: "endTime",
          label: "Applicable till",
          accessor: "endTime",
          dataType: cellTypes.timeInput,
          options: [],
          minWidth: 120,
        },
        {
          id: "maxOccurrences",
          label: "Max occurrences",
          accessor: "maxOccurrences",
          dataType: cellTypes.number,
          options: [],
          minWidth: 120,
        },
        {
          id: "minGapTime",
          label: "Min gap time",
          accessor: "minGapTime",
          dataType: cellTypes.timeInput,
          options: [],
          minWidth: 120,
        },
        {
          id: "minScore",
          label: "Min score",
          accessor: "minScore",
          dataType: cellTypes.number,
          options: [],
          minWidth: 120,
        },
        {
          id: "maxScore",
          label: "Max score",
          accessor: "maxScore",
          dataType: cellTypes.number,
          options: [],
          minWidth: 120,
        },
      ]
    : []),
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
