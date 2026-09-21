import { FC, useEffect, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { InlineNotification, Tile } from "@ally-ui-mono/ui-shared";
import { baseAPI, useGetUxSignalScansQuery, useScanUxSignalsMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, FeatureToggleKey, TAG_TYPES } from "@constants";
import { RootState } from "@store";
import { UxSignalScan, UxSignalScanStatus } from "@types";
import { hasFeature } from "@utils";

const strings = en.uxSignals;

/**
 * How often the panel asks the scan log whether the run it is following has
 * finished. A scan takes about two minutes, so this is roughly two dozen cheap
 * reads across one run — frequent enough that "finished" and "the page said so"
 * are the same moment to a reader, and idle the rest of the time.
 */
const POLL_INTERVAL_MS = 5_000;

/**
 * Mirrors UX_SIGNAL_SCHEDULE.STALE_RUNNING_MINUTES in ally-be. A RUNNING row
 * older than this is one the backend will treat as abandoned, so the panel stops
 * waiting on it at the same point rather than polling a dead row forever.
 */
const STALE_RUNNING_MS = 15 * 60_000;

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

/**
 * The UX Signals control, on the Bug Hunter page.
 *
 * ## Why it lives here and not on its own tab
 *
 * A scan produces two kinds of artefact and files each where its audience already
 * works — bugs into the table directly below this panel, improvements into the
 * Analytics Suggestions queue. Giving it a third review surface would mean a
 * second place to learn and a second approve/reject flow to keep consistent with
 * the first. So the only thing that needs a home is the trigger, and the page
 * where most of its output lands is where someone would look for it.
 *
 * ## Why the last scan is stated rather than just the button
 *
 * The scan runs itself daily. Without the last-run line, a reader cannot tell an
 * automated pipeline that is working from one that has been failing quietly for a
 * fortnight, and the button invites a redundant manual run every visit.
 *
 * `skippedDuplicates` is reported for the same reason: a scan that found nine
 * signals and filed nothing because all nine were already open is working
 * correctly, and must not read as a scan that found nothing.
 *
 * ## Why the result is read from the scan log rather than the button press
 *
 * Starting a scan and finishing one are minutes apart, so they are two events and
 * the panel treats them as two. The POST answers in milliseconds with "it is
 * running"; the outcome is read by polling the scan log. The previous shape —
 * one request held open for the whole run — asserted an outcome from a response
 * that never arrived, and in production told an admin the scan "could not be
 * completed. Nothing was filed" while it went on to file seven findings.
 *
 * A consequence worth keeping: because the panel follows whichever scan the log
 * says is running, it also reports the nightly scheduled one, and one started
 * from another tab. The result belongs to the scan, not to the click.
 */
export const UxSignalsPanel: FC = () => {
  const dispatch = useDispatch();
  const features = useSelector((state: RootState) => state.user.features);
  const canScan = hasFeature(features, FeatureToggleKey.UX_SIGNALS);

  const [startError, setStartError] = useState<string | null>(null);
  const [result, setResult] = useState<UxSignalScan | null>(null);
  const [watchedScanId, setWatchedScanId] = useState<string | null>(null);
  const [pollMs, setPollMs] = useState(0);
  const [start, { isLoading: isStarting }] = useScanUxSignalsMutation();

  // Only fetched for readers who may scan — for anyone else the panel renders
  // nothing at all, so the request would be wasted.
  const { data } = useGetUxSignalScansQuery(
    { limit: 1 },
    { skip: !canScan, pollingInterval: pollMs },
  );
  const lastScan = data?.scans?.[0];

  const isRunning = lastScan?.status === UxSignalScanStatus.RUNNING;
  const hasStalled =
    isRunning && Date.now() - new Date(lastScan.startedAt).getTime() > STALE_RUNNING_MS;

  // Follow whatever is running, however it was started, and stop the moment
  // there is nothing live to follow — a stalled row included, since the backend
  // has given up on it too and polling it would never end.
  useEffect(() => {
    if (isRunning && !hasStalled) {
      setWatchedScanId(lastScan.id);
      setPollMs(POLL_INTERVAL_MS);
    } else {
      setPollMs(0);
      if (hasStalled) setWatchedScanId(null);
    }
  }, [isRunning, hasStalled, lastScan?.id]);

  // Report the run we were following, once it lands.
  useEffect(() => {
    if (!lastScan || lastScan.id !== watchedScanId) return;
    if (lastScan.status === UxSignalScanStatus.RUNNING) return;

    setWatchedScanId(null);
    setResult(lastScan);

    // The findings and suggestions exist *now*, which is why the invalidation is
    // here and not on the mutation: at the moment the scan was started there was
    // nothing new to fetch, and refetching then would only have re-shown what
    // both tables already displayed.
    if (lastScan.status === UxSignalScanStatus.COMPLETED) {
      dispatch(
        baseAPI.util.invalidateTags([
          { type: TAG_TYPES.BUG_HUNTER_FINDINGS, id: "LIST" },
          { type: TAG_TYPES.ANALYTICS_SUGGESTIONS, id: "LIST" },
        ]),
      );
    }
  }, [lastScan, watchedScanId, dispatch]);

  // The toggle governs the whole feature, not just the button: a reader who
  // cannot scan has no use for a panel about scanning.
  if (!canScan) return null;

  const runScan = async () => {
    setStartError(null);
    setResult(null);
    try {
      const started = await start().unwrap();
      // Claim the id from the response rather than waiting for the log to show
      // it: this is what keeps the button disabled across the gap between the
      // scan existing and the next poll noticing.
      setWatchedScanId(started.scanId);
      setPollMs(POLL_INTERVAL_MS);
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      const detail = (caught as { data?: { message?: string } })?.data?.message;
      setStartError(
        status === 409
          ? strings.scanConflict
          : status === 503
            ? (detail ?? strings.scanUnavailable)
            : (detail ?? strings.scanFailed),
      );
    }
  };

  const lastScanLine = () => {
    if (!lastScan) return strings.neverScanned;
    const when = new Date(lastScan.startedAt).toLocaleString();

    if (hasStalled) return fill(strings.scanStalled, { when });
    if (lastScan.status === UxSignalScanStatus.RUNNING) return strings.scanRunning;
    if (lastScan.status === UxSignalScanStatus.FAILED) {
      return fill(strings.lastScanFailed, {
        when,
        reason: lastScan.error ?? strings.scanUnknownReason,
      });
    }
    return fill(strings.lastScanSummary, {
      when,
      findings: lastScan.findingsCreated,
      suggestions: lastScan.suggestionsCreated,
    });
  };

  // Busy from the click until the result lands, not just while the POST is in
  // flight: the request now returns in milliseconds and the scan runs for two
  // minutes, so `isStarting` alone would re-enable the button almost immediately
  // and invite a second press that can only earn a 409.
  const isBusy = isStarting || Boolean(watchedScanId) || (isRunning && !hasStalled);

  const completed = result?.status === UxSignalScanStatus.COMPLETED;

  return (
    <Tile className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-typography-primary text-base font-medium">{strings.title}</h3>
          <p className="text-typography-700 mt-1 text-sm">{strings.description}</p>
          <p className="text-typography-600 mt-1 text-xs">{lastScanLine()}</p>
        </div>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={runScan}
          disabled={isBusy}
          /* The wait is ~2 minutes of detector queries plus one triage call, and
             it outlives this page — the label says what is happening, the
             tooltip says it keeps going if you leave. */
          title={strings.scanTooltip}
        >
          {isBusy ? strings.scanning : strings.scanNow}
        </Button>
      </div>

      {/* Zero counts are a real, successful result — a quiet week, or everything
          found was already filed. Saying so plainly is what stops the next
          reader from pressing the button again to check. A scan that ended in
          failure reports its own reason here rather than sending the reader to
          look for a log. */}
      {result && (
        <InlineNotification
          kind={completed ? (result.failedDetectors.length > 0 ? "warning" : "success") : "error"}
          lowContrast
          onCloseButtonClick={() => setResult(null)}
          title={
            completed
              ? fill(strings.scanDone, {
                  findings: result.findingsCreated,
                  suggestions: result.suggestionsCreated,
                })
              : ""
          }
          subtitle={
            completed
              ? [
                  fill(strings.scanDetail, {
                    signals: result.signalsDetected,
                    skipped: result.skippedDuplicates,
                  }),
                  result.failedDetectors.length > 0
                    ? fill(strings.detectorsFailed, {
                        detectors: result.failedDetectors.join(", "),
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : fill(strings.scanFailedReason, {
                  reason: result.error ?? strings.scanUnknownReason,
                })
          }
          className="max-w-full"
        />
      )}

      {/* Inline and dismissible rather than a toast: a 409 or a missing PostHog
          credential is something the reader has to act on, and the message has
          to still be there when they come back to it. */}
      {startError && (
        <InlineNotification
          kind="error"
          lowContrast
          onCloseButtonClick={() => setStartError(null)}
          title=""
          subtitle={startError}
          className="max-w-full"
        />
      )}
    </Tile>
  );
};
