import { useMemo } from "react";

import { DonutChart, LineChart } from "@carbon/charts-react";
import { Tile } from "@carbon/react";

import { useGetScribeOverviewQuery, useGetScribeSummaryFailuresQuery } from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, PALETTE, donutOpts, lineOpts } from "../chartKit";

const BUCKET_TITLE: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** Human labels + colors for the summaryStatus outcome donut. */
const OUTCOME_LABELS: Record<string, string> = {
  SUCCESS: "Summarised",
  FAILED: "Failed",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
  NO_AUDIO: "No audio",
};
const OUTCOME_COLORS: Record<string, string> = {
  Summarised: PALETTE.green,
  Failed: PALETTE.red,
  "In progress": PALETTE.blue,
  Pending: PALETTE.gold,
  "No audio": PALETTE.gray,
};
/** Note-mode labels (summary style — independent of how audio was captured). */
const NOTE_MODE_LABELS: Record<string, string> = {
  DICTATION: "Dictation",
  SCRIBE: "Scribe",
  UNKNOWN: "Unknown",
};

/** Capture-method labels (how the audio was recorded). */
const CAPTURE_LABELS: Record<string, string> = {
  live: "Live (streamed)",
  upload: "Upload (file)",
  unknown: "Unknown",
};

const SubHeading = ({ children }: { children: string }) => (
  <p className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </p>
);

/**
 * Scribe — session volume/outcome overview plus summary-generation failures,
 * both derived from the `chats` table (real counselor sessions) and not
 * language-scoped; only the shared time range applies.
 */
