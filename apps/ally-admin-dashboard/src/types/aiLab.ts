// AI Lab — skills (system-prompt templates), variables (template placeholders),
// and values (candidate substitutions bound to a variable).

export interface LabSkill {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabVariable {
  id: string;
  name: string;
  description?: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabValue {
  id: string;
  variableId: string;
  variable?: LabVariable;
  label?: string | null;
  value: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

/** Shape of the list endpoints' response envelope. */
export interface LabListResponse<T> {
  items: T[];
  count: number;
}

export interface LabListQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LabValueListQuery extends LabListQuery {
  variableId?: string;
}

export interface CreateLabSkillRequest {
  name: string;
  description?: string;
  content: string;
}
export type UpdateLabSkillRequest = Partial<CreateLabSkillRequest>;

export interface CreateLabVariableRequest {
  name: string;
  description?: string;
}
export type UpdateLabVariableRequest = Partial<CreateLabVariableRequest>;

export interface CreateLabValueRequest {
  variableId: string;
  label?: string;
  value: string;
}
export type UpdateLabValueRequest = Partial<CreateLabValueRequest>;
