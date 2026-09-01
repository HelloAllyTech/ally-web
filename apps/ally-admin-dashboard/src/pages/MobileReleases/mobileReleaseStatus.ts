import {
  IosAppStoreReviewSubmissionEntry,
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
 * Status-tag colour + label for an iOS build's TestFlight review state —
 * same idea as getMobileReleaseRunStatusDisplay above, collapsing
 * `{ buildVersion, betaReviewState }` into one Carbon Tag type + label.
 *
 * `betaReviewState` is Apple's own raw Beta App Review value, passed through
 * by the backend — mirrors how this file already treats GitHub Actions'
 * status/conclusion as a passthrough rather than remapping it to our own
 * enum.
 *
 * Takes only the two fields it needs (rather than the full
 * IosTestflightStatusResponse from GET /v1/mobile-releases/ios-testflight-status)
 * so the same function also works for each row of
 * IosTestflightHistoryEntry (GET /v1/mobile-releases/ios-testflight-history)
 * — both shapes carry buildVersion + betaReviewState, so there's no need for
 * a second, near-duplicate mapping function for the history table.
 */
export const getTestflightStatusDisplay = (
  status: Pick<IosTestflightStatusResponse, "buildVersion" | "betaReviewState">,
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

/**
 * Status-tag colour + label for one of Apple's own full App Store review
 * submissions (the reviewSubmissions `state` enum) — distinct from
 * getTestflightStatusDisplay above, which covers TestFlight's separate
 * betaAppReviewSubmissions state. Same passthrough-rather-than-remap
 * approach as the rest of this file.
 */
export const getAppStoreReviewSubmissionStatusDisplay = (
  state: IosAppStoreReviewSubmissionEntry["state"],
): MobileReleaseStatusDisplay => {
  switch (state) {
    case "READY_FOR_REVIEW":
      return { type: "cool-gray", label: "Ready for Review" };
    case "WAITING_FOR_REVIEW":
      return { type: "blue", label: "Waiting for Review" };
    case "IN_REVIEW":
      return { type: "blue", label: "In Review" };
    case "UNRESOLVED_ISSUES":
      return { type: "red", label: "Unresolved Issues" };
    case "CANCELING":
      return { type: "cool-gray", label: "Canceling" };
    case "COMPLETING":
      return { type: "teal", label: "Completing" };
    case "COMPLETE":
      // What App Store Connect's own UI calls this state ("Review Completed").
      return { type: "green", label: "Review Completed" };
    default:
      // Unrecognised value from Apple — surface it raw rather than silently
      // mislabeling it as one of the known states.
      return { type: "cool-gray", label: state };
  }
};
