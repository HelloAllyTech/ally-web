import { RoadmapOpportunitySource, RoadmapOpportunityStage, RoadmapOpportunityType } from "@types";

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

export const SOURCE_LABEL: Record<string, string> = {
  staff: "Staff",
  consumer: "Consumer",
};

/**
 * 'staff' is the default and every pre-existing row's value — badging it on every row would be
 * noise, not signal (Stacks: "Default to Common Case, Hide Alternatives"). Only 'consumer' gets
 * a badge, so a bug filed through the in-app "Report a problem" form is the thing that stands out.
 */
export const isConsumerSourced = (source: RoadmapOpportunitySource | string): boolean =>
  source === RoadmapOpportunitySource.CONSUMER;

export const SOURCE_BADGE_STYLE = "bg-purple-50 text-purple-700";
