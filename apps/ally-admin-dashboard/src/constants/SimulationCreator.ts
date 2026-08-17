import { cellTypes } from "@components";
import { en, ExperienceMode, TooltipLocation } from "@src/constants";
import { CreatorFieldGroups, FormFieldConfig } from "@types";

export const minInputHeight = {
  narrativeContext: "250",
};

export const SESSION_TIMER_CONFIG = {
  DEFAULT_MAX_TIME: "00:10:00",
  MAX_TIME: "02:00:00", // 120 minutes (7200 seconds)
  MIN_TIME: "00:00:00", // 0 minutes (0 seconds)
};

// Beyond this many advanced (mapped) events on a single simulation, real-time
// event detection during a session starts to add noticeable latency. Used to
// surface a non-blocking warning to authors on the Create/Edit Simulation page.
export const ADVANCED_EVENTS_LATENCY_THRESHOLD = 10;

export const DEFAULT_SIMULATION_STATUS_OPTIONS = [
  { id: "ACTIVE", label: "Published" },
  { id: "ARCHIVED", label: "Archived" },
  { id: "DRAFT", label: "Draft" },
];

// Editorial category of a simulation (mirrors ally-be's ScenarioCategory).
// Used by the Basic Settings dropdown (value/label) and, in id/label shape
// below, by the Studio list filter.
export const SIMULATION_CATEGORY_OPTIONS = [
  { value: "ORIGINALS", label: "Originals" },
  { value: "DEMO", label: "Demo" },
  { value: "PARTNER_SIM", label: "Partner Sim" },
  { value: "OTHER", label: "Other" },
];

export const SIMULATION_CATEGORY_FILTER_OPTIONS = SIMULATION_CATEGORY_OPTIONS.map(
  ({ value, label }) => ({ id: value, label }),
);

export const getSimulationCategoryLabel = (category?: string | null): string | undefined =>
  SIMULATION_CATEGORY_OPTIONS.find(option => option.value === category)?.label ?? undefined;

export const SIMULATION_CATEGORY = {
  PARTNER_SIM: "PARTNER_SIM",
} as const;

// SENTENCE_SIMILARITY / SEMANTIC_SIMILARITY entries are @deprecated — both
// event types are retired from the "Create event" picker
// (EventTypeSelectionDialog's EVENT_TYPE_POPUP_OPTIONS), so no new events of
// these types can be created. Kept here so an existing event's read-only
// type label (the events table's disabled "Event type" column) still
// resolves to a friendly name instead of the raw enum string.
export const EVENT_TYPE_OPTIONS = [
  { value: "TIME_BASED", label: "Time Based" },
  { value: "SCORE_BASED", label: "Score Based" },
  { value: "SENTENCE_SIMILARITY", label: "Sentence Similarity" },
  { value: "SEMANTIC_SIMILARITY", label: "Semantic Similarity" },
  { value: "COMBINATION", label: "Combination" },
  { value: "BINARY_CLASSIFIER", label: "Binary Classification" },
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
  { value: "NONE", label: "None" },
];

export const CHECKLIST_TYPE_OPTIONS = [
  { value: "GUIDED", label: "Guided" },
  { value: "UNGUIDED", label: "Unguided" },
  { value: "LIST", label: "List" },
];

// translationCode of languages the app supports for in-product translation.
// These tabs always appear in the title-translations panel even when not
// configured in the scenario's Language–Voice mapping.
export const APP_TRANSLATION_LANGUAGE_CODES = ["hi", "mr", "kn", "ta"];

export const SIMULATION_CREATOR_STEP_IDS = {
  // `basicSettings` is no longer a standalone tab — the Basic Settings form now
  // lives in the left pane of the Agent Builder Copilot tab. The id is retained
  // as the lookup key for its field-group config (SIMULATION_CREATOR_FIELD_GROUPS,
  // via getCreateSimulationSubSectionById).
  basicSettings: "basic-settings",
  advancedSettings: "advanced-settings",
  report: "report",
  // The canonical builder tab: left pane = the Basic Settings form, right pane =
  // the generation wizard. Shown to everyone who can reach the Create/Edit
  // Simulation route (which is gated on the edit:scenario permission).
  agentBuilderCopilot: "agent-builder-copilot",
};

export const BEHAVIOURS_INSTRUCTION_CATEGORIES = [
  { value: "SHOULD_DO", label: "Helper should do" },
  { value: "SHOULD_NOT_DO", label: "Helper should not do" },
];

// Tabs that follow the canonical Agent Builder Copilot tab. Basic Settings is
// intentionally absent — its form is the Copilot tab's left pane now.
export const StepperList = [
  { id: SIMULATION_CREATOR_STEP_IDS.advancedSettings, title: "Advanced Settings" },
  { id: SIMULATION_CREATOR_STEP_IDS.report, title: "Report" },
];

