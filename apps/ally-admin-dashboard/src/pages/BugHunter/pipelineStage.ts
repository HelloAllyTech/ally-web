import { BugFindingStatus } from "@types";

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
 * stage for them. CANCELLED sits at "fix" too — a fix session in progress is
 * what an admin stopped — but pairs with no variant override, the same as
 * DISMISSED/REJECTED: it is a deliberate human stop, not a failure.
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
    case BugFindingStatus.CANCELLED:
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
