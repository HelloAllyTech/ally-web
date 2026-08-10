import { SimulationStatus } from "./createSimulation";
import { AssignmentStatus } from "./organizationAccess";

export interface ScenarioPath {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
  isGlobal: boolean;
  totalScenarios: number;
  updatedAt: string;
  isAssignedToTenant: boolean;
}

export interface GetScenarioPathsQueryParams {
  status?: string;
  offset?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
  assignmentStatus?: AssignmentStatus;
}

export interface GetScenarioPathsResponse {
  data: ScenarioPath[];
  count?: number;
}

export interface GetScenarioType {
  scenarioId: number;
  minimumScore?: number;
  messageTitle: string;
  messageContent: string;
  order: number;
  coverImageUrl: string;
  title: string;
  description: string;
}

export interface GetPathByIdResponse {
  title: string;
  description: string;
  coverImageUrl: string;
  isGlobal: boolean;
  status: SimulationStatus;
  scenarios: GetScenarioType[];
}

interface scenarioType {
  scenarioId: number | string;
  minimumScore?: number;
  message: string;
  order: number;
}

export interface CreatePathInput {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  isGlobal?: boolean;
  status?: SimulationStatus;
  scenarios?: scenarioType;
}

export interface CreatePathResponse {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
}

export enum messageFieldId {
  messageTitle = "messageTitle",
  messageContent = "messageContent",
}
export interface MessageFields {
  id: messageFieldId;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

export interface SimulationCardItemProps {
  simulation: GetScenarioType;
  index: number;
  selectedSimulations: GetScenarioType[];
  setSelectedSimulations: (simulations: GetScenarioType[]) => void;
  openMessageIndex: number | null;
  setOpenMessageIndex: (index: number | null) => void;
  handleMessageClick: (index: number) => void;
  renderMessage: (messageTitle: string, messageContent: string, index: number) => JSX.Element;
  addMessageRef?: React.RefObject<(HTMLDivElement | null)[]>;
  isDisabled?: boolean;
}
