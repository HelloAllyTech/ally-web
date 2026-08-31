/**
 * The automated mobile release pipeline (a scheduled job that bumps the app
 * version and triggers the existing App Store / Play Store production build
 * workflows every ~2 days) and the GitHub Actions workflows it drives.
 *
 * "Promote Android" is the manually-triggered production-promotion workflow
 * (see triggerAndroidPromotion below) rather than the scheduled pipeline
 * itself. iOS TestFlight-external promotion used to have a matching manual
 * workflow/entry here too; removed once submission became fully automatic
 * and this org's actual testers turned out to all be Internal, not External.
 */
export type MobileReleaseWorkflowName =
  | "Scheduled Check"
  | "iOS Build"
  | "Android Build"
  | "Promote Android";

/** GitHub Actions' own run-status values — not our own enum, so this stays a passthrough of their API. */
export type MobileReleaseRunStatus = "queued" | "in_progress" | "completed";

/**
 * GitHub Actions' own run-conclusion values. Only populated once `status` is
 * `"completed"` — `null` while the run is queued or in progress.
 */
export type MobileReleaseRunConclusion = "success" | "failure" | "cancelled" | "skipped" | null;

/** One row of GET /v1/mobile-releases/runs, sorted newest first. */
export interface MobileReleaseRun {
  /** GitHub's own run id, as a string — see MobileReleaseRunDto on the backend. */
  id: string;
  workflowName: MobileReleaseWorkflowName;
  status: MobileReleaseRunStatus;
  conclusion: MobileReleaseRunConclusion;
  /** The real GitHub Actions run, for "view on GitHub". */
  htmlUrl: string;
  /** Who/what triggered the run — the scheduled workflow's actor is `github-actions[bot]`. */
  actor: string | null;
  headSha: string;
  headCommitMessage: string | null;
  createdAt: string;
  updatedAt: string;
  /** Null until GitHub actually starts running the job — a queued run has no start time yet. */
  runStartedAt: string | null;
}

export interface MobileReleaseAndroidVersion {
  versionCode: number;
  versionName: string;
}

export interface MobileReleaseIosVersion {
  marketingVersion: string;
}

/** GET /v1/mobile-releases/current-version. */
export interface CurrentMobileVersionsResponse {
  android: MobileReleaseAndroidVersion;
  ios: MobileReleaseIosVersion;
  /**
   * Estimate of when the automated pipeline could next act — `null` when the
   * backend has no estimate. Not a guarantee: the scheduled check still does
   * nothing unless there are new commits by then, which the backend can't
   * know in advance.
   */
  nextEligibleCheckAt: string | null;
}

/** POST /v1/mobile-releases/trigger — fires both platforms' build workflows immediately. */
export interface TriggerMobileReleaseResponse {
  dispatched: boolean;
}

/**
 * POST /v1/mobile-releases/promote-android request body — promotes the
 * current internal-track Android build straight to the Play Store
 * **production** track at a staged rollout. `rolloutPercentage` is an
 * integer 1–100.
 *
 * Response shape is identical to TriggerMobileReleaseResponse
 * ({ dispatched: boolean }) — reused rather than duplicated.
 */
export interface TriggerAndroidPromotionRequest {
  rolloutPercentage: number;
}

/**
 * POST /v1/mobile-releases/promote-ios-testflight — no request body. Submits
 * the latest TestFlight build to the external testers group, which kicks off
 * Apple's own asynchronous Beta App Review; it does not make the build
 * instantly available. Response shape is TriggerMobileReleaseResponse, reused
 * for the same reason as the Android promotion above.
 */

/**
 * GET /v1/mobile-releases/ios-testflight-status — the current iOS build's
 * live TestFlight state, read straight from App Store Connect, so the admin
 * can see it without opening App Store Connect themselves.
 */
export interface IosTestflightStatusResponse {
  /** Null if no processed build exists yet. */
  buildVersion: string | null;
  buildId: string | null;
  /**
   * Apple's own raw Beta App Review state — passed through rather than
   * remapped, same approach as MobileReleaseRunStatus/MobileReleaseRunConclusion
   * above for GitHub Actions. Null if the build was never submitted for
   * review (App Store Connect itself calls that state "Ready to Submit").
   */
  betaReviewState: "WAITING_FOR_REVIEW" | "IN_REVIEW" | "REJECTED" | "APPROVED" | null;
  externalGroupAssigned: boolean;
}
