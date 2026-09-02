import { FC, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  Button,
  CarbonTabs as Tabs,
  InlineLoading,
  NumberInput,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  TextArea,
  TextInput,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useGetMinimumAndroidVersionQuery,
  useGetMinimumIosVersionQuery,
  useLazyGetIosWhatsNewSuggestionQuery,
  useSubmitIosAppStoreReviewMutation,
  useTriggerAndroidPromotionMutation,
  useTriggerMobileReleaseMutation,
  useUpdateMinimumAppVersionMutation,
} from "@api";
import { ActionConfirmationPopup } from "@components";
import { en } from "@constants";
import { formatDateTime } from "@utils";

import { AndroidReleasePipeline } from "./components/AndroidReleasePipeline";
import { IosReleasePipeline } from "./components/IosReleasePipeline";
import { NextCheckPanel } from "./components/NextCheckPanel";
import { PlatformStatusCard } from "./components/PlatformStatusCard";
import { RecommendedActionBanner } from "./components/RecommendedActionBanner";
import {
  deriveRecommendedAction,
  findLastRun,
  findLastSuccessfulRun,
  getAppStoreReviewSubmissionStatusDisplay,
  getTestflightStatusDisplay,
  isReleaseInProgress,
  isRunAfter,
  isValidVersionFormat,
  isVersionGreaterThan,
} from "./mobileReleaseStatus";
import { AndroidReleasesTab } from "./tabs/AndroidReleasesTab";
import { AppStoreSubmissionsTab } from "./tabs/AppStoreSubmissionsTab";
import { IosTestflightTab } from "./tabs/IosTestflightTab";
import { ReleaseHistoryTab } from "./tabs/ReleaseHistoryTab";
import { useMobileReleases } from "./useMobileReleases";

/** Rollout percentage the Android promotion dialog opens on — a conservative staged start. */
const DEFAULT_ANDROID_ROLLOUT_PERCENTAGE = 20;
const MIN_ROLLOUT_PERCENTAGE = 1;
const MAX_ROLLOUT_PERCENTAGE = 100;

/** Matches the backend DTOs' @MaxLength(4000) on both platforms' What's New fields. */
const WHATS_NEW_MAX_LENGTH = 4000;

/** Default helper text under the "What's New" field, regardless of suggestion state. */
const WHATS_NEW_HELPER_TEXT =
  "Shown to users in the App Store update notes. Leave blank to keep whatever's already set in App Store Connect.";
const WHATS_NEW_NO_NEW_COMMITS_NOTE =
  "No new commits since the last release to summarize — write your own, or leave blank.";
const WHATS_NEW_SUGGESTION_FAILED_NOTE =
  "Couldn't generate a suggestion — write your own, or leave blank.";

const HISTORY_TABS = [
  { id: "android", label: "Android Releases" },
  { id: "ios", label: "iOS / TestFlight" },
  { id: "app-store", label: "App Store Submissions" },
  { id: "history", label: "Release History" },
] as const;

