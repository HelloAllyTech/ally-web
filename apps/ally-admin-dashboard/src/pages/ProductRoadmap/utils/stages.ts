import {
  RoadmapOpportunityEffort,
  RoadmapOpportunitySource,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
} from "@types";

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

/**
 * Shirt sizes for display. Stored lowercase (the wire format ally-be validates), shown uppercase
 * because "S" and "XXL" are how people say them — a select reading "s / m / l" looks like a bug.
 *
 * Ordered smallest-first, and this object's key order IS the order the drawer renders: a size
 * scale sorted any other way is unreadable, and alphabetical would give L, M, S, XL, XXL.
 */
export const EFFORT_LABEL: Record<RoadmapOpportunityEffort, string> = {
  [RoadmapOpportunityEffort.S]: "S",
  [RoadmapOpportunityEffort.M]: "M",
  [RoadmapOpportunityEffort.L]: "L",
  [RoadmapOpportunityEffort.XL]: "XL",
  [RoadmapOpportunityEffort.XXL]: "XXL",
};

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

/**
 * Stages that put an opportunity beyond splitting and merging.
 *
 * Mirrors ROADMAP_UNRESHAPEABLE_STAGES in ally-be's util/roadmap-stage.util.ts — that one is the
 * enforcement (a 409), this one only decides whether the control is offered. Keyed by raw wire
 * strings for the same reason STAGE_STYLE is: a stage the backend adds before this file catches
 * up falls through to "reshapeable" and the server refuses it, rather than the UI crashing.
 */
export const UNRESHAPEABLE_STAGES: string[] = ["released", "archived"];

export const isReshapeableStage = (stage: RoadmapOpportunityStage | string): boolean =>
  !UNRESHAPEABLE_STAGES.includes(stage);

/**
 * Why the control is dead, said on the control itself.
 *
 * A disabled Split with no explanation reads as a broken page — the same reasoning as the vote
 * stepper's "locked with a reason" state, which is the precedent this follows. Takes the stage so
 * the sentence names the one the reader is looking at rather than listing both.
 */
export const reshapeBlockedReason = (stage: RoadmapOpportunityStage | string): string =>
  `Already ${stageLabel(stage).toLowerCase()} — splitting or merging it would rewrite a record ` +
  `that release notes and its ship date already point at.`;
