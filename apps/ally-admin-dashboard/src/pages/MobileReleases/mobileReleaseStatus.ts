import {
  IosTestflightStatusResponse,
  MobileReleaseRunConclusion,
  MobileReleaseRunStatus,
} from "@types";

/**
 * Status-tag colour + label for a mobile-release CI run, following the same
 * idea as Builder's BUILDER_RUN_STATUS_TAG_TYPE (pages/Builder/builderMotion.ts):
 * defined once so the run-history table never drifts into describing the same
 * state two different ways.
 *
 * Unlike Builder's own run status, GitHub Actions reports a run's state as
 * two separate fields rather than one enum — `status` (queued / in_progress /
 * completed) and, only once completed, `conclusion` (success / failure /
 * cancelled / skipped). This collapses that pair into a single Carbon Tag
 * type + label so the table has one thing to render per row.
 */
export type MobileReleaseTagType =
  | "blue"
  | "teal"
  | "purple"
  | "magenta"
  | "green"
  | "red"
  | "cool-gray";

export interface MobileReleaseStatusDisplay {
  type: MobileReleaseTagType;
  label: string;
}

export const getMobileReleaseRunStatusDisplay = (
  status: MobileReleaseRunStatus,
  conclusion: MobileReleaseRunConclusion,
): MobileReleaseStatusDisplay => {
  if (status === "queued") return { type: "cool-gray", label: "Queued" };
  if (status === "in_progress") return { type: "blue", label: "In progress" };

  switch (conclusion) {
    case "success":
      return { type: "green", label: "Success" };
    case "failure":
      return { type: "red", label: "Failed" };
    case "cancelled":
      return { type: "cool-gray", label: "Cancelled" };
    case "skipped":
      return { type: "cool-gray", label: "Skipped" };
    default:
      // Completed with no recognised conclusion — surface the raw value
      // rather than silently mislabeling it as one of the known outcomes.
      return { type: "cool-gray", label: conclusion ?? status };
  }
};

/**
 * Status-tag colour + label for the current iOS build's live TestFlight
 * state — same idea as getMobileReleaseRunStatusDisplay above, collapsing
 * the backend's `{ buildVersion, betaReviewState, externalGroupAssigned }`
 * (GET /v1/mobile-releases/ios-testflight-status) into one Carbon Tag type +
 * label.
 *
 * `betaReviewState` is Apple's own raw Beta App Review value, passed through
 * by the backend — mirrors how this file already treats GitHub Actions'
 * status/conclusion as a passthrough rather than remapping it to our own
 * enum.
 */
export const getTestflightStatusDisplay = (
  status: IosTestflightStatusResponse,
): MobileReleaseStatusDisplay => {
  // No processed build exists yet — distinct from "never submitted for
  // review", which is a state a real build can be in.
  if (status.buildVersion === null) return { type: "cool-gray", label: "No processed build yet" };

  switch (status.betaReviewState) {
    case null:
      // App Store Connect itself calls this state "Ready to Submit".
      return { type: "cool-gray", label: "Ready to Submit" };
    case "WAITING_FOR_REVIEW":
      return { type: "blue", label: "Waiting for Review" };
    case "IN_REVIEW":
      return { type: "blue", label: "In Review" };
    case "APPROVED":
      // What Apple actually calls it once approved for external testers.
      return { type: "green", label: "Ready to Test" };
    case "REJECTED":
      return { type: "red", label: "Rejected" };
    default:
      // Unrecognised value from Apple — surface it raw rather than silently
      // mislabeling it as one of the known states.
      return { type: "cool-gray", label: status.betaReviewState };
  }
};