export const MobileReleases: FC = () => {
  const {
    runs,
    isRunsLoading,
    isRunsFetching,
    isRunsError,
    versions,
    isVersionsLoading,
    isVersionsError,
    testflightStatus,
    isTestflightStatusLoading,
    isTestflightStatusError,
    testflightHistory,
    isTestflightHistoryLoading,
    isTestflightHistoryError,
    appStoreReviewHistory,
    isAppStoreReviewHistoryLoading,
    isAppStoreReviewHistoryError,
    androidProductionStatus,
    isAndroidProductionStatusLoading,
    isAndroidProductionStatusError,
  } = useMobileReleases();

  const testflightStatusDisplay = testflightStatus
    ? getTestflightStatusDisplay(testflightStatus)
    : null;

  const releaseInProgress = isReleaseInProgress(runs);
  const matchingSubmission = testflightStatus?.buildVersion
    ? appStoreReviewHistory.find(entry => entry.versionString === testflightStatus.buildVersion)
    : undefined;
  // Validation signal for the App Store review dialog: warn, don't block — re-submitting after
  // Apple rejected it (DEVELOPER_REJECTED, METADATA_REJECTED equivalents surface as no matching
  // submission once a new one starts, but a same-day resubmission attempt is still worth flagging)
  // is a real, legitimate thing to do, just one the operator should do knowingly.
  const iosAlreadySubmittedWarning = matchingSubmission
    ? `Build ${testflightStatus?.buildVersion} was already submitted on ${formatDateTime(matchingSubmission.submittedDate)} — status: ${getAppStoreReviewSubmissionStatusDisplay(matchingSubmission.state).label}. Submitting again may error or create a duplicate submission.`
    : null;
  const recommendedAction = deriveRecommendedAction(testflightStatus, appStoreReviewHistory);
  const currentBuildUploadedDate =
    testflightHistory.find(entry => entry.buildId === testflightStatus?.buildId)?.uploadedDate ??
    null;

  const lastAndroidBuildRun = findLastSuccessfulRun(runs, "Android Build");
  const lastAndroidPromoteRun = findLastRun(runs, "Promote Android");
  // Validation signal for the promotion dialog: warn, don't block, since re-promoting the same
  // build (e.g. to raise the rollout percentage) is a legitimate, common thing to do.
  const isAndroidAlreadyPromoted =
    isRunAfter(lastAndroidPromoteRun, lastAndroidBuildRun) &&
    lastAndroidPromoteRun?.conclusion === "success";
  const androidLastReleaseDate = lastAndroidBuildRun?.updatedAt ?? null;
  const iosLastReleaseDate =
    testflightHistory[0]?.uploadedDate ??
    findLastSuccessfulRun(runs, "iOS Build")?.updatedAt ??
    null;

  const [tabIndex, setTabIndex] = useState(0);

  const [isConfirmingTrigger, setIsConfirmingTrigger] = useState(false);
  const [triggerRelease, { isLoading: isTriggering }] = useTriggerMobileReleaseMutation();

  const handleTrigger = async () => {
    try {
      await triggerRelease().unwrap();
      toast.success("Release triggered — new run should appear in Release History shortly.");
      setIsConfirmingTrigger(false);
    } catch (error) {
      // Leave the dialog open on failure so the operator sees why (e.g. the
      // GitHub Actions token isn't write-scoped) and can retry, rather than
      // losing that context to a closed popup — same as RaiseBudgetDialog and
      // StartBuildDialog elsewhere in Builder.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to trigger the release. Please try again.";
      toast.error(message);
    }
  };

  const [isConfirmingAndroidPromotion, setIsConfirmingAndroidPromotion] = useState(false);
  const [androidRolloutPercentage, setAndroidRolloutPercentage] = useState(
    DEFAULT_ANDROID_ROLLOUT_PERCENTAGE,
  );
  const [androidWhatsNewText, setAndroidWhatsNewText] = useState("");
  const [triggerAndroidPromotion, { isLoading: isPromotingAndroid }] =
    useTriggerAndroidPromotionMutation();
  const isAndroidRolloutPercentageValid =
    Number.isInteger(androidRolloutPercentage) &&
    androidRolloutPercentage >= MIN_ROLLOUT_PERCENTAGE &&
    androidRolloutPercentage <= MAX_ROLLOUT_PERCENTAGE;

  const handlePromoteAndroid = async () => {
    if (!isAndroidRolloutPercentageValid) return;
    try {
      await triggerAndroidPromotion({
        rolloutPercentage: androidRolloutPercentage,
        whatsNew: androidWhatsNewText.trim() || undefined,
      }).unwrap();
      toast.success(
        "Android promotion dispatched — new run should appear in Release History shortly.",
      );
      setIsConfirmingAndroidPromotion(false);
    } catch (error) {
      // Same pattern as handleTrigger above: leave the dialog open on failure
      // so the operator can see the error message and retry.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to promote the Android build. Please try again.";
      toast.error(message);
    }
  };

  const [isConfirmingAppStoreReview, setIsConfirmingAppStoreReview] = useState(false);
  const [whatsNewText, setWhatsNewText] = useState("");
  const [whatsNewSuggestionNote, setWhatsNewSuggestionNote] = useState<string | null>(null);
  const [submitAppStoreReview, { isLoading: isSubmittingAppStoreReview }] =
    useSubmitIosAppStoreReviewMutation();
  const [fetchIosWhatsNewSuggestion, { isFetching: isFetchingWhatsNewSuggestion }] =
    useLazyGetIosWhatsNewSuggestionQuery();
  // Guards against a stale suggestion (or failure note) landing after the
  // dialog's been reopened — e.g. closed and reopened while the first fetch
  // was still in flight — clobbering whatever the second open's fetch found,
  // or worse, text the operator already started editing.
  const whatsNewSuggestionRequestIdRef = useRef(0);

  const handleOpenAppStoreReviewDialog = () => {
    const requestId = ++whatsNewSuggestionRequestIdRef.current;
    setWhatsNewText("");
    setWhatsNewSuggestionNote(null);
    setIsConfirmingAppStoreReview(true);

    // Fires only now, on open — not automatically/on a poll — since this
    // calls an LLM server-side and costs real tokens.
    fetchIosWhatsNewSuggestion()
      .unwrap()
      .then(response => {
        if (whatsNewSuggestionRequestIdRef.current !== requestId) return;
        if (response.suggestion) {
          setWhatsNewText(response.suggestion);
        } else {
          setWhatsNewSuggestionNote(WHATS_NEW_NO_NEW_COMMITS_NOTE);
        }
      })
      .catch(() => {
        if (whatsNewSuggestionRequestIdRef.current !== requestId) return;
        // A nice-to-have prefill failing shouldn't block or interrupt the
        // submit flow — no error toast, just an explanation next to the
        // now-empty, still-fully-editable field.
        setWhatsNewSuggestionNote(WHATS_NEW_SUGGESTION_FAILED_NOTE);
      });
  };

  const handleSubmitAppStoreReview = async () => {
    try {
      await submitAppStoreReview({ whatsNew: whatsNewText.trim() || undefined }).unwrap();
      toast.success(
        "App Store review submitted — Apple's review clock has started. New run should appear in Release History shortly.",
      );
      setIsConfirmingAppStoreReview(false);
    } catch (error) {
      // Same pattern as handleTrigger/handlePromoteAndroid above: leave the
      // dialog open on failure so the operator can see why (e.g. Apple
      // rejecting an unready App Store Connect listing) and retry.
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to submit the app for App Store review. Please try again.";
      toast.error(message);
    }
  };

  // Force-update minimum supported version — a separate ally-be module
  // (app-version, backed by a global_settings row) from everything else on
  // this page, but the natural place for an admin to change it is right next
  // to the versions it's compared against. Takes effect immediately, no
  // deploy, so the confirmation copy below carries the same safety framing
  // as the force-update-version-bump runbook: the target must already be
  // live on the store, which nothing here can verify automatically.
  const { data: currentMinIosVersion, isLoading: isMinIosVersionLoading } =
    useGetMinimumIosVersionQuery();
  const { data: currentMinAndroidVersion, isLoading: isMinAndroidVersionLoading } =
    useGetMinimumAndroidVersionQuery();
  const [updateMinimumAppVersion, { isLoading: isUpdatingMinVersion }] =
    useUpdateMinimumAppVersionMutation();

  const [minIosVersionInput, setMinIosVersionInput] = useState("");
  const [minAndroidVersionInput, setMinAndroidVersionInput] = useState("");
  const [isConfirmingMinVersionUpdate, setIsConfirmingMinVersionUpdate] = useState(false);

  // Seed the fields once the current thresholds arrive — same pattern as
  // Settings.tsx's TurnEndpointingSettings.
  useEffect(() => {
    if (!currentMinIosVersion) return;
    setMinIosVersionInput(currentMinIosVersion.minimumSupportedVersion);
  }, [currentMinIosVersion]);

  useEffect(() => {
    if (!currentMinAndroidVersion) return;
    setMinAndroidVersionInput(currentMinAndroidVersion.minimumSupportedVersion);
  }, [currentMinAndroidVersion]);

  const trimmedMinIosVersion = minIosVersionInput.trim();
  const trimmedMinAndroidVersion = minAndroidVersionInput.trim();

  // Format + safety-ceiling validation: never allow a target above the version this page
  // even knows was built yet (a stricter check than the runbook's own "must be live" gate,
  // which nothing here can verify — but a version that hasn't even been built definitely
  // isn't live, so this much is always safe to enforce automatically).
  const minIosVersionError =
    trimmedMinIosVersion === ""
      ? null
      : !isValidVersionFormat(trimmedMinIosVersion)
        ? "Enter a version in X.Y.Z format (e.g. 1.23.16)."
        : versions?.ios.marketingVersion &&
            isVersionGreaterThan(trimmedMinIosVersion, versions.ios.marketingVersion)
          ? `Cannot exceed the current build (${versions.ios.marketingVersion}) — that version may not even be published yet.`
          : null;
  const minAndroidVersionError =
    trimmedMinAndroidVersion === ""
      ? null
      : !isValidVersionFormat(trimmedMinAndroidVersion)
        ? "Enter a version in X.Y.Z format (e.g. 1.23.16)."
        : versions?.android.versionName &&
            isVersionGreaterThan(trimmedMinAndroidVersion, versions.android.versionName)
          ? `Cannot exceed the current build (${versions.android.versionName}) — that version may not even be published yet.`
          : null;

  const isIosMinVersionChanged =
    trimmedMinIosVersion !== "" &&
    trimmedMinIosVersion !== currentMinIosVersion?.minimumSupportedVersion &&
    !minIosVersionError;
  const isAndroidMinVersionChanged =
    trimmedMinAndroidVersion !== "" &&
    trimmedMinAndroidVersion !== currentMinAndroidVersion?.minimumSupportedVersion &&
    !minAndroidVersionError;
  const hasMinVersionChange = isIosMinVersionChanged || isAndroidMinVersionChanged;

  const handleOpenMinVersionDialog = () => {
    // Re-seed from the latest known thresholds every time the dialog opens,
    // in case an edit was left half-typed and abandoned on a previous open.
    if (currentMinIosVersion) setMinIosVersionInput(currentMinIosVersion.minimumSupportedVersion);
    if (currentMinAndroidVersion) {
      setMinAndroidVersionInput(currentMinAndroidVersion.minimumSupportedVersion);
    }
    setIsConfirmingMinVersionUpdate(true);
  };

  const handleUpdateMinimumVersion = async () => {
    if (!hasMinVersionChange) return;
    try {
      await updateMinimumAppVersion({
        ios: isIosMinVersionChanged ? trimmedMinIosVersion : undefined,
        android: isAndroidMinVersionChanged ? trimmedMinAndroidVersion : undefined,
      }).unwrap();
      toast.success(
        "Minimum supported app version updated — affected users will see the force-update screen on next launch.",
      );
      setIsConfirmingMinVersionUpdate(false);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to update the minimum supported app version. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="h-full font-primary flex flex-col overflow-y-auto custom-scrollbar">
      <div>
        <h1 className="text-2xl text-typography-900 font-secondary">Mobile Releases</h1>
        <p className="text-sm text-typography-700 mt-1">
          What's live, what's in progress, and what needs your attention — for both platforms.
        </p>
      </div>

      {/* Release Overview — always visible above the tabs below, so the five
          questions this page exists to answer (what's live on each platform,
          is a release running, is anything waiting on me, what's next) never
          require scrolling or picking a tab. */}
      <div className="flex flex-col gap-4 mt-5 shrink-0">
        <div className="flex flex-wrap gap-4">
          <PlatformStatusCard
            platform="Android"
            isLoading={isVersionsLoading}
            isError={isVersionsError}
            liveVersion={versions?.android.versionName ?? null}
            liveVersionSuffix={
              versions?.android.versionCode ? `(${versions.android.versionCode})` : null
            }
            lastReleaseDate={androidLastReleaseDate}
            footnote="Reflects the version committed on master — confirm it's actually published in Play Console before treating it as live."
          />
          <PlatformStatusCard
            platform="iOS"
            isLoading={isVersionsLoading}
            isError={isVersionsError}
            liveVersion={versions?.ios.marketingVersion ?? null}
            lastReleaseDate={iosLastReleaseDate}
            statusTag={testflightStatusDisplay}
            statusLabel="TestFlight"
            statusContext={
              testflightStatus?.buildVersion ? `Build ${testflightStatus.buildVersion}` : null
            }
            footnote="Reflects the version committed on master — confirm it's actually published in App Store Connect before treating it as live."
          />
          <NextCheckPanel
            isVersionsLoading={isVersionsLoading}
            isVersionsError={isVersionsError}
            nextEligibleCheckAt={versions?.nextEligibleCheckAt}
            isReleaseInProgress={releaseInProgress}
          />
        </div>

        <RecommendedActionBanner
          action={recommendedAction}
          onSubmitReview={handleOpenAppStoreReviewDialog}
        />

        {!isVersionsLoading &&
          !isVersionsError &&
          !isRunsLoading &&
          !isRunsError &&
          versions?.android.versionName && (
            <div>
              <h3 className="text-sm font-medium text-typography-900 mb-2">
                Current Android build's pipeline
              </h3>
              <AndroidReleasePipeline
                androidVersionName={versions.android.versionName}
                androidVersionCode={versions.android.versionCode}
                lastBuildRun={lastAndroidBuildRun}
                lastPromoteRun={lastAndroidPromoteRun}
                productionStatus={androidProductionStatus}
                isProductionStatusLoading={isAndroidProductionStatusLoading}
                isProductionStatusError={isAndroidProductionStatusError}
                currentMinAndroidVersion={currentMinAndroidVersion?.minimumSupportedVersion}
                isMinAndroidVersionLoading={isMinAndroidVersionLoading}
                onUpdateMinVersion={handleOpenMinVersionDialog}
              />
            </div>
          )}

        {!isTestflightStatusLoading &&
          !isTestflightStatusError &&
          testflightStatus?.buildVersion && (
            <div>
              <h3 className="text-sm font-medium text-typography-900 mb-2">
                Current iOS build's pipeline
              </h3>
              <IosReleasePipeline
                testflightStatus={testflightStatus}
                matchingSubmission={matchingSubmission}
                buildUploadedDate={currentBuildUploadedDate}
                currentMinIosVersion={currentMinIosVersion?.minimumSupportedVersion}
                isMinIosVersionLoading={isMinIosVersionLoading}
                onUpdateMinVersion={handleOpenMinVersionDialog}
              />
            </div>
          )}

        {/* Action area — grouped by risk, not all equally weighted. Release
            actions use a lighter "tertiary" treatment for the routine
            internal-track trigger and a "danger--tertiary" outline (colour
            without a solid block) for the two real-production actions.
            Force-update lives in its own group since it's a safety knob, not
            a release step. */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {(isTriggering || isPromotingAndroid || isSubmittingAppStoreReview) && (
              <InlineLoading
                description={
                  isTriggering ? "Triggering…" : isPromotingAndroid ? "Promoting…" : "Submitting…"
                }
              />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600 mb-1.5">
              Release actions
            </p>
            <div className="flex flex-wrap gap-2">
              <Tooltip label="Skips the 2-day cadence and immediately builds and uploads both platforms to their internal tracks (Play Store internal track, TestFlight). Tests still gate the build.">
                <Button
                  kind="tertiary"
                  size="md"
                  disabled={isTriggering}
                  onClick={() => setIsConfirmingTrigger(true)}
                >
                  Trigger release now
                </Button>
              </Tooltip>
              <Tooltip label="Promotes the current internal-track Android build to the Play Store production track at a staged rollout percentage you choose. Real users start receiving it.">
                <Button
                  kind="danger--tertiary"
                  size="md"
                  disabled={
                    isPromotingAndroid ||
                    isVersionsLoading ||
                    isVersionsError ||
                    !versions?.android.versionName
                  }
                  onClick={() => {
                    setAndroidRolloutPercentage(DEFAULT_ANDROID_ROLLOUT_PERCENTAGE);
                    setAndroidWhatsNewText("");
                    setIsConfirmingAndroidPromotion(true);
                  }}
                >
                  Promote Android to Production
                </Button>
              </Tooltip>
              <Tooltip label="Submits the current iOS build for Apple's full App Store review — real public distribution, not TestFlight. Assumes the App Store Connect listing is already ready.">
                <Button
                  kind="danger--tertiary"
                  size="md"
                  disabled={
                    isSubmittingAppStoreReview ||
                    isTestflightStatusLoading ||
                    isTestflightStatusError ||
                    !testflightStatus?.buildVersion
                  }
                  onClick={handleOpenAppStoreReviewDialog}
                >
                  Submit for Full App Store Review
                </Button>
              </Tooltip>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600 mb-1.5">
              Force-update settings
            </p>
            <div className="flex flex-wrap gap-2">
              <Tooltip label="Raises the minimum app version users are allowed to run — anyone below it sees a non-dismissable force-update screen on next launch, effective immediately.">
                <Button kind="tertiary" size="md" onClick={handleOpenMinVersionDialog}>
                  Update Minimum Version
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed history, one platform/concern per tab — kept below the
          fold on purpose, since none of it is needed to answer "what's live"
          or "what should I do next" above. */}
      <div className="mt-6 flex-1 min-h-0">
        <Tabs selectedIndex={tabIndex} onChange={({ selectedIndex }) => setTabIndex(selectedIndex)}>
          <TabList aria-label="Mobile release history sections">
            {HISTORY_TABS.map(t => (
              <Tab key={t.id}>{t.label}</Tab>
            ))}
          </TabList>
          <TabPanels>
            <TabPanel>
              {tabIndex === 0 && (
                <AndroidReleasesTab
                  runs={runs}
                  isRunsLoading={isRunsLoading}
                  isRunsFetching={isRunsFetching}
                  isRunsError={isRunsError}
                />
              )}
            </TabPanel>
            <TabPanel>
              {tabIndex === 1 && (
                <IosTestflightTab
                  currentBuildId={testflightStatus?.buildId}
                  testflightHistory={testflightHistory}
                  isTestflightHistoryLoading={isTestflightHistoryLoading}
                  isTestflightHistoryError={isTestflightHistoryError}
                  runs={runs}
                  isRunsLoading={isRunsLoading}
                  isRunsFetching={isRunsFetching}
                  isRunsError={isRunsError}
                />
              )}
            </TabPanel>
            <TabPanel>
              {tabIndex === 2 && (
                <AppStoreSubmissionsTab
                  submissions={appStoreReviewHistory}
                  isLoading={isAppStoreReviewHistoryLoading}
                  isError={isAppStoreReviewHistoryError}
                  currentVersionString={testflightStatus?.buildVersion}
                  runs={runs}
                  isRunsLoading={isRunsLoading}
                  isRunsFetching={isRunsFetching}
                  isRunsError={isRunsError}
                />
              )}
            </TabPanel>
            <TabPanel>
              {tabIndex === 3 && (
                <ReleaseHistoryTab
                  runs={runs}
                  isRunsLoading={isRunsLoading}
                  isRunsFetching={isRunsFetching}
                  isRunsError={isRunsError}
                />
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      {isConfirmingTrigger && (
        <ActionConfirmationPopup
          isOpen={isConfirmingTrigger}
          onClose={() => setIsConfirmingTrigger(false)}
          title="Trigger mobile release now?"
          description="This immediately kicks off real production builds for **both Android and iOS** — uploading to the Play Store internal track and TestFlight. This is a real production action and can't be undone once it starts."
          primaryButton={{
            label: isTriggering ? "Triggering…" : "Trigger release",
            onClick: () => void handleTrigger(),
            disabled: isTriggering,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingTrigger(false),
            disabled: isTriggering,
          }}
        >
          {releaseInProgress && (
            <p className="w-full mt-2 text-sm text-warning-text">
              A release is already running — this will queue behind it rather than run concurrently,
              but confirm that's what you want before proceeding.
            </p>
          )}
        </ActionConfirmationPopup>
      )}

      {isConfirmingAndroidPromotion && (
        <ActionConfirmationPopup
          isOpen={isConfirmingAndroidPromotion}
          onClose={() => setIsConfirmingAndroidPromotion(false)}
          title="Promote Android to production?"
          description={`This promotes the current Android build to the **production** track for real Play Store users, starting at ${androidRolloutPercentage}% rollout. This is separate from — and more consequential than — the internal release trigger above.`}
          primaryButton={{
            label: isPromotingAndroid ? "Promoting…" : "Promote to production",
            onClick: () => void handlePromoteAndroid(),
            disabled:
              isPromotingAndroid ||
              !isAndroidRolloutPercentageValid ||
              androidWhatsNewText.length > WHATS_NEW_MAX_LENGTH,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingAndroidPromotion(false),
            disabled: isPromotingAndroid,
          }}
        >
          <div className="w-full mt-2 flex flex-col gap-4">
            {isAndroidAlreadyPromoted && (
              <p className="text-sm text-warning-text">
                This build ({versions?.android.versionName}) may already be promoted to production —
                last promotion:{" "}
                {lastAndroidPromoteRun?.runStartedAt
                  ? formatDateTime(lastAndroidPromoteRun.runStartedAt)
                  : "unknown time"}
                . Promoting again will re-submit it, which is fine if you're only raising the
                rollout percentage.
              </p>
            )}
            <NumberInput
              id="android-promotion-rollout-percentage"
              label="Rollout percentage"
              hideSteppers
              min={MIN_ROLLOUT_PERCENTAGE}
              max={MAX_ROLLOUT_PERCENTAGE}
              value={androidRolloutPercentage}
              invalid={!isAndroidRolloutPercentageValid}
              invalidText={`Enter a whole number between ${MIN_ROLLOUT_PERCENTAGE} and ${MAX_ROLLOUT_PERCENTAGE}.`}
              disabled={isPromotingAndroid}
              onChange={(_event: unknown, state: { value: number | string } | undefined) =>
                setAndroidRolloutPercentage(state?.value === undefined ? NaN : Number(state.value))
              }
            />
            <TextArea
              id="android-promotion-whats-new"
              labelText="What's New (optional)"
              helperText={
                androidWhatsNewText.length > WHATS_NEW_MAX_LENGTH
                  ? `${androidWhatsNewText.length}/${WHATS_NEW_MAX_LENGTH} characters — trim it before promoting.`
                  : "Shown on the Play Store production listing. Google Play doesn't carry release notes over from the internal track automatically, so leaving this blank promotes with none at all."
              }
              invalid={androidWhatsNewText.length > WHATS_NEW_MAX_LENGTH}
              placeholder="e.g. Bug fixes and performance improvements"
              value={androidWhatsNewText}
              onChange={e => setAndroidWhatsNewText(e.target.value)}
              disabled={isPromotingAndroid}
              rows={4}
            />
          </div>
        </ActionConfirmationPopup>
      )}

      {isConfirmingAppStoreReview && (
        <ActionConfirmationPopup
          isOpen={isConfirmingAppStoreReview}
          onClose={() => setIsConfirmingAppStoreReview(false)}
          title="Submit for full App Store review?"
          description="This submits the app for Apple's **full App Store review** — real public distribution, not TestFlight. It assumes the App Store Connect listing (screenshots, description, export compliance, etc.) is already fully prepared for the current version; if it isn't, Apple will reject the submission. Release is set to **automatic**: the moment Apple approves it, it goes live to every real App Store user — there is no second click to stop it once Apple says yes. This is the most consequential action on this page."
          primaryButton={{
            label: isSubmittingAppStoreReview ? "Submitting…" : "Submit for review",
            onClick: () => void handleSubmitAppStoreReview(),
            disabled: isSubmittingAppStoreReview || whatsNewText.length > WHATS_NEW_MAX_LENGTH,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingAppStoreReview(false),
            disabled: isSubmittingAppStoreReview,
          }}
        >
          <div className="w-full mt-2 flex flex-col gap-3">
            {iosAlreadySubmittedWarning && (
              <p className="text-sm text-warning-text">{iosAlreadySubmittedWarning}</p>
            )}
            <TextArea
              id="ios-app-store-review-whats-new"
              labelText="What's New in This Version (optional)"
              helperText={
                whatsNewText.length > WHATS_NEW_MAX_LENGTH
                  ? `${whatsNewText.length}/${WHATS_NEW_MAX_LENGTH} characters — trim it before submitting.`
                  : whatsNewSuggestionNote
                    ? `${whatsNewSuggestionNote} ${WHATS_NEW_HELPER_TEXT}`
                    : WHATS_NEW_HELPER_TEXT
              }
              invalid={whatsNewText.length > WHATS_NEW_MAX_LENGTH}
              placeholder={
                isFetchingWhatsNewSuggestion
                  ? "Generating a suggestion from recent commits…"
                  : "e.g. Bug fixes and performance improvements"
              }
              value={whatsNewText}
              onChange={e => setWhatsNewText(e.target.value)}
              disabled={isSubmittingAppStoreReview || isFetchingWhatsNewSuggestion}
              rows={4}
            />
          </div>
        </ActionConfirmationPopup>
      )}

      {isConfirmingMinVersionUpdate && (
        <ActionConfirmationPopup
          isOpen={isConfirmingMinVersionUpdate}
          onClose={() => setIsConfirmingMinVersionUpdate(false)}
          title="Update minimum supported app version?"
          description="This takes effect **immediately, with no deploy** — any user below this version sees a non-dismissable force-update screen on next launch. Setting a version **above** what's actually published on the App Store / Play Store locks out **every** user on that platform onto a version they can't yet download. Confirm the target version is genuinely live on the store before proceeding."
          primaryButton={{
            label: isUpdatingMinVersion ? "Updating…" : "Update minimum version",
            onClick: () => void handleUpdateMinimumVersion(),
            disabled: isUpdatingMinVersion || !hasMinVersionChange,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingMinVersionUpdate(false),
            disabled: isUpdatingMinVersion,
          }}
        >
          <div className="w-full mt-2 flex flex-col gap-4">
            <TextInput
              id="min-ios-version"
              labelText="Minimum iOS version"
              helperText={
                minIosVersionError
                  ? minIosVersionError
                  : currentMinIosVersion
                    ? `Current: ${currentMinIosVersion.minimumSupportedVersion}`
                    : "Loading current threshold…"
              }
              invalid={!!minIosVersionError}
              invalidText={minIosVersionError ?? ""}
              value={minIosVersionInput}
              onChange={e => setMinIosVersionInput(e.target.value)}
              disabled={isUpdatingMinVersion}
            />
            <TextInput
              id="min-android-version"
              labelText="Minimum Android version"
              helperText={
                minAndroidVersionError
                  ? minAndroidVersionError
                  : currentMinAndroidVersion
                    ? `Current: ${currentMinAndroidVersion.minimumSupportedVersion}`
                    : "Loading current threshold…"
              }
              invalid={!!minAndroidVersionError}
              invalidText={minAndroidVersionError ?? ""}
              value={minAndroidVersionInput}
              onChange={e => setMinAndroidVersionInput(e.target.value)}
              disabled={isUpdatingMinVersion}
            />
          </div>
        </ActionConfirmationPopup>
      )}
    </div>
  );
};
