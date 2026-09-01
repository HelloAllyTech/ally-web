import { FC, useEffect, useRef, useState } from "react";

import { Link as LinkIcon, Mobile as MobileIcon } from "@icons";
import { toast } from "sonner";

import {
  Button,
  InlineLoading,
  NumberInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
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
import { TooltipIcon } from "@assets";
import { ActionConfirmationPopup, EmptyState } from "@components";
import { formatRunDuration } from "@components/builder/runFormat";
import { en } from "@constants";
import { MobileReleaseRun } from "@types";
import { formatDateTime, openLinkInNewTab } from "@utils";

import {
  getAppStoreReviewSubmissionStatusDisplay,
  getMobileReleaseRunStatusDisplay,
  getTestflightStatusDisplay,
} from "./mobileReleaseStatus";
import { useMobileReleases } from "./useMobileReleases";

/** First 7 chars of a commit SHA — the length GitHub's own UI uses for a short SHA. */
const shortSha = (sha: string) => sha.slice(0, 7);

/** Rollout percentage the Android promotion dialog opens on — a conservative staged start. */
const DEFAULT_ANDROID_ROLLOUT_PERCENTAGE = 20;
const MIN_ROLLOUT_PERCENTAGE = 1;
const MAX_ROLLOUT_PERCENTAGE = 100;

/** Default helper text under the "What's New" field, regardless of suggestion state. */
const WHATS_NEW_HELPER_TEXT =
  "Shown to users in the App Store update notes. Leave blank to keep whatever's already set in App Store Connect.";
const WHATS_NEW_NO_NEW_COMMITS_NOTE =
  "No new commits since the last release to summarize — write your own, or leave blank.";
const WHATS_NEW_SUGGESTION_FAILED_NOTE =
  "Couldn't generate a suggestion — write your own, or leave blank.";

const runDisplayDuration = (run: MobileReleaseRun): string => {
  if (run.status !== "completed") return "In progress";
  if (!run.runStartedAt) return "—";
  return formatRunDuration(run.runStartedAt, run.updatedAt) ?? "—";
};

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
  } = useMobileReleases();

  const testflightStatusDisplay = testflightStatus
    ? getTestflightStatusDisplay(testflightStatus)
    : null;

  const [isConfirmingTrigger, setIsConfirmingTrigger] = useState(false);
  const [triggerRelease, { isLoading: isTriggering }] = useTriggerMobileReleaseMutation();

  const handleTrigger = async () => {
    try {
      await triggerRelease().unwrap();
      toast.success("Release triggered — new run should appear in the history below shortly.");
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
  const [triggerAndroidPromotion, { isLoading: isPromotingAndroid }] =
    useTriggerAndroidPromotionMutation();
  const isAndroidRolloutPercentageValid =
    Number.isInteger(androidRolloutPercentage) &&
    androidRolloutPercentage >= MIN_ROLLOUT_PERCENTAGE &&
    androidRolloutPercentage <= MAX_ROLLOUT_PERCENTAGE;

  const handlePromoteAndroid = async () => {
    if (!isAndroidRolloutPercentageValid) return;
    try {
      await triggerAndroidPromotion({ rolloutPercentage: androidRolloutPercentage }).unwrap();
      toast.success(
        "Android promotion dispatched — new run should appear in the history below shortly.",
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
        "App Store review submitted — Apple's review clock has started. New run should appear in the history below shortly.",
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
  const { data: currentMinIosVersion } = useGetMinimumIosVersionQuery();
  const { data: currentMinAndroidVersion } = useGetMinimumAndroidVersionQuery();
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
  const isIosMinVersionChanged =
    trimmedMinIosVersion !== "" &&
    trimmedMinIosVersion !== currentMinIosVersion?.minimumSupportedVersion;
  const isAndroidMinVersionChanged =
    trimmedMinAndroidVersion !== "" &&
    trimmedMinAndroidVersion !== currentMinAndroidVersion?.minimumSupportedVersion;
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
    <div className="h-full font-primary flex flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-typography-900 font-secondary">Mobile Releases</h1>
          <p className="text-sm text-typography-700 mt-1">
            Current live app versions and recent runs of the automated mobile release pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isTriggering && <InlineLoading description="Triggering…" />}
          {isPromotingAndroid && <InlineLoading description="Promoting…" />}
          {isSubmittingAppStoreReview && <InlineLoading description="Submitting…" />}
          <Button
            kind="primary"
            size="md"
            disabled={isTriggering}
            onClick={() => setIsConfirmingTrigger(true)}
          >
            Trigger release now
          </Button>
          <Button
            kind="danger"
            size="md"
            disabled={isPromotingAndroid}
            onClick={() => {
              setAndroidRolloutPercentage(DEFAULT_ANDROID_ROLLOUT_PERCENTAGE);
              setIsConfirmingAndroidPromotion(true);
            }}
          >
            Promote Android to Production
          </Button>
          <Button
            kind="danger"
            size="md"
            disabled={isSubmittingAppStoreReview}
            onClick={handleOpenAppStoreReviewDialog}
          >
            Submit for Full App Store Review
          </Button>
          <Button kind="danger" size="md" onClick={handleOpenMinVersionDialog}>
            Update Minimum Version
          </Button>
        </div>
      </div>

      {/* Current live version, per platform, plus the next automated check. */}
      <div className="flex flex-wrap gap-4 mt-6 shrink-0">
        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600">
              Android — live version
            </p>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.android.versionName}{" "}
                <span className="text-sm text-typography-600">
                  ({versions.android.versionCode})
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wide text-typography-600">
              iOS — live version
            </p>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.ios.marketingVersion}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs uppercase tracking-wide text-typography-600">
                iOS — TestFlight status
              </p>
              <Tooltip
                label="Live status of the current iOS build in App Store Connect, from Apple's own Beta App Review — no need to open App Store Connect to check."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            {isTestflightStatusLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isTestflightStatusError || !testflightStatus || !testflightStatusDisplay ? (
              <p className="text-destructive-500 mt-1">Failed to load TestFlight status.</p>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <Tag type={testflightStatusDisplay.type} size="sm">
                  {testflightStatusDisplay.label}
                </Tag>
                {testflightStatus.buildVersion && (
                  <span className="text-sm text-typography-600">
                    Build {testflightStatus.buildVersion}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-[240px] flex items-center gap-3 rounded border border-border-light bg-white px-5 py-4">
          <MobileIcon size={24} className="text-typography-600 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs uppercase tracking-wide text-typography-600">
                Next automated check
              </p>
              <Tooltip
                label="This is only an estimate of when the automated pipeline could next run — it still depends on there being new commits by then, which can't be known in advance."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            {isVersionsLoading ? (
              <p className="text-typography-700 mt-1">Loading…</p>
            ) : isVersionsError || !versions ? (
              <p className="text-destructive-500 mt-1">Failed to load current version.</p>
            ) : (
              <p className="text-xl text-typography-900 font-secondary mt-1">
                {versions.nextEligibleCheckAt
                  ? formatDateTime(versions.nextEligibleCheckAt)
                  : "Unknown"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Run history. */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
        {isRunsLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : isRunsError && runs.length === 0 ? (
          <p className="text-destructive-500">Failed to load run history.</p>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No runs yet"
            subtitle="The release pipeline hasn't run yet — check back after its next scheduled pass."
            hideActionButton
          />
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">Workflow</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Triggered by</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Commit</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Started</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Duration</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium" />
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map(run => {
                const statusDisplay = getMobileReleaseRunStatusDisplay(run.status, run.conclusion);
                return (
                  <TableRow
                    key={run.id}
                    className="border-b border-border-light text-sm text-typography-900 align-top"
                  >
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {run.workflowName}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      <Tag type={statusDisplay.type} size="sm">
                        {statusDisplay.label}
                      </Tag>
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">{run.actor}</TableCell>
                    <TableCell className="py-3 pr-4 max-w-[320px]">
                      <span
                        title={run.headCommitMessage ?? undefined}
                        className="font-mono text-xs truncate block"
                      >
                        {shortSha(run.headSha)} — {run.headCommitMessage}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {run.runStartedAt ? formatDateTime(run.runStartedAt) : "Queued"}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      {runDisplayDuration(run)}
                    </TableCell>
                    <TableCell className="py-3 pr-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openLinkInNewTab(run.htmlUrl)}
                        title="View on GitHub"
                        aria-label="View run on GitHub"
                        className="text-typography-600 hover:text-typography-900"
                      >
                        <LinkIcon size={16} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {runs.length > 0 && (
        <div className="flex items-center justify-end shrink-0 border-t border-border-light pt-3 mt-2">
          <span
            className={isRunsError ? "text-sm text-destructive-500" : "text-sm text-typography-700"}
          >
            {isRunsFetching
              ? "Updating…"
              : isRunsError
                ? "Couldn't refresh just now — showing the last known runs."
                : ""}
          </span>
        </div>
      )}

      {/* iOS TestFlight submission history — separate from the run history
          table above: these rows are past TestFlight builds' Beta App Review
          state (from App Store Connect), not GitHub Actions runs, so they
          don't share a shape with MobileReleaseRun. */}
      <div className="shrink-0">
        <h2 className="text-lg text-typography-900 font-secondary mt-6">
          iOS TestFlight submissions
        </h2>
        <div className="mt-3">
          {isTestflightHistoryLoading ? (
            <p className="text-typography-700">Loading…</p>
          ) : isTestflightHistoryError ? (
            <p className="text-destructive-500">Failed to load TestFlight submission history.</p>
          ) : testflightHistory.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              subtitle="No iOS build has been uploaded to TestFlight yet — check back after the next automated build."
              hideActionButton
            />
          ) : (
            <Table className="w-full text-left border-collapse">
              <TableHead>
                <TableRow className="border-b border-border-light text-sm text-typography-700">
                  <TableHeader className="py-3 pr-4 font-medium">Version</TableHeader>
                  <TableHeader className="py-3 pr-4 font-medium">Uploaded</TableHeader>
                  <TableHeader className="py-3 pr-4 font-medium">Beta review status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {testflightHistory.map(entry => {
                  const statusDisplay = getTestflightStatusDisplay(entry);
                  return (
                    <TableRow
                      key={entry.buildId}
                      className="border-b border-border-light text-sm text-typography-900 align-top"
                    >
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        {entry.buildVersion}
                      </TableCell>
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(entry.uploadedDate)}
                      </TableCell>
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        <Tag type={statusDisplay.type} size="sm">
                          {statusDisplay.label}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Apple's own full App Store review submission history — real public
          distribution, distinct from the TestFlight table above. Shows the
          version submitted and where it stands (e.g. "Waiting for Review",
          "Review Completed"), the same pair App Store Connect's own "App
          Store" tab shows. */}
      <div className="shrink-0">
        <h2 className="text-lg text-typography-900 font-secondary mt-6">
          iOS App Store review submissions
        </h2>
        <div className="mt-3">
          {isAppStoreReviewHistoryLoading ? (
            <p className="text-typography-700">Loading…</p>
          ) : isAppStoreReviewHistoryError ? (
            <p className="text-destructive-500">
              Failed to load App Store review submission history.
            </p>
          ) : appStoreReviewHistory.length === 0 ? (
            <EmptyState
              title="No submissions yet"
              subtitle="No iOS build has been submitted for full App Store review yet."
              hideActionButton
            />
          ) : (
            <Table className="w-full text-left border-collapse">
              <TableHead>
                <TableRow className="border-b border-border-light text-sm text-typography-700">
                  <TableHeader className="py-3 pr-4 font-medium">Version</TableHeader>
                  <TableHeader className="py-3 pr-4 font-medium">Submitted</TableHeader>
                  <TableHeader className="py-3 pr-4 font-medium">Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {appStoreReviewHistory.map((entry, index) => {
                  const statusDisplay = getAppStoreReviewSubmissionStatusDisplay(entry.state);
                  return (
                    <TableRow
                      // Apple's reviewSubmissions resource has its own id, but the
                      // backend doesn't surface it (only what's shown here is
                      // needed) — submittedDate is unique per submission in
                      // practice, same reasoning buildId serves for the
                      // TestFlight table above.
                      key={`${entry.submittedDate}-${index}`}
                      className="border-b border-border-light text-sm text-typography-900 align-top"
                    >
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        {entry.versionString}
                      </TableCell>
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        {formatDateTime(entry.submittedDate)}
                      </TableCell>
                      <TableCell className="py-3 pr-4 whitespace-nowrap">
                        <Tag type={statusDisplay.type} size="sm">
                          {statusDisplay.label}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
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
        />
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
            disabled: isPromotingAndroid || !isAndroidRolloutPercentageValid,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingAndroidPromotion(false),
            disabled: isPromotingAndroid,
          }}
        >
          <div className="w-full mt-2">
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
          </div>
        </ActionConfirmationPopup>
      )}

      {isConfirmingAppStoreReview && (
        <ActionConfirmationPopup
          isOpen={isConfirmingAppStoreReview}
          onClose={() => setIsConfirmingAppStoreReview(false)}
          title="Submit for full App Store review?"
          description="This submits the app for Apple's **full App Store review** — real public distribution, not TestFlight. It assumes the App Store Connect listing (screenshots, description, export compliance, etc.) is already fully prepared for the current version; if it isn't, Apple will reject the submission. Once Apple approves it, someone still has to manually release it in App Store Connect before real users see it — release is **not** automatic — but the review submission itself is real and Apple's review clock starts immediately. This is the most consequential action on this page."
          primaryButton={{
            label: isSubmittingAppStoreReview ? "Submitting…" : "Submit for review",
            onClick: () => void handleSubmitAppStoreReview(),
            disabled: isSubmittingAppStoreReview,
          }}
          secondaryButton={{
            label: en.common.cancel,
            onClick: () => setIsConfirmingAppStoreReview(false),
            disabled: isSubmittingAppStoreReview,
          }}
        >
          <div className="w-full mt-2">
            <TextArea
              id="ios-app-store-review-whats-new"
              labelText="What's New in This Version (optional)"
              helperText={
                whatsNewSuggestionNote
                  ? `${whatsNewSuggestionNote} ${WHATS_NEW_HELPER_TEXT}`
                  : WHATS_NEW_HELPER_TEXT
              }
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
                currentMinIosVersion
                  ? `Current: ${currentMinIosVersion.minimumSupportedVersion}`
                  : "Loading current threshold…"
              }
              value={minIosVersionInput}
              onChange={e => setMinIosVersionInput(e.target.value)}
              disabled={isUpdatingMinVersion}
            />
            <TextInput
              id="min-android-version"
              labelText="Minimum Android version"
              helperText={
                currentMinAndroidVersion
                  ? `Current: ${currentMinAndroidVersion.minimumSupportedVersion}`
                  : "Loading current threshold…"
              }
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
