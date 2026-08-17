import { RoadmapOpportunityStage, RoadmapOpportunityType } from "@types";

/**
 * Stage and type presentation, in one place.
 *
 * Extracted when the month board arrived: a stage badge now renders in the table row, on a board
 * card and in the drawer, and three copies of this map is how "In development" ends up reading
 * "under_development" on exactly one of them.
 *
 * Keyed by the raw wire strings rather than the enum, so a stage value added by the backend
 * before the frontend enum catches up falls through to a lookup miss the callers already handle
 * (`?? STAGE_STYLE.new`) instead of a crash.
 */
export const STAGE_STYLE: Record<string, string> = {
  new: "bg-background-secondary text-typography-primary",
  prioritised: "bg-primary-100 text-primary-600",
  under_development: "bg-primary-50 text-primary-500",
  released: "bg-green-50 text-green-700",
  archived: "bg-background-secondary text-typography-secondary",
};

export const STAGE_LABEL: Record<string, string> = {
  new: "New",
  prioritised: "Prioritised",
  under_development: "In development",
  released: "Released",
  archived: "Archived",
};

export const typeLabel = (type: RoadmapOpportunityType | string): string =>
  type === RoadmapOpportunityType.BUG ? "Bug" : "Idea";

export const stageLabel = (stage: RoadmapOpportunityStage | string): string =>
  STAGE_LABEL[stage] ?? stage;

export const stageStyle = (stage: RoadmapOpportunityStage | string): string =>
  STAGE_STYLE[stage] ?? STAGE_STYLE.new;
