import { UseFormReturn } from "react-hook-form";

import { EventDetectionConfig } from "@types";

import {
  SessionEventDetectionData,
  triggerWarning,
  stateInstruction,
  behaviourInstruction,
  Competency,
  CustomFieldType,
  knowledgeSource,
} from "./simulation";
import { TriggerCondition } from "./triggerConditions";

export type FormData = {
  title: string;
  competency?: Competency;
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
  triggerWarningIds: triggerWarning[];
  description: string;
  prompt: string;
  behaviorInstructions?: behaviourInstruction[];
  stateInstructions?: stateInstruction[];
  customFields?: CustomFieldType[];
  openingStatements: string;
  translationOpeningStatements?: Record<string, string[]>;
  openingDialoguePrimaryLanguageId?: number | null;
  tone: string;
  autoTerminationStatus?: boolean;
  experienceMode?: string;
  checklistType?: string;
  timerMode?: boolean;
  maxTimeValue?: string;
  showScoreMeter?: boolean;
  optGuardrails?: boolean;
  currentState?: boolean;
  knowledgeSources?: knowledgeSource[];
};

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
  maxLength?: number;
  multiline?: boolean;
  defaultValue?: string;
  component?: React.ReactNode;
  dependsOn?: keyof FormData;
  note?: string;
  regenerateType?: string;
  visibleWhen?: (formValues: Partial<FormData>) => boolean;
}

export interface FieldGroupType {
  title?: string;
  fields: FormFieldConfig[];
}

export interface FormFieldProps {
  config: FormFieldConfig;
  formMethods: any;
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
  isPreviewEnabled: boolean;
  isAssignedToTenant: boolean;
  usage: string;
  triggerWarnings?: triggerWarning[];
  createdByUserId: number;
}

export interface GetSimulationsQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
  search?: string;
  tenantId?: string;
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
};

export interface SimulationPreviewProps {
  simulation: SimulationPreviewType;
  isOpen: boolean;
  onClose: () => void;
  languages?: ScenarioLanguage[];
  selectedLanguageId?: number;
  onLanguageChange?: (languageId: number | null) => void;
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
  sttProviderConfig?: ScenarioLanguageConfig;
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
  /** Source-synced variable placeholders available for runtime substitution */
  availableVariables?: string[];
  kind?: string;
  usesBlocks?: string[];
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
