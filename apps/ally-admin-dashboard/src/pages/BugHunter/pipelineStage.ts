import { BugFindingStatus, BugHuntEventStage } from "@types";

/**
 * The six macro-stages `PipelineRail` visualizes for one bug/run, chosen to
 * mirror the domain precisely — the same order as the drawer's own existing
 * PR -> Merge -> Release button flow, so the rail and the actions underneath
 * it never disagree about what "done" means.
 *
 * Kept separate from `agentPersona.ts`, whose docblock scopes it to "who Bug
 * Hunter is": this is display/derivation logic, not persona logic.
 */
export type PipelineStage = "scan" | "verify" | "fix" | "review" | "merged" | "ship";

export const PIPELINE_STAGES: PipelineStage[] = [
  "scan",
  "verify",
  "fix",
  "review",
  "merged",
  "ship",
];

/**
 * Maps the latest progression-relevant `BugHuntEvent` stage to a rail
 * position, for `LiveRunCard`.
 *
 * `SETTINGS_CHANGED` never represents the pipeline moving — it is a
 * working-style change that happened to land mid-run — and `ERROR`/
 * `ESCALATED` stop progress rather than advance it, so `LiveRunCard` applies
 * its error/waiting overlay for those instead of asking this function to
 * invent a stage for them. Callers are expected to skip all three when
 * picking "the latest event" to feed in here; the "scan" returned for them
 * below is just an inert fallback if one slips through.
 */
export const stageFromEventStage = (stage: BugHuntEventStage): PipelineStage => {
  switch (stage) {
    case BugHuntEventStage.SKIPPED_DISABLED:
    case BugHuntEventStage.FINDER_RESULT:
      return "scan";
    case BugHuntEventStage.VERIFY:
      return "verify";
    case BugHuntEventStage.FIX_ATTEMPT:
    case BugHuntEventStage.TEST_WRITTEN:
    case BugHuntEventStage.DOC_UPDATED:
    case BugHuntEventStage.SESSION_DISPATCHED:
    case BugHuntEventStage.PLAN_CREATED:
    case BugHuntEventStage.STEP_STARTED:
      return "fix";
    case BugHuntEventStage.PR_OPENED:
      return "review";
    case BugHuntEventStage.MERGED:
      return "merged";
    case BugHuntEventStage.RELEASE_DISPATCHED:
    case BugHuntEventStage.RELEASED:
    case BugHuntEventStage.RELEASE_FAILED:
      return "ship";
    case BugHuntEventStage.ESCALATED:
    case BugHuntEventStage.ERROR:
    case BugHuntEventStage.SETTINGS_CHANGED:
      return "scan";
    default:
      return "scan";
  }
};

/**
 * Maps a finding's lifecycle status to a rail position, for `BugFindingDrawer`.
 *
 * NEW/PENDING_APPROVAL/APPROVED/QUEUED/BLOCKED all sit at "verify": a finding
 * record cannot exist without having already been scanned, so "verify" — not
 * "scan" — is the accurate "recorded, but the fix stage hasn't started yet"
 * position on this rail. DISMISSED and REJECTED render there too, since that
 * is genuinely where those decisions get made (an approval that never came,
 * or one actively declined) — they are terminal off-ramps from the pipeline
 * rather than a stop further along it.
 *
 * FAILED sits at "fix" (a fix attempt is what failed); RELEASE_FAILED sits at
 * "ship" (a release attempt is what failed). Both pair with the drawer's own
 * `error` variant override rather than this function inventing a seventh
 * stage for them.
 */
export const stageFromFindingStatus = (status: BugFindingStatus): PipelineStage => {
  switch (status) {
    case BugFindingStatus.NEW:
    case BugFindingStatus.PENDING_APPROVAL:
    case BugFindingStatus.APPROVED:
    case BugFindingStatus.QUEUED:
    case BugFindingStatus.BLOCKED:
    case BugFindingStatus.DISMISSED:
    case BugFindingStatus.REJECTED:
      return "verify";
    case BugFindingStatus.COORDINATING:
    case BugFindingStatus.FIXING:
    case BugFindingStatus.NEEDS_INPUT:
    case BugFindingStatus.FAILED:
      return "fix";
    case BugFindingStatus.PR_OPENED:
      return "review";
    case BugFindingStatus.MERGED:
      return "merged";
    case BugFindingStatus.RELEASING:
    case BugFindingStatus.RELEASED:
    case BugFindingStatus.RELEASE_FAILED:
      return "ship";
    default:
      return "scan";
  }
};
