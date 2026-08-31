/**
 * The automated mobile release pipeline (a scheduled job that bumps the app
 * version and triggers the existing App Store / Play Store production build
 * workflows every ~2 days) and the GitHub Actions workflows it drives.
 *
 * "Promote Android" / "Promote iOS External" are the manually-triggered
 * promotion workflows (see triggerAndroidPromotion / triggerIosTestflightPromotion
 * below) rather than the scheduled pipeline itself.
 */
export type MobileReleaseWorkflowName =
  | "Scheduled Check"
  | "iOS Build"
  | "Android Build"
  | "Promote Android"
  | "Promote iOS External";

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
