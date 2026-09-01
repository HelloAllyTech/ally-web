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
  | "Promote Android"
  | "App Store Review Submission";

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
 * integer 1–100. `whatsNew` is optional — Google Play doesn't carry a
 * release's notes across tracks automatically, so omitting it (rather than
 * sending an empty string) promotes with no release notes at all, same as
 * before this field existed.
 *
 * Response shape is identical to TriggerMobileReleaseResponse
 * ({ dispatched: boolean }) — reused rather than duplicated.
 */
export interface TriggerAndroidPromotionRequest {
  rolloutPercentage: number;
  whatsNew?: string;
}

/**
 * POST /v1/mobile-releases/promote-ios-testflight — no request body. Submits
 * the latest TestFlight build to the external testers group, which kicks off
 * Apple's own asynchronous Beta App Review; it does not make the build
 * instantly available. Response shape is TriggerMobileReleaseResponse, reused
 * for the same reason as the Android promotion above.
 */

/**
 * POST /v1/mobile-releases/submit-ios-app-store-review request body. Both
 * fields are optional — `whatsNew` should be omitted (not sent as an empty
 * string) when the operator leaves the field blank, so the backend/workflow
 * leaves whatever "What's New" text is already set in App Store Connect
 * untouched rather than clearing it. Response shape is
 * TriggerMobileReleaseResponse, reused for the same reason as the Android
 * promotion above.
 */
export interface SubmitIosAppStoreReviewRequest {
  whatsNew?: string;
}

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

/**
 * One row of GET /v1/mobile-releases/ios-testflight-history — a past iOS
 * build's TestFlight submission state, distinct from
 * IosTestflightStatusResponse above which only covers the *current* build.
 * Unlike that current-build status, buildVersion/buildId here are always
 * present since a history row only exists for a build that was actually
 * uploaded.
 */
export interface IosTestflightHistoryEntry {
  buildVersion: string;
  buildId: string;
  uploadedDate: string;
  /** Null if the build was never submitted for review — same states as IosTestflightStatusResponse.betaReviewState. */
  betaReviewState: "WAITING_FOR_REVIEW" | "IN_REVIEW" | "REJECTED" | "APPROVED" | null;
}

/** GET /v1/mobile-releases/ios-testflight-history — sorted newest-uploaded first, up to 15 entries. */
export interface IosTestflightHistoryResponse {
  history: IosTestflightHistoryEntry[];
}

/**
 * One row of GET /v1/mobile-releases/ios-app-store-review-history — one of
 * Apple's own full App Store review submissions (real public distribution),
 * distinct from IosTestflightHistoryEntry above which only ever covers
 * TestFlight builds.
 */
export interface IosAppStoreReviewSubmissionEntry {
  versionString: string;
  submittedDate: string;
  /** Apple's raw reviewSubmissions state enum value, passed through verbatim. */
  state:
    | "READY_FOR_REVIEW"
    | "WAITING_FOR_REVIEW"
    | "IN_REVIEW"
    | "UNRESOLVED_ISSUES"
    | "CANCELING"
    | "COMPLETING"
    | "COMPLETE";
}

/** GET /v1/mobile-releases/ios-app-store-review-history — sorted newest-submitted first, up to 15 entries. */
export interface IosAppStoreReviewSubmissionsResponse {
  submissions: IosAppStoreReviewSubmissionEntry[];
}

/**
 * GET /v1/mobile-releases/ios-whats-new-suggestion — an LLM-generated draft of
 * the "What's New" App Store text, summarized server-side from the commits
 * since the last release. Gated by the same permission as the submit button
 * itself (SUBMIT_APP_STORE_REVIEW), but calls an LLM and costs real tokens,
 * so the frontend must only fetch this on-demand (when the operator is about
 * to open the submit dialog) — never automatically or on a poll.
 */
export interface IosWhatsNewSuggestionResponse {
  /** Null when there are no new commits since the last release to summarize. */
  suggestion: string | null;
}
