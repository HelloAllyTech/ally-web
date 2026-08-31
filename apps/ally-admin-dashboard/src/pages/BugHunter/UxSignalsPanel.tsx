import { FC, useState } from "react";

import { useSelector } from "react-redux";

import { InlineNotification, Tile } from "@ally-ui-mono/ui-shared";
import { useGetUxSignalScansQuery, useScanUxSignalsMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, FeatureToggleKey } from "@constants";
import { RootState } from "@store";
import { UxScanOutcome, UxSignalScanStatus } from "@types";
import { hasFeature } from "@utils";

const strings = en.uxSignals;

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
 */
export const UxSignalsPanel: FC = () => {
  const features = useSelector((state: RootState) => state.user.features);
  const canScan = hasFeature(features, FeatureToggleKey.UX_SIGNALS);

  const [outcome, setOutcome] = useState<UxScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scan, { isLoading: isScanning }] = useScanUxSignalsMutation();

  // Only fetched for readers who may scan — for anyone else the panel renders
  // nothing at all, so the request would be wasted.
  const { data } = useGetUxSignalScansQuery({ limit: 1 }, { skip: !canScan });
  const lastScan = data?.scans?.[0];

  // The toggle governs the whole feature, not just the button: a reader who
  // cannot scan has no use for a panel about scanning.
  if (!canScan) return null;

  const runScan = async () => {
    setError(null);
    setOutcome(null);
    try {
      setOutcome(await scan().unwrap());
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      const detail = (caught as { data?: { message?: string } })?.data?.message;
      setError(
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
    if (lastScan.status === UxSignalScanStatus.FAILED) {
      return fill(strings.lastScanFailed, {
        when: new Date(lastScan.startedAt).toLocaleString(),
      });
    }
    if (lastScan.status === UxSignalScanStatus.RUNNING) return strings.scanRunning;
    return fill(strings.lastScanSummary, {
      when: new Date(lastScan.startedAt).toLocaleString(),
      findings: lastScan.findingsCreated,
      suggestions: lastScan.suggestionsCreated,
    });
  };

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
          disabled={isScanning}
          /* The wait is ~2 minutes of detector queries plus one triage call, so
             the label states what is happening rather than leaving a spinner to
             imply something faster. */
          title={strings.scanTooltip}
        >
          {isScanning ? strings.scanning : strings.scanNow}
        </Button>
      </div>

      {/* Zero counts are a real, successful result — a quiet week, or everything
          found was already filed. Saying so plainly is what stops the next
          reader from pressing the button again to check. */}
      {outcome && (
        <InlineNotification
          kind={outcome.failedDetectors.length > 0 ? "warning" : "success"}
          lowContrast
          onCloseButtonClick={() => setOutcome(null)}
          title={fill(strings.scanDone, {
            findings: outcome.findingsCreated,
            suggestions: outcome.suggestionsCreated,
          })}
          subtitle={[
            fill(strings.scanDetail, {
              signals: outcome.signalsDetected,
              skipped: outcome.skippedDuplicates,
            }),
            outcome.failedDetectors.length > 0
              ? fill(strings.detectorsFailed, {
                  detectors: outcome.failedDetectors.join(", "),
                })
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          className="max-w-full"
        />
      )}

      {/* Inline and dismissible rather than a toast: a 409 or a missing PostHog
          credential is something the reader has to act on, and the message has
          to still be there when they come back to it. */}
      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          onCloseButtonClick={() => setError(null)}
          title=""
          subtitle={error}
          className="max-w-full"
        />
      )}
    </Tile>
  );
};
