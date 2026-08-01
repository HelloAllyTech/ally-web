import { UseFormReturn } from "react-hook-form";

import { EventDetectionConfig } from "@types";

import { AssignmentStatus } from "./organizationAccess";
import {
  SessionEventDetectionData,
  triggerWarning,
  stateInstruction,
  behaviourInstruction,
  Competency,
  SimulationCustomField,
  knowledgeSource,
} from "./simulation";
import { TriggerCondition } from "./triggerConditions";

export type FormData = {
  title: string;
  competency?: Competency;
  category?: string;
  partnerOrgName?: string;
  difficultyLevel: string;
  characterProfileSelector?: string;
  characterProfileText: string;
  coverImageUrl: string;
  coverVideoUrl?: string;
  isGlobal: boolean;
  isPublic: boolean;
  languageVoices?: Record<string, string>;
  linguisticStyleSamples?: Record<string, string[]>;
  allowedFillerWords?: Record<string, string[]>;
  languageCharacteristics?: Record<string, string>;
  fillerEnabled?: boolean;
  comfortAudioEnabled?: boolean;
  comfortAudioUrl?: string;
  comfortAudioVolume?: number;
  historyTrimEnabled?: boolean;
  continuousBackchanneling?: boolean;
  interimReplyEnabled?: boolean;
  temperature?: number;
  triggerWarningIds: triggerWarning[];
  description: string;
  prompt: string;
  behaviorInstructions?: behaviourInstruction[];
  stateInstructions?: stateInstruction[];
  customFields?: SimulationCustomField[];
  openingStatements: string;
  translationOpeningStatements?: Record<string, string[]>;
  openingDialoguePrimaryLanguageId?: number | null;
  translationDescription?: Record<string, string>;
  challengeDescriptionPrimaryLanguageId?: number | null;
  translationTitle?: Record<string, string>;
  reminders: string;
  /** Raw newline-joined text per language while editing — split into string[] at save time, mirroring `reminders`. */
  translationReminders?: Record<string, string>;
  remindersPrimaryLanguageId?: number | null;
  autoTerminationStatus?: boolean;
  experienceMode?: string;
  checklistType?: string;
  timerMode?: boolean;
  maxTimeValue?: string;
  showScoreMeter?: boolean;
  enableFeedback?: boolean;
  pauseEnabled?: boolean;
  optGuardrails?: boolean;
  currentState?: boolean;
  remindersEnabled?: boolean;
  knowledgeSources?: knowledgeSource[];
  /** Per-language main-agent prompt variant choice (GENERIC vs MULTILINGUAL). */
  mainPromptVariantByLanguage?: Record<string, "GENERIC" | "MULTILINGUAL">;
  /**
   * Per-language STT choices for this simulation, keyed by language ID and
   * pointing at stt_configs rows — the same shape as `languageVoices`. A
   * language absent from the map (or mapped to "") inherits its own default.
   */
  sttConfigByLanguage?: Record<string, string>;
};

