export interface Tooltip {
  id: string;
  location: string;
  tipText: string;
  active: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

/** Slim, public shape returned by GET /v1/tooltips/active (active rows only). */
export interface ActiveTooltip {
  id: string;
  location: string;
  tipText: string;
}
