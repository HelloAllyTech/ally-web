import { BugHuntEventStage } from "@types";

/** Short, scannable label per timeline stage — used by both the live run card and the run-detail timeline. */
export const BUG_HUNT_EVENT_STAGE_LABELS: Record<BugHuntEventStage, string> = {
  [BugHuntEventStage.SKIPPED_DISABLED]: "Skipped — off",
  [BugHuntEventStage.FINDER_RESULT]: "Found",
  [BugHuntEventStage.VERIFY]: "Verified",
  [BugHuntEventStage.FIX_ATTEMPT]: "Fix attempt",
  [BugHuntEventStage.TEST_WRITTEN]: "Regression test written",
  [BugHuntEventStage.DOC_UPDATED]: "Doc updated",
  [BugHuntEventStage.PR_OPENED]: "PR opened",
  [BugHuntEventStage.MERGED]: "Merged",
  [BugHuntEventStage.ESCALATED]: "Escalated",
  [BugHuntEventStage.ERROR]: "Error",
  [BugHuntEventStage.SETTINGS_CHANGED]: "Setting changed",
  [BugHuntEventStage.SESSION_DISPATCHED]: "Fix session started",
  [BugHuntEventStage.PLAN_CREATED]: "Multi-repo plan created",
  [BugHuntEventStage.STEP_STARTED]: "Step started",
  [BugHuntEventStage.RELEASE_DISPATCHED]: "Release started",
  [BugHuntEventStage.RELEASED]: "Released",
  [BugHuntEventStage.RELEASE_FAILED]: "Release failed",
};
