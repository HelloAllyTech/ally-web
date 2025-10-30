import { UseFormReturn } from "react-hook-form";

export type FormData = {
  coverImageUrl: string;
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
  lifeHistory: string;
  coreMemories: string;
  personality: string;
  startingState: string;
  emotionalNeeds: string;
  tone: string;
  openingStatements: string;
  voiceId: string;
  agentGoal: string;
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

export interface SimulationCreatorFieldGroups {
  id: string;
  label: string;
  fields: FormFieldConfig[];
}

export interface Simulation {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  createdBy: string;
  updatedAt: string;
  status: SimulationStatus;
  isPreviewEnabled: boolean;
  usage: number;
}

export interface GetSimulationsQueryParams {
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
  search?: string;
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
  COMMING_SOON = "COMMING_SOON",
}

export interface SimulationListProps {
  simulations: Simulation[];
  footer?: React.ReactNode;
  onEdit?: (simulation: Simulation) => void;
  onDelete?: (simulation: Simulation) => void;
  onPreview?: (simulation: Simulation) => void;
  onArchive?: (simulation: Simulation) => void;
  onUnpublish?: (simulation: Simulation) => void;
  onUnarchive?: (simulation: Simulation) => void;
}

export type SimulationPreviewType = {
  id: string;
  title: string;
  coverImageUrl: string;
  description: string;
};

export interface SimulationPreviewProps {
  simulation: SimulationPreviewType;
  isOpen: boolean;
  onClose: () => void;
}

export interface UpdateEventDataParam {
  id?: string;
  name?: string;
  description?: string;
  branchInstruction?: string;
  score?: number;
  message?: string;
  detectionType?: string;
  speaker?: string;
  emoji?: string;
  sentences?: string[];
  visibilityType?: string;
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
  config: ScenarioVoiceConfig;
}