export const FORM_FIELD_TYPES = {
  TEXT: "text",
  NUMBER: "number",
  SELECT: "select",
  IMAGE_UPLOAD: "image_upload",
  VIDEO_UPLOAD: "video_upload",
  CUSTOM: {
    AUTO_TERMINATION_RULE: "auto_termination_rule",
    LANGUAGE_VOICE_MAPPING: "language_voice_mapping",
    LINGUISTIC_STYLE_SAMPLES: "linguistic_style_samples",
    OPENING_DIALOGUES: "opening_dialogues",
    CHALLENGE_DESCRIPTION: "challenge_description",
    REMINDERS: "reminders",
    RADIO_BUTTONS: "radio_buttons",
    CHARACTER_PROFILE_SELECTOR: "character_profile_selector",
    BEHAVIOURS_STATES_INSTRUCTION: "behaviours_states_instruction",
    TITLE_TRANSLATIONS: "title_translations",
    MAIN_AGENT_PROMPT_PICKER: "main_agent_prompt_picker",
    MAIN_PROMPT_VARIANT_PICKER: "main_prompt_variant_picker",
    STATES_EDITOR: "states_editor",
    TITLE_PANEL: "title_panel",
    COMFORT_AUDIO_TRACK: "comfort_audio_track",
  },
  TOGGLE_BUTTON: "toggle_button",
  TAG_AND_DROPDOWN: "tag_and_dropdown",
  CUSTOM_FIELDS: "custom_fields",
  TIME_INPUT: "time_input",
  COMPETENCY: "competency",
  KNOWLEDGE_SOURCE: "knowledge_source",
  SLIDER: "slider",
};

export const FORM_FIELD_IDS = {
  TITLE: "title",
  COMPETENCY: "competency",
  CATEGORY: "category",
  PARTNER_ORG_NAME: "partnerOrgName",
  DIFFICULTY_LEVEL: "difficultyLevel",
  CHARACTER_PROFILE_SELECTOR: "characterProfileSelector",
  CHARACTER_PROFILE_TEXT: "characterProfileText",
  HELPER_AGENT_PROMPT: "helperAgentPrompt",
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
  REMINDERS: "reminders",
  LANGUAGES_VOICES: "languageVoices",
  LINGUISTIC_STYLE_SAMPLES: "linguisticStyleSamples",
  AUTO_TERMINATION_STATUS: "autoTerminationStatus",
  EXPERIENCE_MODE: "experienceMode",
  CHECKLIST_TYPE: "checklistType",
  SUMMARY_CHECKLIST_ENABLED: "summaryChecklistEnabled",
  TIMER_MODE: "timerMode",
  MAX_TIME_VALUE: "maxTimeValue",
  SHOW_SCORE_METER: "showScoreMeter",
  ENABLE_FEEDBACK: "enableFeedback",
  OPT_GUARDRAILS: "optGuardrails",
  CURRENT_STATE: "currentState",
  REMINDERS_ENABLED: "remindersEnabled",
  KNOWLEDGE_SOURCE: "knowledgeSources",
  STATE_NAMES: "stateNames",
  FILLER_ENABLED: "fillerEnabled",
  LANGUAGE_GLOSSARY_ENABLED: "languageGlossaryEnabled",
  COMFORT_AUDIO_ENABLED: "comfortAudioEnabled",
  COMFORT_AUDIO_URL: "comfortAudioUrl",
  COMFORT_AUDIO_VOLUME: "comfortAudioVolume",
  HISTORY_TRIM_ENABLED: "historyTrimEnabled",
  TURN_MAX_ENDPOINTING_DELAY: "turnMaxEndpointingDelay",
  CONTINUOUS_BACKCHANNELING: "continuousBackchanneling",
  INTERIM_REPLY_ENABLED: "interimReplyEnabled",
  SELECTED_MAIN_PROMPT_CODE: "selectedMainPromptCode",
  SELECTED_EVALUATOR_PROMPT_CODE: "selectedEvaluatorPromptCode",
  STATES: "states",
  TEMPERATURE: "temperature",
};

/**
 * Identifies which scenario field a field-level Enhance action targets. Must
 * match the backend `EnhanceableField` enum. To add Enhance to a new field:
 * add a value here, set `enhanceType` on the field config, and render an
 * `<EnhanceButton>` for it. Nothing else is required.
 */
export const ENHANCE_TYPE = {
  ROLE_INSTRUCTION: "roleInstruction",
  TITLE: "title",
  CHARACTER_PROFILE_TEXT: "characterProfileText",
  DESCRIPTION: "description",
  OPENING_STATEMENTS: "openingStatements",
  REMINDERS: "reminders",
  LINGUISTIC_STYLE_SAMPLES: "linguisticStyleSamples",
  ALLOWED_FILLER_WORDS: "allowedFillerWords",
  KNOWLEDGE_SOURCES: "knowledgeSources",
  STATE: "state",
} as const;

/**
 * Roleplay-level LLM sampling temperature defaults. Mirrors ally-ai-learn's
 * accepted range (0–2) and the global LLM_TEMPERATURE fallback (0.7). The value
 * is persisted on scenarios.metadata.temperature and forwarded to the voice
 * agent as promptData.temperature, overriding the per-language / global default
 * for this simulation only.
 */
