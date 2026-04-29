export interface Tooltip {
  id: string;
  location: string;
  tipText: string;
  icon?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetTooltipsRequest {
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  order?: string;
}

export interface CreateTooltipRequest {
  location: string;
  tipText: string;
  icon?: string;
  active?: boolean;
}

export type UpdateTooltipRequest = Partial<CreateTooltipRequest>;