/** A row from the STT registry (the Speech Recognition admin tab). */
export interface SttConfig {
  id: string;
  name: string;
  provider: string;
  config: Record<string, any>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SttConfigPayload = Omit<SttConfig, "id" | "createdAt" | "updatedAt">;

/** A row from the LLM registry (the Language Model admin tab). */
export interface LlmConfig {
  id: string;
  name: string;
  provider: string;
  /** Shape is governed by the registry's field schema, not this type. */
  config: Record<string, any>;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type LlmConfigPayload = Omit<LlmConfig, "id" | "createdAt" | "updatedAt">;

/**
 * Outcome of testing a saved LLM config against its provider.
 *
 * `ok: false` is a normal 200 response, not an HTTP error: a model that has
 * been retired is exactly what this call exists to report, and `error` carries
 * the provider's own wording so it can be shown verbatim.
 */
export interface LlmPreviewResult {
  ok: boolean;
  text: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
  configName: string;
  provider: string;
  model: string;
}

export interface DemographicsSectionProps {
  formMethods: UseFormReturn<FormData>;
}

export interface FormFieldConfig {
  id: keyof FormData;
  label: string;
  placeholder?: string;
  type: string;
  options?: Array<{ value: string; label: string }>;
  isMandatory?: boolean;
  isDashedLineAbove?: boolean;
  fullWidth?: boolean;
  /** SELECT only: show a clear (×) control that resets the value to "". */
  allowDeselect?: boolean;
  maxLength?: number;
  multiline?: boolean;
  defaultValue?: string;
  /** Slider (FORM_FIELD_TYPES.SLIDER) bounds. */
  min?: number;
  max?: number;
  step?: number;
  component?: React.ReactNode;
  dependsOn?: keyof FormData;
  note?: string;
  /**
   * When set, render a field-level "Improve" (Enhance) control for this field.
   * The value is one of ENHANCE_TYPE and identifies the field to the backend.
   */
  enhanceType?: string;
  visibleWhen?: (formValues: Partial<FormData>) => boolean;
  /**
   * Snake-case placeholder name this field fills in the main-agent prompt
   * (e.g. "tone" for the Tone input). When set, the studio cross-checks
   * the selected prompt's `availableVariables`; if the placeholder isn't
   * referenced, the field is rendered with a muted "Not used by selected
   * prompt" badge. Editing is still allowed because most of these fields
   * also feed evaluator / branching independently of the main
   * prompt.
   */
  promptVariable?: string;
  /**
   * When true together with `promptVariable`, hide the field entirely
   * (return null from FormField) instead of soft-labeling with a badge.
   * Use this for editors that exist purely to feed a prompt placeholder
   * (e.g. behavior_instructions_json, custom_fields_text). Don't use for
   * fields with parallel consumers (evaluator / branching).
   */
  hideWhenUnused?: boolean;
  /**
   * Gate this field behind a per-user feature flag (key under the current
   * user's `featureFlags` from /users/me). When set and the user lacks the
   * flag, the field is not rendered. Used for email-allowlisted features.
   */
  featureFlag?: string;
  /** When true, wrap the field in a collapsed accordion. */
  accordion?: boolean;
  /**
   * IMAGE_UPLOAD only: render the "Generate with AI" controls under the
   * upload tile. Generation uses the scenario's title/description form
   * values via the managed `cover_image_generation` prompt.
   */
  aiGenerate?: boolean;
  /**
   * `location` slug of a data-driven tooltip (see TooltipLocation). When set,
   * the field renders an info-icon tooltip whose text superadmins author under
   * Manage Tooltips. Currently consumed by toggle fields (ToggleSection).
   */
  tooltipLocation?: string;
}

export interface FieldGroupType {
  title?: string;
  fields: FormFieldConfig[];
}

export interface FormFieldProps {
  config: FormFieldConfig;
  formMethods: any;
  /** Render the field inert (View Details mode) — content visible, inputs untouchable. */
  readOnly?: boolean;
}

export interface FieldGroupProps {
  group: FieldGroupType;
  formMethods: any;
}

export interface CreatorFieldGroups {
  id: string;
  label: string;
  fields: FormFieldConfig[];
}

export interface Simulation {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  coverVideoUrl?: string;
  createdBy: string;
  updatedAt: string;
  status: SimulationStatus;
  category?: string | null;
  partnerOrgName?: string | null;
  isPreviewEnabled: boolean;
  isAssignedToTenant: boolean;
  usage: string;
  triggerWarnings?: triggerWarning[];
  createdByUserId: number;
  availableLanguages?: ScenarioLanguage[] | null;
}

export interface GetSimulationsQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
  search?: string;
  /** Comma-separated SimulationStatus values. */
  status?: string;
  /** Comma-separated ScenarioCategory values (ORIGINALS, DEMO, PARTNER_SIM…). */
  category?: string;
  /** Substring match on the partner organisation tag. */
  partnerOrgName?: string;
  tenantId?: string;
  assignmentStatus?: AssignmentStatus;
}
export interface GetSimulationsResponse {
  data: Simulation[];
  count?: number;
}

export interface GetSimulationByIdInput {
  id: string;
}

export enum SimulationStatus {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  ARCHIVED = "ARCHIVED",
  PUBLISHED = "PUBLISHED",
}

export type SimulationPreviewType = {
  id: string | number;
  title: string;
  coverImageUrl: string;
  coverVideoUrl?: string;
  description: string;
  triggerWarnings?: triggerWarning[];
  status: SimulationStatus;
  availableLanguages?: ScenarioLanguage[] | null;
};

export interface SimulationPreviewProps {
  simulation: SimulationPreviewType;
  isOpen: boolean;
  onClose: () => void;
}

export interface UpdateEventDataParam {
  id?: string;
  name?: string;
  eventCode?: string;
  description?: string;
  branchInstruction?: string;
  score?: number;
  message?: string;
  detectionType?: string;
  emoji?: string;
  visibilityType?: string;
  triggerCondition?: TriggerCondition;
  detectionData?: SessionEventDetectionData;
  detectionConfig?: EventDetectionConfig;
  isEditable?: boolean;
  tags?: string[];
}

export interface UpdateScenarioEventDataParam {
  id: { value: string; disabled: boolean; rowId?: string };
  name?: { value: string; disabled: boolean; rowId?: string };
  score?: { value: number; disabled: boolean; rowId?: string };
  emoji?: { value: string; disabled: boolean; rowId?: string };
  message?: { value: string; disabled: boolean; rowId?: string };
  feedbackStatus?: { value: boolean; disabled: boolean; rowId?: string };
  branchingStatus?: { value: boolean; disabled: boolean; rowId?: string };
  branchInstruction?: { value: string; disabled: boolean; rowId?: string };
  // Detection config fields
  maxOccurrences?: { value: number | null; disabled: boolean; rowId?: string };
  minGapTime?: { value: string | null; disabled: boolean; rowId?: string };
  startTime?: { value: string | null; disabled: boolean; rowId?: string };
  endTime?: { value: string | null; disabled: boolean; rowId?: string };
  minScore?: { value: number | null; disabled: boolean; rowId?: string };
  maxScore?: { value: number | null; disabled: boolean; rowId?: string };
  occurrenceInterval?: { value: number | null; disabled: boolean; rowId?: string };
  // Checklist visibility field
  checklistVisibilityStatus?: { value: boolean; disabled: boolean; rowId?: string };
  // Tags field
  tags?: { value: string[]; disabled: boolean; rowId?: string };
}

export interface ScenarioVoiceConfig {
  [key: string]: any;
}

export interface ScenarioVoice {
  createdAt?: string;
  updatedAt?: string;
  id?: string;
  name: string;
  provider: string;
  languageId?: number;
  languageLabel?: string | null;
  config: ScenarioVoiceConfig;
  active?: boolean;
}

export interface ScenarioLanguageConfig {
  [key: string]: any;
}

interface BaseLanguage {
  label: string;
  value: string;
  translationCode?: string;
  active?: boolean;
  llmProviderConfig?: ScenarioLanguageConfig;
  /**
   * @deprecated Superseded by `sttConfigId` (the Speech Recognition registry).
   * Still returned by the API as a fallback for rows the registry migration
   * could not map.
   */
  sttProviderConfig?: ScenarioLanguageConfig;
  /** This language's default STT, referencing an stt_configs row. */
  sttConfigId?: string | null;
  /** This language's default LLM, referencing an llm_configs row. */
  llmConfigId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScenarioLanguage extends BaseLanguage {
  id?: number;
  language_id?: number;
}

export interface Language extends BaseLanguage {
  id?: number;
}

export interface GetLanguagesQuery {
  searchName?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
  active?: boolean;
}

/**
 * Per-variable metadata used by the studio editor. Stored alongside (or
 * replacing) the bare placeholder names in {@link Prompt.availableVariables}.
 */
export interface AvailableVariable {
  /** Placeholder name as it appears in the prompt text (`{name}`). */
  name: string;
  /** Optional display label shown in the studio. */
  label?: string;
  /** Whether the studio should treat this field as required. */
  required?: boolean;
}

export type AvailableVariableEntry = string | AvailableVariable;

export interface Prompt {
  id?: string;
  name: string;
  description: string;
  category?: string;
  promptCode: string;
  prompt: string;
  version?: number;
  useDashboardOverride?: boolean;
  defaultPrompt?: string;
  createdAt?: string;
  updatedAt?: string;
  isObsolete?: boolean;
  /**
   * Source-synced variable placeholders available for runtime substitution.
   * Each entry is either a bare placeholder name (legacy) or an
   * `AvailableVariable` object with label / required metadata. Readers
   * should normalize via `getAvailableVariableName()`.
   */
  availableVariables?: AvailableVariableEntry[];
  kind?: string;
  /**
   * Role/category of this prompt in the agent pipeline.
   * Examples: 'main_agent', 'branching', 'multilingual'. Variants share the
   * same promptType — the studio prompt picker lists rows by promptType.
   */
  promptType?: string;
  /**
   * When true, this prompt declares a States section; the studio renders
   * the state editor and runtime substitutes the matched state's
   * guidelines into {state_x_guidelines} and gates RAG per state.
   */
  hasStates?: boolean;
  usesBlocks?: string[];
  /**
   * Prompt-level LLM provider override ('openai' | 'gemini' | 'anthropic'),
   * sent alongside `model` so runtimes don't infer it from the model name.
   */
  provider?: string;
  /**
   * Prompt-level LLM model override (OpenAI/Gemini). Sits between the
   * code/language defaults and any simulation-level value. Undefined =
   * inherit the code/language default.
   */
  model?: string;
  /**
   * Prompt-level LLM sampling temperature override (0–2). Undefined = inherit
   * the code/language default; a simulation-level temperature still wins.
   */
  temperature?: number;
  /**
   * Opt-in: when true, this English main_agent/branching source is auto-translated
   * into the eligible Indian languages and re-translated when its body changes.
   * Translations are read-only (shown in the Translations panel, not editable).
   */
  translationEnabled?: boolean;
  /** Count of languages whose translation is currently `ready` (drives the list coverage badge). */
  translationsReady?: number;
}

/** Lifecycle of one (prompt, language) translation (mirrors ally-be). */
export type PromptTranslationStatus = "pending" | "translating" | "ready" | "failed";

/** A stored translation row for a prompt in one language (read-only in the UI). */
export interface PromptTranslation {
  id: string;
  promptId: string;
  languageId: number;
  promptVersionId?: string | null;
  translatedPrompt?: string | null;
  sourceHash: string;
  status: PromptTranslationStatus;
  provider?: string | null;
  model?: string | null;
  /** Per-language runtime engine override: which model runs the main agent when this body is served. */
  runtimeProvider?: string | null;
  runtimeModel?: string | null;
  translationPromptVersion?: string | null;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Result of translating a prompt into all eligible languages. */
export interface TranslatePromptResult {
  promptId: string;
  eligible: boolean;
  reason?: string;
  translated: number;
  skipped: number;
  failed: number;
}

export type LlmProviderName = "openai" | "gemini" | "anthropic";

/** Runtimes that execute LLM calls (mirrors the ally-be LlmRuntime enum). */
export type LlmRuntime = "ai-learn" | "ally-ai" | "ally-be";

/**
 * One selectable LLM model from the backend registry
 * (GET /api/v1/llm/models). Single source of truth for the Prompt Management
 * model picker — see prompt-llm-config-standardization-adr.md.
 */
export interface LlmModelInfo {
  provider: LlmProviderName;
  /** Model id passed to the provider (e.g. 'gpt-4o', 'gemini-2.5-pro'). */
  model: string;
  /** Human-readable label for the picker. */
  label: string;
  /** False for reasoning models (o-series, gpt-5) that reject a custom temperature. */
  supportsTemperature: boolean;
  /** Runtimes that can actually run this model today. */
  runtimes: LlmRuntime[];
}

export interface GetPromptsQuery {
  searchName?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
  /** When false, excludes prompts with kind="block" */
  includeBlocks?: boolean;
}