export const TEMPERATURE_DEFAULT = 0.7;
export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 2;
export const TEMPERATURE_STEP = 0.1;

/**
 * Per-simulation override (seconds) for how long ally-ai-learn's semantic
 * turn-detection waits for a learner who seems mid-thought before giving up
 * and replying anyway. Mirrors ally-be's DTO bounds (@Min(0.1) @Max(10)).
 * Left unset by default — unset means "use the global platform default"
 * (settings.TURN_MAX_ENDPOINTING_DELAY), not a specific number.
 */
export const TURN_MAX_ENDPOINTING_DELAY_MIN = 0.1;
export const TURN_MAX_ENDPOINTING_DELAY_MAX = 10;

/**
 * STT providers ally-ai-learn's `app/stt/factory.py` can construct. Kept in
 * step with SUPPORTED_STT_PROVIDERS in ally-be — a provider outside this list
 * raises at agent start, so the registry form must not offer one.
 */
export const STT_PROVIDER_OPTIONS = [
  { value: "deepgram", label: "Deepgram" },
  { value: "google", label: "Google" },
  { value: "sarvam", label: "Sarvam" },
  { value: "elevenlabs", label: "ElevenLabs" },
];

/**
 * LLM providers ally-ai-learn's `app/llms/factory.py` can construct. "google"
 * and "gemini" both build the Gemini client; only "google" is offered here to
 * keep the picker unambiguous, and existing "gemini" rows still resolve.
 */
export const LLM_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google (Gemini)" },
  { value: "ollama", label: "Ollama" },
  { value: "vllm", label: "vLLM" },
];

/**
 * Providers the model catalog can hold — deliberately NOT the same list as
 * LLM_PROVIDER_OPTIONS above.
 *
 * Anthropic is absent from the config list (no llm_configs row uses it) but
 * belongs here, since prompts can select Claude models. Ollama and vLLM are
 * self-hosted and only the voice agent can reach them, but they are still
 * selectable models and must not be lost now that the catalog is the single
 * list.
 *
 * `gemini` rather than `google`: the catalog stores the canonical spelling used
 * by the voice runtime's LLMProvider enum. ally-be accepts either and
 * canonicalises on write.
 */
export const LLM_CATALOG_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google (Gemini)" },
  { value: "anthropic", label: "Anthropic" },
  { value: "ollama", label: "Ollama" },
  { value: "vllm", label: "vLLM" },
];

/** Columns shared by every provider-config registry tab (STT, LLM). */
export const PROVIDER_CONFIG_COLUMNS = [
  {
    id: "configName",
    label: "Name",
    accessor: "configName",
    dataType: cellTypes.normalText,
    minWidth: 260,
  },
  {
    id: "providerLabel",
    label: "Provider",
    accessor: "providerLabel",
    dataType: cellTypes.normalText,
    minWidth: 160,
  },
  { id: "model", label: "Model", accessor: "model", dataType: cellTypes.normalText, minWidth: 220 },
  {
    id: "status",
    label: "Status",
    accessor: "status",
    dataType: cellTypes.normalText,
    minWidth: 120,
  },
];

/** Columns for the LLM model catalog — the list of models, not of configs. */
export const LLM_MODEL_CATALOG_COLUMNS = [
  {
    id: "label",
    label: "Name",
    accessor: "label",
    dataType: cellTypes.normalText,
    minWidth: 240,
  },
  {
    id: "providerLabel",
    label: "Provider",
    accessor: "providerLabel",
    dataType: cellTypes.normalText,
    minWidth: 160,
  },
  {
    id: "model",
    label: "Model id",
    accessor: "model",
    dataType: cellTypes.normalText,
    minWidth: 240,
  },
  {
    id: "temperature",
    label: "Temperature",
    accessor: "temperature",
    dataType: cellTypes.normalText,
    minWidth: 140,
  },
  {
    id: "runtimeSupport",
    label: "Runs in",
    accessor: "runtimeSupport",
    dataType: cellTypes.normalText,
    minWidth: 200,
  },
  {
    id: "status",
    label: "Status",
    accessor: "status",
    dataType: cellTypes.normalText,
    minWidth: 120,
  },
];

// Comfort-audio volume slider (0..1), shown when the Comfort Audio toggle is on.
export const COMFORT_AUDIO_VOLUME_DEFAULT = 0.3;
export const COMFORT_AUDIO_VOLUME_MIN = 0;
export const COMFORT_AUDIO_VOLUME_MAX = 1;
export const COMFORT_AUDIO_VOLUME_STEP = 0.1;

export const ROLE_INSTRUCTION_PROMPT_CODE = "openai_simulation_role_instruction_default";
export const DEFAULT_MAIN_AGENT_PROMPT_CODE = "ally_ai_learn_system_main_agent_prompt";

