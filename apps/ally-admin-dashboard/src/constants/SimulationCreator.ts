import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";
import { cellTypes } from "@components";
import { en, ExperienceMode } from "@src/constants";
import { CreatorFieldGroups, FormFieldConfig } from "@types";

export const minInputHeight = {
  narrativeContext: "250",
};

export const SESSION_TIMER_CONFIG = {
  DEFAULT_MAX_TIME: "00:10:00",
  MAX_TIME: "02:00:00", // 120 minutes (7200 seconds)
  MIN_TIME: "00:05:00", // 5 minutes (300 seconds)
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

export const EXPERIENCE_MODE_OPTIONS = [
  { value: "FEEDBACK", label: "Feedback Mode" },
  { value: "CHECKLIST", label: "Checklist Mode" },
];

export const CHECKLIST_TYPE_OPTIONS = [
  { value: "GUIDED", label: "Guided" },
  { value: "UNGUIDED", label: "Unguided" },
];

export const SIMULATION_CREATOR_STEP_IDS = {
  overview: "overview",
  basicSettings: "basic-settings",
  advancedSettings: "advanced-settings",
  report: "report",
};

export const BEHAVIOURS_INSTRUCTION_CATEGORIES = [
  { value: "SHOULD_DO", label: "Helper should do" },
  { value: "SHOULD_NOT_DO", label: "Helper should not do" },
];

export const StepperList = [
  { id: SIMULATION_CREATOR_STEP_IDS.overview, title: "Overview" },
  { id: SIMULATION_CREATOR_STEP_IDS.basicSettings, title: "Basic Settings" },
  { id: SIMULATION_CREATOR_STEP_IDS.advancedSettings, title: "Advanced Settings" },
  ...(FEATURE_FLAGS_MAP.SIMULATION_REPORT_FLAG
    ? [{ id: SIMULATION_CREATOR_STEP_IDS.report, title: "Report" }]
    : []),
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
    RADIO_BUTTONS: "radio_buttons",
    CHARACTER_PROFILE_SELECTOR: "character_profile_selector",
    BEHAVIOURS_INSTRUCTION: "behaviours_instruction",
    STATES_INSTRUCTION: "states_instruction",
  },
  TOGGLE_BUTTON: "toggle_button",
  TAG_AND_DROPDOWN: "tag_and_dropdown",
  CUSTOM_FIELDS: "custom_fields",
  TIME_INPUT: "time_input",
  COMPETENCY: "competency",
};

export const FORM_FIELD_IDS = {
  TITLE: "title",
  COMPETENCY: "competency",
  DIFFICULTY_LEVEL: "difficultyLevel",
  CHARACTER_PROFILE_SELECTOR: "characterProfileSelector",
  CHARACTER_PROFILE_TEXT: "characterProfileText",
  COVER_IMAGE_URL: "coverImageUrl",
  COVER_VIDEO_URL: "coverVideoUrl",
  IS_GLOBAL: "isGlobal",
  IS_PUBLIC: "isPublic",
  TRIGGER_WARNING_IDS: "triggerWarningIds",
  DESCRIPTION: "description",
  PROMPT: "prompt",
  BEHAVIOR_INSTRUCTIONS: "behaviorInstructions",
  STATE_INSTRUCTIONS: "stateInstructions",
  CUSTOM_FIELDS: "customFields",
  OPENING_STATEMENTS: "openingStatements",
  VOICE_ID: "voiceId",
  LANGUAGES_VOICES: "languageVoices",
  TONE: "tone",
  AUTO_TERMINATION_STATUS: "autoTerminationStatus",
  EXPERIENCE_MODE: "experienceMode",
  CHECKLIST_TYPE: "checklistType",
  TIMER_MODE: "timerMode",
  MAX_TIME_VALUE: "maxTimeValue",
  SHOW_SCORE_METER: "showScoreMeter",
  OPT_GUARDRAILS: "optGuardrails",
};

export const REGENERATE_TYPE = {
  OPENING_STATEMENTS: "openingStatements",
  CHARACTER_PROFILE_TEXT: "characterProfileText",
  DESCRIPTION: "description",
  STATE_INSTRUCTIONS: "stateInstructions",
  CHALLENGE_DESCRIPTION: "challengeDescription",
  BEHAVIOR_INSTRUCTIONS: "behaviorInstructions",
};

