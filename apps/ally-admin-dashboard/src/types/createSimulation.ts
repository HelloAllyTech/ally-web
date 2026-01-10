import { UseFormReturn } from "react-hook-form";

import { SessionEventDetectionData, triggerWarning, EventDetectionConfig } from "./simulation";
import { TriggerCondition } from "./triggerConditions";

export type FormData = {
  coverImageUrl: string;
  coverVideoUrl?: string;
  title: string;
  description: string;
  name: string;
  age: number;
  gender: string;
  genderIdentity: string;
  sexualOrientation: string;
  currentLocation: string;
  profession: string;
  context: string;
  sessionBehaviorGuidelines: string;
  roleInstruction: string;
  responseLength: string;
  openingDialogues: string;
  lifeHistory: string;
  coreMemories: string;
  personality: string;
  startingState: string;
  emotionalNeeds: string;
  tone: string;
  openingStatements: string;
  voiceId: string;
  agentGoal: string;
  autoTerminationStatus: boolean;
  terminationEventId: string;
  terminationName: string;
  terminationMessage: string;
  isGlobal: boolean;
  languageVoices?: Record<string, string>;
  triggerWarningIds: triggerWarning[];
  prompt: string;
  difficultyLevel: string;
  agentDialoguesArray: string;
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
}

export interface ScenarioVoiceConfig {
  model: string;
}

export interface ScenarioVoice {
  createdAt: string;
  updatedAt: string;
  id: string;
  name: string;
  provider: string;
  language?: string;
  config: ScenarioVoiceConfig;
}

export interface ScenarioLanguage {
  label: string;
  value: string;
  language_id?: number;
  translationCode?: string;
}
