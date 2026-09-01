import {
  IosAppStoreReviewSubmissionEntry,
  IosTestflightStatusResponse,
  MobileReleaseRun,
  MobileReleaseRunConclusion,
  MobileReleaseRunStatus,
  MobileReleaseWorkflowName,
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

/**
 * Deliberately never says "Live" — "completed" only means genuinely live to every user once
 * Managed Publishing is off for this app; with it on, this can still read "completed" while
 * Google is still holding the change for review or a manual publish click. "Fully rolled out"
 * describes what the API actually told us without asserting more certainty than that.
 */
export const getAndroidProductionStatusDisplay = (
  status: "draft" | "inProgress" | "halted" | "completed" | null,
  userFraction: number | null,
): MobileReleaseStatusDisplay => {
  switch (status) {
    case null:
      return { type: "cool-gray", label: "No release yet" };
    case "draft":
      return { type: "cool-gray", label: "Draft" };
    case "inProgress":
      return {
        type: "blue",
        label:
          userFraction != null
            ? `Staged rollout (${Math.round(userFraction * 100)}%)`
            : "Staged rollout",
      };
    case "halted":
      return { type: "red", label: "Rollout halted" };
    case "completed":
      return { type: "green", label: "Fully rolled out" };
    default:
      // Unrecognised value from Google — surface it raw rather than silently
      // mislabeling it as one of the known states.
      return { type: "cool-gray", label: status };
  }
};

/** True while any run from any of the three release workflows is still queued or executing. */
export const isReleaseInProgress = (runs: MobileReleaseRun[]): boolean =>
  runs.some(run => run.status === "queued" || run.status === "in_progress");

/**
 * Most recent *successful* run of a given workflow, or null if none exists
 * yet — used to derive a platform's "last release" date without a dedicated
 * backend field, since the run history already carries it.
 */
export const findLastSuccessfulRun = (
  runs: MobileReleaseRun[],
  workflowName: MobileReleaseWorkflowName,
): MobileReleaseRun | null =>
  runs.find(run => run.workflowName === workflowName && run.conclusion === "success") ?? null;

/** Most recent run of a workflow regardless of outcome — unlike findLastSuccessfulRun above, this surfaces a still-running or failed attempt too. */
export const findLastRun = (
  runs: MobileReleaseRun[],
  workflowName: MobileReleaseWorkflowName,
): MobileReleaseRun | null => runs.find(run => run.workflowName === workflowName) ?? null;

/**
 * True if `laterRun`'s createdAt is strictly after `earlierRun`'s — used to approximate "this
 * run is for the build that just happened," since Android runs carry no version string to match
 * on directly the way iOS's App Store Connect resources do.
 */
export const isRunAfter = (
  laterRun: MobileReleaseRun | null | undefined,
  earlierRun: MobileReleaseRun | null | undefined,
): boolean => {
  if (!laterRun || !earlierRun) return false;
  return new Date(laterRun.createdAt).getTime() > new Date(earlierRun.createdAt).getTime();
};

/**
 * The single most useful thing to tell an admin about what to do next,
 * derived only from signals this page can actually verify — never a guess
 * dressed up as certainty. Deliberately silent on Android: there is no
 * available signal for "has this internal-track build been promoted to
 * production yet" (Play Console doesn't expose that through anything this
 * page calls), so rather than fabricate an Android action, this only ever
 * speaks to iOS, where the App Store review history gives a real answer.
 */
export type RecommendedActionSeverity = "action" | "attention" | "clear";

export interface RecommendedAction {
  severity: RecommendedActionSeverity;
  title: string;
  description: string;
  /** Present only when severity is "action" — the one button this banner should offer. */
  actionKind?: "submit-ios-review";
}

const NO_ACTION: RecommendedAction = {
  severity: "clear",
  title: "Nothing needs your attention",
  description: "No pending review submissions or unresolved issues right now.",
};

export const deriveRecommendedAction = (
  testflightStatus: IosTestflightStatusResponse | undefined,
  appStoreReviewHistory: IosAppStoreReviewSubmissionEntry[],
): RecommendedAction => {
  if (!testflightStatus?.buildVersion) return NO_ACTION;

  const matchingSubmission = appStoreReviewHistory.find(
    entry => entry.versionString === testflightStatus.buildVersion,
  );

  if (!matchingSubmission) {
    return {
      severity: "action",
      title: `iOS ${testflightStatus.buildVersion} hasn't been submitted for App Store review yet`,
      description:
        "The current build has finished processing in App Store Connect. Submit it for full review when the listing (screenshots, description, What's New) is ready.",
      actionKind: "submit-ios-review",
    };
  }

  if (matchingSubmission.state === "UNRESOLVED_ISSUES") {
    return {
      severity: "attention",
      title: `iOS ${testflightStatus.buildVersion} has unresolved issues from Apple`,
      description: "Check App Store Connect for what Apple flagged before it can move forward.",
    };
  }

  if (matchingSubmission.state === "COMPLETE") {
    return {
      severity: "attention",
      title: `iOS ${testflightStatus.buildVersion} has completed review`,
      description:
        "Apple has finished reviewing this version. Release it manually in App Store Connect when you're ready for real users to get it.",
    };
  }

  // WAITING_FOR_REVIEW / IN_REVIEW / READY_FOR_REVIEW / CANCELING / COMPLETING
  // — already submitted and moving through Apple's own process; nothing for
  // the admin to do but wait.
  return NO_ACTION;
};

/**
 * X.Y.Z is the only format ally-mobile's build.gradle/pbxproj ever produce —
 * same format ally-be's app-version DTOs now require at the API boundary.
 * Validating it here too means a typo is caught before the confirmation
 * dialog's primary button even goes live, not after a failed request.
 */
const VERSION_FORMAT_REGEX = /^\d+\.\d+\.\d+$/;

export const isValidVersionFormat = (version: string): boolean =>
  VERSION_FORMAT_REGEX.test(version.trim());

/**
 * True only when both `candidate` and `reference` are well-formed X.Y.Z and
 * `candidate` is numerically greater — never true for a malformed value, so
 * this can't be used to wave through something format validation should
 * have already rejected. Used to stop a force-update minimum from being set
 * above the version this page even knows was built yet, let alone
 * published — the cheapest version of the runbook's safety gate this page
 * can check on its own, though it still can't confirm a version is actually
 * *live*, only that it's at least been built.
 */
export const isVersionGreaterThan = (candidate: string, reference: string): boolean => {
  if (!isValidVersionFormat(candidate) || !isValidVersionFormat(reference)) return false;
  const a = candidate.trim().split(".").map(Number);
  const b = reference.trim().split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};