const DEFAULT_ROLE_INSTRUCTION = `You are an AI roleplay assistant for counselor training. In this simulation, you must act ONLY as the client in a therapy session. Stay fully in character, provide realistic dialogue, and do not switch roles unless explicitly instructed.\n\nImportant Instructions:\n - Prefer first-person phrasing (e.g., "I feel…", "I've been struggling with…").\n - Allow the counselor to guide the conversation.\n - If the counselor is silent or open-ended, share one thought, feeling, or small story, then stop.\n - Maintain consistency with your life history but allow natural variation in tone and detail.\n - Respond naturally, as a real client would.\n - Keep answers concise (2–6 sentences), unless a longer response is natural.\n - Reveal information gradually, not all at once.\n - Start with few details and open up more as the counsellor asks questions.\n - Show authentic emotions and natural hesitations.\n - Do not give therapy advice or act as the counselor.\n - If sensitive topics arise, respond realistically but without graphic detail.\n - Keep each reply under ~120 words.`;

export const SIMULATION_CREATOR_FIELD_GROUPS: CreatorFieldGroups[] = [
  //TODO: uncomment these fields once the fields are added to the API
  {
    id: SIMULATION_CREATOR_STEP_IDS.overview,
    label: "Overview",
    fields: [
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
        id: "competency",
        label: "Pick Competency",
        type: FORM_FIELD_TYPES.COMPETENCY,
        options: [],
        isMandatory: true,
      },
      {
        id: "difficultyLevel",
        label: "Difficulty Level",
        type: FORM_FIELD_TYPES.SELECT,
        options: DIFFICULTY_LEVEL_OPTIONS,
        isMandatory: true,
      },
      {
        id: "characterProfileSelector",
        label: "Character Profile Selector",
        type: FORM_FIELD_TYPES.CUSTOM.CHARACTER_PROFILE_SELECTOR,
        isMandatory: false,
        fullWidth: true,
        isDashedLineAbove: true,
      },
      {
        id: "characterProfileText",
        label: "Character profile text",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 2500,
        isMandatory: true,
        regenerateType: REGENERATE_TYPE.CHARACTER_PROFILE_TEXT,
        isDashedLineAbove: true,
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
        id: "isGlobal",
        label: "Default org-level visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "isPublic",
        label: "Public visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "triggerWarningIds",
        label: "Trigger warnings",
        type: FORM_FIELD_TYPES.TAG_AND_DROPDOWN,
        fullWidth: true,
      },
    ] as FormFieldConfig[],
  },
  {
    id: SIMULATION_CREATOR_STEP_IDS.basicSettings,
    label: "Basic Settings",
    fields: [
      {
        id: "description",
        label: "Challenge Description",
        placeholder: "What is the primary learning goal?",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: true,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
        regenerateType: REGENERATE_TYPE.DESCRIPTION,
      },
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
        id: "behaviorInstructions",
        label: "Behaviour Instructions",
        type: FORM_FIELD_TYPES.CUSTOM.BEHAVIOURS_INSTRUCTION,
        fullWidth: true,
        isMandatory: true,
        // regenerateType: REGENERATE_TYPE.BEHAVIOR_INSTRUCTIONS, // TODO: uncomment this once the API is updated
      },
      {
        id: "stateInstructions",
        label: "State Instructions & Dialogues",
        type: FORM_FIELD_TYPES.CUSTOM.STATES_INSTRUCTION,
        fullWidth: true,
        isMandatory: true,
        regenerateType: REGENERATE_TYPE.STATE_INSTRUCTIONS,
      },

      {
        id: "customFields",
        label: "Custom Fields",
        type: FORM_FIELD_TYPES.CUSTOM_FIELDS,
        fullWidth: true,
        isDashedLineAbove: true,
      },
      {
        id: "openingStatements",
        label: "Opening Dialogues",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
        regenerateType: REGENERATE_TYPE.OPENING_STATEMENTS,
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
        type: FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE,
        fullWidth: true,
      },
      {
        id: "experienceMode",
        label: "Experience Mode",
        type: FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS,
        options: EXPERIENCE_MODE_OPTIONS,
        fullWidth: false,
        isMandatory: true,
      },
      {
        id: "checklistType",
        label: "Checklist Type",
        type: FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS,
        options: CHECKLIST_TYPE_OPTIONS,
        fullWidth: false,
        dependsOn: "experienceMode",
        visibleWhen: (formValues: any) => formValues.experienceMode === ExperienceMode.CHECKLIST,
      },
      {
        id: "timerMode",
        label: "Session Timer",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        isDashedLineAbove: true,
        fullWidth: true,
      },
      {
        id: "maxTimeValue",
        label: "Maximum time",
        placeholder: "00:05:00 - 02:00:00",
        type: FORM_FIELD_TYPES.TIME_INPUT,
        fullWidth: true,
        dependsOn: "timerMode",
        visibleWhen: (formValues: any) => formValues.timerMode === true,
        defaultValue: "00:10:00",
        note: "Range 00:05:00 - 02:00:00",
        minTime: "00:05:00",
        maxTime: "02:00:00",
      },
      {
        id: "showScoreMeter",
        label: "Score",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
      },
      {
        id: "optGuardrails",
        label: "Conversational Guardrails",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        disabled: true,
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
    dataType: cellTypes.textAreaWithDropdown,
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
    dataType: cellTypes.score,
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
    dataType: cellTypes.score,
    options: [],
    minWidth: 120,
  },
  {
    id: "maxScore",
    label: "Max score",
    accessor: "maxScore",
    dataType: cellTypes.score,
    options: [],
    minWidth: 120,
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
  {
    id: "tags",
    label: "Tags",
    accessor: "tags",
    dataType: cellTypes.tags,
    options: [],
    minWidth: 200,
  },
];

export const SESSION_EVENT_STATUS_OPTIONS = {
  ACTIVE: "ACTIVE",
};

export const SCENARIO_VOICE_COLUMNS = [
  {
    id: "name",
    label: "Voice Name",
    accessor: "name",
    dataType: cellTypes.editableText,
    minWidth: 200,
  },
  {
    id: "provider",
    label: "Provider",
    accessor: "provider",
    dataType: cellTypes.dropdown,
    minWidth: 200,
    options: [], // Will be populated dynamically from API/existing voices
  },
  {
    id: "config",
    label: "Configuration",
    accessor: "config",
    dataType: cellTypes.normalText,
    minWidth: 300,
  },
  {
    id: "language",
    label: "Language",
    accessor: "languageId",
    dataType: cellTypes.dropdown,
    minWidth: 200,
    options: [], // Will be populated dynamically from API
  },
  {
    id: "active",
    label: "Status",
    accessor: "active",
    dataType: cellTypes.switch,
    minWidth: 150,
  },
  {
    id: "createdAt",
    label: "Created Date",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 200,
  },
];

export const SCENARIO_LANGUAGE_COLUMNS = [
  {
    id: "label",
    label: "Language Name",
    accessor: "label",
    dataType: cellTypes.editableText,
    minWidth: 150,
  },
  {
    id: "value",
    label: "Language Code",
    accessor: "value",
    dataType: cellTypes.editableText,
    minWidth: 150,
  },
  {
    id: "translationCode",
    label: "Translation Code",
    accessor: "translationCode",
    dataType: cellTypes.editableText,
    minWidth: 200,
  },
  {
    id: "llmProviderConfig",
    label: "LLM Provider Config",
    accessor: "llmProviderConfig",
    dataType: cellTypes.normalText,
    minWidth: 200,
  },
  {
    id: "sttProviderConfig",
    label: "STT Provider Config",
    accessor: "sttProviderConfig",
    dataType: cellTypes.normalText,
    minWidth: 200,
  },
  {
    id: "active",
    label: "Status",
    accessor: "active",
    dataType: cellTypes.switch,
    minWidth: 120,
  },
  {
    id: "createdAt",
    label: "Created Date",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 120,
  },
];

export const PROMPT_COLUMNS = [
  {
    id: "promptCode",
    label: "Prompt Code",
    accessor: "promptCode",
    dataType: cellTypes.normalText,
    minWidth: 200,
    editable: false,
  },
  {
    id: "name",
    label: "Prompt Name",
    accessor: "name",
    dataType: cellTypes.normalText,
    minWidth: 200,
    editable: false,
  },
  {
    id: "description",
    label: "Description",
    accessor: "description",
    dataType: cellTypes.normalText,
    minWidth: 200,
    editable: false,
  },
  {
    id: "prompt",
    label: "Prompt",
    accessor: "prompt",
    dataType: cellTypes.normalText,
    minWidth: 350,
    editable: false,
  },
  {
    id: "useCase",
    label: "Use Case",
    accessor: "useCase",
    dataType: cellTypes.normalText,
    minWidth: 200,
    editable: false,
  },
  {
    id: "createdAt",
    label: "Created Date",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 150,
    editable: false,
  },
];

export const CHARACTER_LIBRARY_TABLE_COLUMNS = [
  {
    id: "name",
    label: "Name",
    accessor: "name",
    placeholder: "Add Name",
    dataType: cellTypes.editableText,
    minWidth: 180,
  },
  {
    id: "age",
    label: "Age",
    accessor: "age",
    placeholder: "Add Age",
    dataType: cellTypes.number,
    minWidth: 100,
  },
  {
    id: "gender",
    label: "Gender",
    accessor: "gender",
    dataType: cellTypes.dropdown,
    options: GENDER_OPTIONS,
    minWidth: 150,
  },
  {
    id: "profession",
    label: "Profession",
    accessor: "profession",
    placeholder: "Add Profession",
    dataType: cellTypes.editableText,
    minWidth: 180,
  },
  {
    id: "currentLocation",
    label: "Current location",
    accessor: "currentLocation",
    placeholder: "Add Location",
    dataType: cellTypes.editableText,
    minWidth: 200,
  },
  {
    id: "genderIdentity",
    label: "Gender identity",
    accessor: "genderIdentity",
    dataType: cellTypes.dropdown,
    options: GENDER_IDENTITY_OPTIONS,
    minWidth: 180,
  },
  {
    id: "sexualOrientation",
    label: "Sexual orientation",
    accessor: "sexualOrientation",
    dataType: cellTypes.dropdown,
    options: SEXUAL_ORIENTATION_OPTIONS,
    minWidth: 180,
  },
];
export const USER_BADGES_TABLE_COLUMNS = [
  {
    id: "imageUrl",
    label: en.simulation.icon,
    accessor: "imageUrl",
    dataType: cellTypes.image,
    minWidth: 80,
  },
  {
    id: "name",
    label: en.simulation.name,
    accessor: "name",
    dataType: cellTypes.normalText,
    minWidth: 200,
  },
  {
    id: "description",
    label: en.simulation.description,
    accessor: "description",
    dataType: cellTypes.normalText,
    minWidth: 300,
  },
  {
    id: "status",
    label: en.simulation.status,
    accessor: "status",
    dataType: cellTypes.status,
    minWidth: 120,
  },
  {
    id: "visibilityType",
    label: en.simulation.orgVisibility,
    accessor: "visibilityType",
    dataType: cellTypes.normalText,
    minWidth: 140,
  },
  {
    id: "category",
    label: en.simulation.category,
    accessor: "category",
    dataType: cellTypes.normalText,
    minWidth: 120,
  },
  {
    id: "role",
    label: en.userManagement.role,
    accessor: "roles",
    dataType: cellTypes.roles,
    minWidth: 140,
  },
  {
    id: "updatedAt",
    label: en.simulation.lastModified,
    accessor: "updatedAt",
    dataType: cellTypes.normalText,
    minWidth: 150,
  },
];

export const BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS = [
  {
    id: "category",
    label: "Category",
    accessor: "category",
    placeholder: "Add Name",
    dataType: cellTypes.dropdown,
    options: BEHAVIOURS_INSTRUCTION_CATEGORIES,
    minWidth: 200,
  },
  {
    id: "behaviors",
    label: "Helper behaviours",
    accessor: "behaviors",
    placeholder: "Add Instruction",
    dataType: cellTypes.dropdownTags,
    minWidth: 300,
  },
  {
    id: "instructions",
    label: "Actors response",
    accessor: "instructions",
    placeholder: "Add Response",
    dataType: cellTypes.editableText,
    minWidth: 350,
  },
];

export const STATES_INSTRUCTION_TABLE_HEADERS = [
  {
    key: "stateId",
    header: "States",
    editable: false,
    format: (value: any) => `State ${value}`,
  },
  { key: "instruction", header: "Instruction", editable: true },
  {
    key: "dialogues",
    header: "Dialogues",
    editable: true,
    getEditableValue: (value: any) =>
      Array.isArray(value) ? value.filter(Boolean).join("\n") : String(value ?? ""),
  },
];

export const DEFAULT_STATE_INSTRUCTIONS = [
  { stateId: "1", instruction: "", dialogues: [] },
  { stateId: "2", instruction: "", dialogues: [] },
  { stateId: "3", instruction: "", dialogues: [] },
  { stateId: "4", instruction: "", dialogues: [] },
];