export const DEFAULT_ROLE_INSTRUCTION = `You are an AI roleplay assistant for counselor training. In this simulation, you must act ONLY as the client in a therapy session. Stay fully in character, provide realistic dialogue, and do not switch roles unless explicitly instructed.

Important Instructions:
- Prefer first-person phrasing (e.g., "I feel…", "I've been struggling with…").
- Allow the counselor to guide the conversation.
- If the counselor is silent or open-ended, share one thought, feeling, or small story, then stop.
- Maintain consistency with your life history but allow natural variation in tone and detail.
- Respond naturally, as a real client would.
- Keep answers concise (2–6 sentences), unless a longer response is natural.
- Reveal information gradually, not all at once.
- Start with few details and open up more as the counsellor asks questions.
- Show authentic emotions and natural hesitations.
- Do not give therapy advice or act as the counselor.
- If sensitive topics arise, respond realistically but without graphic detail.
- Keep each reply under ~120 words.`;

export const SIMULATION_CREATOR_FIELD_GROUPS: CreatorFieldGroups[] = [
  {
    id: SIMULATION_CREATOR_STEP_IDS.basicSettings,
    label: "Basic Settings",
    fields: [
      // Main-agent variant picker — always rendered. Lets the studio
      // author pick which `main_agent` prompt the scenario runs on
      // (default Prompt #1, the lean #2 variant, or any
      // duplicated-as-variant row).
      {
        id: "selectedMainPromptCode",
        label: "Skill Version",
        type: FORM_FIELD_TYPES.CUSTOM.MAIN_AGENT_PROMPT_PICKER,
        fullWidth: true,
        isMandatory: false,
      },
      // Per-language choice of Generic (English source) vs Multilingual
      // (translated) for the selected skill version. Only languages with a
      // ready translation of that prompt can pick Multilingual.
      {
        id: "mainPromptVariantByLanguage",
        label: "Language handling",
        type: FORM_FIELD_TYPES.CUSTOM.MAIN_PROMPT_VARIANT_PICKER,
        fullWidth: true,
        isMandatory: false,
        requiredPermission: "view:super-duper-admins",
      },
      {
        id: "prompt",
        label: "Role instruction",
        type: FORM_FIELD_TYPES.TEXT,
        multiline: true,
        fullWidth: true,
        maxLength: 1500,
        defaultValue: DEFAULT_ROLE_INSTRUCTION,
        // Role instructions are one of the three mandatory fields (with
        // title and competency). It keeps its collapsible accordion, but
        // `hideWhenUnused` is intentionally dropped: a mandatory field must
        // always be reachable. (FormField also hard-guards this — a
        // mandatory field is never hidden even when hideWhenUnused is set.)
        isMandatory: true,
        promptVariable: "role_instructions",
        accordion: true,
        enhanceType: ENHANCE_TYPE.ROLE_INSTRUCTION,
      },
      {
        id: "title",
        label: "Title",
        type: FORM_FIELD_TYPES.CUSTOM.TITLE_PANEL,
        isMandatory: true,
        fullWidth: true,
        maxLength: 100,
        promptVariable: "title",
        enhanceType: ENHANCE_TYPE.TITLE,
      },
      {
        id: "description",
        label: "Challenge Description",
        placeholder: "What is the primary learning goal?",
        type: FORM_FIELD_TYPES.CUSTOM.CHALLENGE_DESCRIPTION,
        isMandatory: false,
        multiline: true,
        fullWidth: true,
        maxLength: 1000,
        enhanceType: ENHANCE_TYPE.DESCRIPTION,
        promptVariable: "challenge_description",
      },
      // Editorial organisation of the Studio list: category groups sims as
      // Originals / Demo / Partner Sim / Other; the partner-org tag names the
      // partner and only shows when the category is Partner Sim. Both are
      // optional, stored as dedicated `scenarios` columns, and drive the
      // Studio list filter.
      {
        id: "category",
        label: "Category",
        type: FORM_FIELD_TYPES.SELECT,
        options: SIMULATION_CATEGORY_OPTIONS,
        isMandatory: false,
        fullWidth: false,
        allowDeselect: true,
      },
      {
        id: "partnerOrgName",
        label: "Partner Organisation",
        placeholder: "Name of the partner org",
        type: FORM_FIELD_TYPES.TEXT,
        isMandatory: false,
        fullWidth: false,
        maxLength: 255,
        dependsOn: "category",
        visibleWhen: (formValues: any) => formValues.category === SIMULATION_CATEGORY.PARTNER_SIM,
      },
      {
        id: "triggerWarningIds",
        label: "Trigger warnings",
        type: FORM_FIELD_TYPES.TAG_AND_DROPDOWN,
        tooltipLocation: TooltipLocation.TRIGGER_WARNINGS,
        // Full-width: the Competency dropdown that used to pair with this on
        // one row now lives next to the Behaviour Instructions table below.
        fullWidth: true,
      },
      // Difficulty Level is deprecated from the studio UI. It's no longer
      // author-editable; the backend defaults it to MEDIUM (and the scoring
      // state config falls back to MEDIUM when it's absent). Existing
      // scenarios keep whatever value they were saved with. The
      // `DIFFICULTY_LEVEL_OPTIONS` / `FORM_FIELD_IDS.DIFFICULTY_LEVEL`
      // constants are retained for read-only display (e.g. preview) and
      // back-compat.
      {
        id: "characterProfileSelector",
        label: "Character Profile Selector",
        type: FORM_FIELD_TYPES.CUSTOM.CHARACTER_PROFILE_SELECTOR,
        tooltipLocation: TooltipLocation.CHARACTER_PROFILE_SELECTOR,
        isMandatory: false,
        fullWidth: true,
      },
      {
        id: "characterProfileText",
        label: "Character Backstory",
        type: FORM_FIELD_TYPES.TEXT,
        tooltipLocation: TooltipLocation.CHARACTER_BACKSTORY,
        multiline: true,
        fullWidth: true,
        maxLength: 2500,
        isMandatory: false,
        enhanceType: ENHANCE_TYPE.CHARACTER_PROFILE_TEXT,
        promptVariable: "character_profile_text",
        hideWhenUnused: true,
      },
      {
        id: "customFields",
        label: "Custom Fields",
        type: FORM_FIELD_TYPES.CUSTOM_FIELDS,
        tooltipLocation: TooltipLocation.CUSTOM_FIELDS,
        fullWidth: true,
        // Custom fields exist solely to render `{custom_fields_text}` in the
        // prompt — no other consumer reads them. Hide the editor when the
        // selected variant doesn't reference that placeholder.
        promptVariable: "custom_fields_text",
        hideWhenUnused: true,
      },
      {
        id: "knowledgeSources",
        label: "Knowledge Sources",
        type: FORM_FIELD_TYPES.KNOWLEDGE_SOURCE,
        tooltipLocation: TooltipLocation.KNOWLEDGE_SOURCES,
        fullWidth: true,
        // Knowledge sources feed RAG retrieval, which substitutes
        // into `{retrieved_context}`. Variants that don't reference
        // that placeholder won't surface retrieved knowledge at
        // render time, so the field is useless.
        promptVariable: "retrieved_context",
        hideWhenUnused: true,
      },
      {
        id: "coverImageUrl",
        label: "Cover Image",
        type: FORM_FIELD_TYPES.IMAGE_UPLOAD,
        isMandatory: false,
        // Cover Image + Cover Video sit side by side as two upload tiles
        // rather than two full-width tiles stacked vertically.
        fullWidth: false,
        aiGenerate: true,
      },
      {
        id: "coverVideoUrl",
        label: "Cover Video",
        type: FORM_FIELD_TYPES.VIDEO_UPLOAD,
        isMandatory: false,
        // Pairs with Cover Image above on the same row (see note there).
        fullWidth: false,
      },
      {
        // Self-hides when the selected main-agent prompt does not declare hasStates=true.
        // Stored on Scenarios.metadata.states; runtime resolves the active state per turn score.
        id: "states",
        label: "States",
        type: FORM_FIELD_TYPES.CUSTOM.STATES_EDITOR,
        tooltipLocation: TooltipLocation.SESSION_STATES_PROGRESSION,
        fullWidth: true,
        isMandatory: false,
      },
      {
        // Sits directly above the Behaviour Instructions / Scoring Rubric
        // table: picking a competency auto-populates that table from the
        // competency's mapped helpful/unhelpful behaviours, so the control
        // is placed right next to the thing it drives.
        id: "competency",
        label: "Pick Competency",
        type: FORM_FIELD_TYPES.COMPETENCY,
        options: [],
        // Competency stays mandatory and always visible. It's not just
        // a prompt placeholder — it's a first-class scenario attribute
        // (identifies the counselor skill being trained, used by
        // analytics / organization / filtering). The `promptVariable`
        // declaration below is intentionally kept so studio authors
        // see `{competency}` in the chip list when editing a variant,
        // but there's no `hideWhenUnused` because the field is
        // structural metadata, not a prompt-only feeder field.
        isMandatory: true,
        promptVariable: "competency",
      },
      // The unified Behaviour Instructions table is always rendered.
      // Its rows drive the score-keeper via the SHOULD_DO/SHOULD_NOT_DO
      // → ±10 mapping in ally-be, regardless of whether the prompt body
      // references `{behavior_instructions_json}`. The component itself
      // is body-driven for the per-state coaching columns: when the
      // selected variant uses `{state_x_guidelines}` (the new score-
      // bounded states model), the legacy fixed-state cells (-1/1/2/3)
      // disappear and only category + behaviours remain. Otherwise the
      // full grid renders for backward compat with Prompt #1 style.
      {
        id: "behaviorInstructions",
        label: "Behaviour Instructions",
        type: FORM_FIELD_TYPES.CUSTOM.BEHAVIOURS_STATES_INSTRUCTION,
        fullWidth: true,
        isMandatory: false,
        // No Generate/Regenerate button: the table is now driven by the
        // selected competency's mapped helpful/unhelpful behaviours, so the
        // AI generation affordance is no longer needed here.
      },
      {
        id: "languageVoices",
        label: "Language-Voice",
        type: FORM_FIELD_TYPES.CUSTOM.LANGUAGE_VOICE_MAPPING,
        tooltipLocation: TooltipLocation.LANGUAGE_VOICE_MAPPING,
        isMandatory: true,
        fullWidth: true,
      },
      {
        id: "openingStatements",
        label: "Opening Dialogues",
        type: FORM_FIELD_TYPES.CUSTOM.OPENING_DIALOGUES,
        tooltipLocation: TooltipLocation.OPENING_DIALOGUE_TEMPLATES,
        fullWidth: true,
        isMandatory: false,
        promptVariable: "opening_statements",
        enhanceType: ENHANCE_TYPE.OPENING_STATEMENTS,
      },
      // Plain-text reminders shown to the learner during the live session —
      // deliberately NOT gated by a promptVariable: unlike Checklist items,
      // reminders never reach the agent's prompt or AI scoring, so there's no
      // ai-learn placeholder to gate visibility on. Enhance IS supported
      // (below) since it only rewrites the field's own content.
      {
        id: "reminders",
        label: "Reminders",
        type: FORM_FIELD_TYPES.CUSTOM.REMINDERS,
        fullWidth: true,
        isMandatory: false,
        enhanceType: ENHANCE_TYPE.REMINDERS,
      },
      {
        id: "linguisticStyleSamples",
        label: "Linguistic Style Samples",
        type: FORM_FIELD_TYPES.CUSTOM.LINGUISTIC_STYLE_SAMPLES,
        tooltipLocation: TooltipLocation.LINGUISTIC_STYLE_SAMPLES,
        isMandatory: false,
        fullWidth: true,
        // No FormField-level hideWhenUnused here — the inner
        // LinguisticStyleSamples component renders TWO independent
        // sub-panels (samples + filler words) and each self-gates on
        // its own placeholder (`{samples}` and `{allowed_fillers}`).
        // A single parent gate would couple them and force authors to
        // keep / drop both together, which doesn't match how variants
        // actually opt in to these features.
      },
      {
        id: "autoTerminationStatus",
        label: "Auto termination",
        type: FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE,
        tooltipLocation: TooltipLocation.AUTO_TERMINATION_RULES,
        fullWidth: true,
      },
      {
        id: "experienceMode",
        label: "Experience Mode",
        type: FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS,
        tooltipLocation: TooltipLocation.EXPERIENCE_MODE_TYPE,
        options: EXPERIENCE_MODE_OPTIONS,
        fullWidth: false,
        isMandatory: false,
      },
      {
        id: "checklistType",
        label: "Checklist Type",
        type: FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS,
        tooltipLocation: TooltipLocation.CHECKLIST_TYPE_VARIANT,
        options: CHECKLIST_TYPE_OPTIONS,
        fullWidth: false,
        dependsOn: "experienceMode",
        visibleWhen: (formValues: any) => formValues.experienceMode === ExperienceMode.CHECKLIST,
      },
      {
        id: "summaryChecklistEnabled",
        label: "Show Checklist In Session Summary",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: false,
        dependsOn: "experienceMode",
        visibleWhen: (formValues: any) => formValues.experienceMode === ExperienceMode.CHECKLIST,
        note: "Show the checklist on the learner's post-session summary. OFF for every roleplay by default — the in-session checklist panel is unaffected and keeps following Experience Mode.",
      },
      {
        id: "timerMode",
        label: "Session Timer",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        tooltipLocation: TooltipLocation.SESSION_TIMER,
      },
      {
        id: "maxTimeValue",
        label: "Maximum time",
        placeholder: "00:05:00 - 02:00:00",
        type: FORM_FIELD_TYPES.TIME_INPUT,
        tooltipLocation: TooltipLocation.SESSION_MAX_TIME,
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
        tooltipLocation: TooltipLocation.SCORE,
      },
      {
        id: "enableFeedback",
        label: "AI Feedback Summary",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        tooltipLocation: TooltipLocation.AI_FEEDBACK_SUMMARY,
      },
      {
        id: "pauseEnabled",
        label: "Allow Pause/Resume",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: false,
        tooltipLocation: TooltipLocation.ALLOW_PAUSE_RESUME,
      },
      {
        id: "isGlobal",
        label: "Default org-level visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        tooltipLocation: TooltipLocation.DEFAULT_ORG_VISIBILITY,
      },
      {
        id: "isPublic",
        label: "Public visibility",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        tooltipLocation: TooltipLocation.PUBLIC_VISIBILITY,
      },
      {
        id: "optGuardrails",
        label: "Conversational Guardrails",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        disabled: true,
        tooltipLocation: TooltipLocation.CONVERSATIONAL_GUARDRAILS,
      },
      {
        id: "temperature",
        label: "LLM Temperature",
        type: FORM_FIELD_TYPES.SLIDER,
        fullWidth: true,
        min: TEMPERATURE_MIN,
        max: TEMPERATURE_MAX,
        step: TEMPERATURE_STEP,
        defaultValue: TEMPERATURE_DEFAULT,
        note: "Controls response variability for this roleplay. Lower (0.2–0.4) keeps the persona tightly consistent; higher adds variety. Default 0.7.",
      },
      {
        id: "fillerEnabled",
        label: "Thinking Filler",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: false,
        tooltipLocation: TooltipLocation.THINKING_FILLER,
      },
      {
        id: "languageGlossaryEnabled",
        label: "Language Glossary",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        requiredPermission: "view:super-duper-admins",
        note: "Serve the per-language glossary (style card + retrieved sections) to this roleplay's non-English sessions. ON by default platform-wide; turning it off is a per-simulation escape hatch. Only languages with published glossary sections are affected. Super-duper-admin only.",
      },
      {
        id: "comfortAudioEnabled",
        label: "Comfort Audio",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: false,
        tooltipLocation: TooltipLocation.COMFORT_AUDIO,
      },
      {
        id: "comfortAudioUrl",
        label: "Comfort Audio Track",
        type: FORM_FIELD_TYPES.CUSTOM.COMFORT_AUDIO_TRACK,
        fullWidth: true,
        dependsOn: "comfortAudioEnabled",
        visibleWhen: (formValues: any) => formValues.comfortAudioEnabled === true,
        note: "Select an uploaded track to play as this roleplay's comfort audio. Leave unset to use the default room tone.",
      },
      {
        id: "comfortAudioVolume",
        label: "Comfort Audio Volume",
        type: FORM_FIELD_TYPES.SLIDER,
        fullWidth: true,
        min: COMFORT_AUDIO_VOLUME_MIN,
        max: COMFORT_AUDIO_VOLUME_MAX,
        step: COMFORT_AUDIO_VOLUME_STEP,
        defaultValue: COMFORT_AUDIO_VOLUME_DEFAULT,
        dependsOn: "comfortAudioEnabled",
        visibleWhen: (formValues: any) => formValues.comfortAudioEnabled === true,
        note: "How loud the comfort audio plays under the conversation (0 = silent, 1 = full).",
      },
      {
        id: "historyTrimEnabled",
        label: "Trim History",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        tooltipLocation: TooltipLocation.TRIM_HISTORY,
      },
      {
        id: "turnMaxEndpointingDelay",
        label: "Max Endpointing Delay (seconds)",
        type: FORM_FIELD_TYPES.NUMBER,
        fullWidth: true,
        placeholder: `Platform default (${TURN_MAX_ENDPOINTING_DELAY_MIN}-${TURN_MAX_ENDPOINTING_DELAY_MAX})`,
        note: "How long the agent waits for a learner who seems mid-thought before replying anyway. Lower = faster replies but more risk of interrupting; higher = fewer interruptions but more perceived delay. Leave blank to use the platform default.",
      },
      {
        id: "continuousBackchanneling",
        label: "Continuous Back-channeling",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: false,
        tooltipLocation: TooltipLocation.CONTINUOUS_BACKCHANNELING,
      },
      {
        id: "interimReplyEnabled",
        label: "Interim Reply",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        defaultValue: true,
        tooltipLocation: TooltipLocation.INTERIM_REPLY,
      },
      {
        id: "currentState",
        label: "Current State",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        tooltipLocation: TooltipLocation.CURRENT_STATE,
      },
      {
        id: "remindersEnabled",
        label: "Reminders",
        type: FORM_FIELD_TYPES.TOGGLE_BUTTON,
        fullWidth: true,
        tooltipLocation: TooltipLocation.REMINDERS_ENABLED,
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
    id: "occurrenceInterval",
    label: "Occurrence Interval",
    accessor: "occurrenceInterval",
    dataType: cellTypes.number,
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
    id: "preview",
    label: "Preview",
    accessor: "preview",
    dataType: cellTypes.previewAudio,
    minWidth: 120,
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
    id: "gender",
    label: "Gender",
    accessor: "gender",
    dataType: cellTypes.normalText,
    minWidth: 140,
  },
  {
    // Read-only summary of config, rendered from the provider's schema. The raw
    // JSON is edited field-by-field in the side panel, not inline here.
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
    // Picked from the Language Model registry rather than typed as JSON.
    // `options` is injected at render time — see LanguageManagement.
    id: "llmModelId",
    label: "Language Model",
    accessor: "llmModelId",
    dataType: cellTypes.dropdown,
    options: [] as { value: string; label: string }[],
    minWidth: 240,
  },
  {
    // Picked from the Speech Recognition registry rather than typed as JSON.
    // `options` is injected at render time from the registry — see
    // LanguageManagement.
    id: "sttConfigId",
    label: "Speech Recognition",
    accessor: "sttConfigId",
    dataType: cellTypes.dropdown,
    options: [] as { value: string; label: string }[],
    minWidth: 240,
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
    id: "name",
    label: "Prompt Name",
    accessor: "name",
    dataType: cellTypes.wrapText,
    minWidth: 500,
    editable: false,
  },
  {
    // Read-only marker for versions switched off in the studio picker; blank
    // for the normal (visible) case so the column is quiet until something is
    // actually hidden. Populated in PromptManagement.formatTableData. The
    // switch itself lives in the prompt side panel — this column exists only
    // so an admin can see at a glance which versions they've turned off,
    // without opening each one.
    id: "studioVisibility",
    label: "Studio",
    accessor: "studioVisibility",
    dataType: cellTypes.normalText,
    minWidth: 120,
    editable: false,
  },
  {
    // Coverage badge for translation-enabled main_agent/branching prompts;
    // blank for everything else. Populated in PromptManagement.formatTableData.
    id: "translationCoverage",
    label: "Translations",
    accessor: "translationCoverage",
    dataType: cellTypes.normalText,
    minWidth: 160,
    editable: false,
  },
  {
    id: "description",
    label: "Description",
    accessor: "description",
    dataType: cellTypes.wrapText,
    minWidth: 1000,
    editable: false,
  },
  {
    id: "createdAt",
    label: "Created Date",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 250,
    editable: false,
  },
];

export const CHARACTER_LIBRARY_TABLE_COLUMNS = [
  {
    id: "coverImageUrl",
    label: "Cover Image",
    accessor: "coverImageUrl",
    dataType: cellTypes.image,
    minWidth: 180,
  },
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
  {
    id: "characterProfileText",
    label: "Character Backstory",
    accessor: "characterProfileText",
    dataType: cellTypes.wrapText,
    minWidth: 300,
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

export const BEHAVIOUR_STATES = [
  { stateId: "-1", label: "State -1 Instructions" },
  { stateId: "1", label: "State 1 Instructions" },
  { stateId: "2", label: "State 2 Instructions" },
  { stateId: "3", label: "State 3 Instructions" },
];

export const VALID_STATE_INSTRUCTION_IDS = new Set(BEHAVIOUR_STATES.map(s => s.stateId));

export function isValidStateInstructionId(stateId: unknown): boolean {
  if (stateId === undefined || stateId === null) return false;
  return VALID_STATE_INSTRUCTION_IDS.has(String(stateId));
}

export const BEHAVIOURS_AND_STATES_INSTRUCTION_FIELD_MAX_LENGTH = 1000;

export const BEHAVIOURS_AND_STATES_INSTRUCTION_TABLE_COLUMNS = [
  {
    id: "category",
    label: "Category",
    accessor: "category",
    placeholder: "Select category",
    dataType: cellTypes.dropdown,
    options: BEHAVIOURS_INSTRUCTION_CATEGORIES,
    minWidth: 180,
    width: "14%",
  },
  {
    id: "behaviors",
    label: "Helper behaviour classes",
    accessor: "behaviors",
    placeholder: "Add behaviour",
    dataType: cellTypes.dropdownTags,
    minWidth: 220,
    width: "18%",
  },
  ...BEHAVIOUR_STATES.map(state => ({
    id: `stateInstruction_${state.stateId}`,
    label: state.label,
    accessor: `stateInstruction_${state.stateId}`,
    placeholder: "Add instruction",
    dataType: cellTypes.editableText,
    minWidth: 190,
    width: "17%",
    maxLength: BEHAVIOURS_AND_STATES_INSTRUCTION_FIELD_MAX_LENGTH,
  })),
];

export const TOOLTIPS_TABLE_COLUMNS = [
  {
    id: "location",
    label: "Location",
    accessor: "location",
    dataType: cellTypes.normalText,
    minWidth: 300,
  },
  {
    id: "tipText",
    label: "Tip Text",
    accessor: "tipText",
    dataType: cellTypes.wrapText,
    minWidth: 560,
  },
  {
    id: "active",
    label: "Active",
    accessor: "active",
    dataType: cellTypes.switch,
    minWidth: 130,
  },
  {
    id: "createdAt",
    label: "Created",
    accessor: "createdAt",
    dataType: cellTypes.normalText,
    minWidth: 160,
  },
];

/**
 * Maps prompt placeholder name → whether the corresponding simulation form
 * field is mandatory. Derived from SIMULATION_CREATOR_FIELD_GROUPS so it
 * stays in sync automatically when isMandatory changes on any field.
 */
export const PROMPT_VARIABLE_MANDATORY_MAP: ReadonlyMap<string, boolean> = (() => {
  const map = new Map<string, boolean>();
  for (const group of SIMULATION_CREATOR_FIELD_GROUPS) {
    for (const field of group.fields) {
      if (field.promptVariable) {
        map.set(field.promptVariable, Boolean(field.isMandatory));
      }
    }
  }
  return map;
})();
