import { SimulationStatus } from "./createSimulation";

export interface ScenarioPath {
  id: number;
  title: string;
  description: string;
  coverImageUrl: string;
  status: SimulationStatus;
  isGlobal: boolean;
  totalScenarios: number;
  updatedAt: string;
}

export interface GetScenarioPathsQueryParams {
  status?: string;
  offset?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
}

export interface GetScenarioPathsResponse {
  data: ScenarioPath[];
}

export interface GetScenarioType {
  scenarioId: number;
  minimumScore: number;
  messageTitle: string;
  feedback: string;
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
  minimumScore: number;
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

export enum messageFieldId {
  messageTitle = "messageTitle",
  feedback = "feedback",
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
  renderMessage: (messageTitle: string, feedback: string, index: number) => JSX.Element;
  addButtonRef?: React.RefObject<(HTMLButtonElement | null)[]>;
}
