import { describe, expect, it } from "vitest";

import { BugHuntEventStage } from "@types";

import { BUG_HUNT_EVENT_STAGE_LABELS } from "../bugHuntEventLabels";

describe("BUG_HUNT_EVENT_STAGE_LABELS", () => {
  // The drawer, the live board and the run-history table all index this map
  // with a stage that arrives as a plain string off the wire, so a stage
  // ally-be writes but this map has no entry for renders as an empty chip
  // rather than a type error. Every stage has to be covered here.
  it.each(Object.values(BugHuntEventStage))("labels %s", (stage) => {
    expect(BUG_HUNT_EVENT_STAGE_LABELS[stage]).toBeTruthy();
  });

  it("labels a reversal, written when a dismissal is proven wrong", () => {
    expect(BUG_HUNT_EVENT_STAGE_LABELS["reversed" as BugHuntEventStage]).toBe(
      "Dismissal reversed",
    );
  });
});