export const ScribeTab = ({ range }: { range: AnalyticsRange }) => {
  const overview = useGetScribeOverviewQuery({ range });
  const failures = useGetScribeSummaryFailuresQuery({ range });

  const overviewLoading = overview.isLoading && !overview.data;
  const overviewBucketTitle = BUCKET_TITLE[overview.data?.bucket ?? ""] ?? "Period";

  const sessionsData = useMemo(
    () =>
      (overview.data?.sessionsTrend ?? []).map(p => ({
        group: "Sessions",
        key: p.bucket,
        value: p.count,
      })),
    [overview.data],
  );
  const outcomeData = useMemo(
    () =>
      (overview.data?.outcomeBreakdown ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: OUTCOME_LABELS[o.key] ?? o.key, value: o.count })),
    [overview.data],
  );
  // All-sessions capture method (how the audio was recorded), grouped by
  // provider — NOT note mode. This is the honest upload-vs-live split and is
  // consistent with the "Failures by capture method" chart.
  const captureMethodData = useMemo(
    () =>
      (overview.data?.captureBreakdown ?? [])
        .filter(m => m.count > 0)
        .map(m => ({ group: CAPTURE_LABELS[m.key] ?? m.key, value: m.count })),
    [overview.data],
  );

  const overviewSummary = overview.data?.summary;
  const overviewKpis = [
    {
      label: "Total sessions",
      value: overviewSummary ? overviewSummary.totalSessions.toLocaleString() : "—",
    },
    {
      label: "Summary success rate",
      value: overviewSummary ? `${overviewSummary.successRatePct}%` : "—",
    },
    {
      label: "Processing",
      value: overviewSummary ? overviewSummary.processing.toLocaleString() : "—",
    },
    { label: "Failed", value: overviewSummary ? overviewSummary.failed.toLocaleString() : "—" },
    {
      label: "No audio",
      value: overviewSummary ? overviewSummary.noAudio.toLocaleString() : "—",
    },
  ];

  const failuresLoading = failures.isLoading && !failures.data;
  const failuresBucketTitle = BUCKET_TITLE[failures.data?.bucket ?? ""] ?? "Period";

  const rateData = useMemo(
    () =>
      (failures.data?.failureRateTrend ?? []).map(p => ({
        group: "Failure rate",
        key: p.bucket,
        // A day with no terminal sessions has an undefined rate (0/0), not 0%.
        // Emit a gap (null) so the line breaks instead of dropping to the floor
        // — a 0 there falsely reads as "failures improved". A real 0% (sessions
        // ran, none failed) still plots as 0.
        value: p.terminal > 0 ? parseFloat((p.failureRate * 100).toFixed(1)) : null,
      })),
    [failures.data],
  );
  const noteModeData = useMemo(
    () =>
      (failures.data?.failuresByMode ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: NOTE_MODE_LABELS[o.key] ?? o.key, value: o.count })),
    [failures.data],
  );
  const captureData = useMemo(
    () =>
      (failures.data?.failuresByCaptureMethod ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: CAPTURE_LABELS[o.key] ?? o.key, value: o.count })),
    [failures.data],
  );
  const breakdown = failures.data?.failureBreakdown ?? [];
  const breakdownMax = Math.max(...breakdown.map(b => b.count), 1);

  const failuresSummary = failures.data?.summary;
  const failuresKpis = [
    {
      label: "Summary failure rate",
      value: failuresSummary ? `${failuresSummary.failureRatePct}%` : "—",
    },
    {
      label: "Total failed",
      value: failuresSummary ? failuresSummary.totalFailed.toLocaleString() : "—",
    },
    {
      label: "Retryable share",
      value: failuresSummary ? `${failuresSummary.retryableSharePct}%` : "—",
    },
    {
      label: "Timeout share",
      value: failuresSummary ? `${failuresSummary.timeoutSharePct}%` : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {overview.isError ? (
        <ChartCard
          error
          onRetry={overview.refetch}
          errorTitle="Couldn't load scribe analytics"
          errorSubtitle="There was a problem fetching scribe session metrics."
        >
          <div />
        </ChartCard>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {overviewKpis.map(kpi => (
              <Tile key={kpi.label} className="analytics-kpi">
                <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
                <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
              </Tile>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Scribe sessions over time"
              caption="Sessions created per period"
              loading={overviewLoading}
              wide
              empty={!overview.data?.sessionsTrend?.length}
            >
              <LineChart
                data={sessionsData}
                options={lineOpts({
                  leftTitle: "Sessions",
                  bottomTitle: overviewBucketTitle,
                  colorScale: { Sessions: PALETTE.blue },
                  legend: false,
                  extra: { points: { enabled: false } },
                })}
              />
            </ChartCard>
            <ChartCard
              title="Outcome breakdown"
              caption="Sessions by summary status"
              loading={overviewLoading}
              empty={!outcomeData.length}
            >
              <DonutChart
                data={outcomeData}
                options={donutOpts({
                  centerLabel: "Sessions",
                  extra: { color: { scale: OUTCOME_COLORS } },
                })}
              />
            </ChartCard>
            <ChartCard
              title="Capture method"
              caption="How the audio was recorded: uploaded file vs live stream"
              loading={overviewLoading}
              empty={!captureMethodData.length}
            >
              <DonutChart
                data={captureMethodData}
                options={donutOpts({
                  centerLabel: "Sessions",
                  extra: {
                    color: {
                      scale: {
                        "Upload (file)": PALETTE.purple,
                        "Live (streamed)": PALETTE.teal,
                        Unknown: PALETTE.gray,
                      },
                    },
                  },
                })}
              />
            </ChartCard>
          </div>
        </>
      )}

      <SubHeading>Summary failures</SubHeading>

      {failures.isError ? (
        <ChartCard
          error
          onRetry={failures.refetch}
          errorTitle="Couldn't load summary-failure analytics"
          errorSubtitle="There was a problem fetching scribe failure metrics."
        >
          <div />
        </ChartCard>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {failuresKpis.map(kpi => (
              <Tile key={kpi.label} className="analytics-kpi">
                <p className="text-sm text-typography-600 mb-2">{kpi.label}</p>
                <p className="text-3xl font-medium text-typography-900">{kpi.value}</p>
              </Tile>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Summary failure rate over time"
              caption="Failed / (summarised + failed), per period — excludes no-audio and in-flight"
              loading={failuresLoading}
              wide
              empty={!failures.data?.failureRateTrend?.length}
            >
              <LineChart
                data={rateData}
                options={lineOpts({
                  leftTitle: "Failure rate %",
                  bottomTitle: failuresBucketTitle,
                  colorScale: { "Failure rate": PALETTE.red },
                  legend: false,
                })}
              />
            </ChartCard>
            <ChartCard
              title="Failure breakdown"
              caption="One bucket per failure — audio lifecycle state first, then pipeline reason"
              loading={failuresLoading}
              wide
              empty={!breakdown.length}
            >
              <div className="flex flex-col gap-2">
                {breakdown.map(r => (
                  <div key={r.key} className="flex items-center gap-3">
                    <div
                      className="text-sm text-typography-900 truncate"
                      style={{ flex: "0 0 55%" }}
                      title={r.key}
                    >
                      {r.key}
                    </div>
                    <div className="flex-1 h-3 rounded" style={{ background: "#f0f0f0" }}>
                      <div
                        className="h-3 rounded"
                        style={{
                          width: `${Math.round((r.count / breakdownMax) * 100)}%`,
                          background: PALETTE.red,
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-typography-900 w-10 text-right">
                      {r.count}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
            <ChartCard
              title="Failures by capture method"
              caption="How the audio was recorded: live stream vs uploaded file"
              loading={failuresLoading}
              empty={!captureData.length}
            >
              <DonutChart
                data={captureData}
                options={donutOpts({
                  centerLabel: "Failures",
                  extra: {
                    color: {
                      scale: {
                        "Live (streamed)": PALETTE.magenta,
                        "Upload (file)": PALETTE.blue,
                        Unknown: PALETTE.gray,
                      },
                    },
                  },
                })}
              />
            </ChartCard>
            <ChartCard
              title="Failures by note mode"
              caption="Summary style — independent of how audio was captured"
              loading={failuresLoading}
              empty={!noteModeData.length}
            >
              <DonutChart
                data={noteModeData}
                options={donutOpts({
                  centerLabel: "Failures",
                  extra: {
                    color: {
                      scale: {
                        Dictation: PALETTE.purple,
                        Scribe: PALETTE.teal,
                        Unknown: PALETTE.gray,
                      },
                    },
                  },
                })}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
