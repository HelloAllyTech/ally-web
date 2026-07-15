import { useMemo } from "react";

import { DonutChart, LineChart } from "@carbon/charts-react";

import { Tile } from "@ally-ui-mono/ui-shared";
import { useGetScribeOverviewQuery, useGetScribeSummaryFailuresQuery } from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, PALETTE, donutOpts, lineOpts } from "../chartKit";

const BUCKET_TITLE: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

// Human labels for the summaryStatus outcome donut. PENDING + IN_PROGRESS are
// both mapped to "Processing" so the donut's categories line up 1:1 with the
// KPI tiles above (which merge them into a single "Processing" count).
const OUTCOME_LABELS: Record<string, string> = {
  SUCCESS: "Summarised",
  FAILED: "Failed",
  IN_PROGRESS: "Processing",
  PENDING: "Processing",
  NO_AUDIO: "No audio",
};
const OUTCOME_COLORS: Record<string, string> = {
  Summarised: PALETTE.green,
  Failed: PALETTE.red,
  Processing: PALETTE.gold,
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

/** Human labels for the pipeline drop-off funnel phases. */
const PHASE_LABELS: Record<string, string> = {
  created: "Created",
  "audio-uploaded": "Audio uploaded",
  transcribed: "Transcribed",
  diarized: "Diarized",
  summarized: "Summarized",
  delivered: "Delivered (done)",
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
  // Aggregate by mapped label so PENDING + IN_PROGRESS collapse into one
  // "Processing" slice — matching the KPI tiles above exactly.
  const outcomeData = useMemo(() => {
    const byLabel = new Map<string, number>();
    for (const o of overview.data?.outcomeBreakdown ?? []) {
      if (o.count <= 0) continue;
      const label = OUTCOME_LABELS[o.key] ?? o.key;
      byLabel.set(label, (byLabel.get(label) ?? 0) + o.count);
    }
    return Array.from(byLabel, ([group, value]) => ({ group, value }));
  }, [overview.data]);
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

  // Two series: "First attempt" (the true health signal, from the write-once
  // first-attempt columns) and "Final" (post-backfill residual). The gap
  // between them is exactly what the backfill recovers.
  // A period with no terminal sessions has an undefined rate (0/0), not 0%.
  // Rather than break the line (looks buggy) or plot 0 (falsely reads as
  // "failures fixed"), CARRY THE LAST KNOWN RATE FORWARD, so an empty period
  // renders as a flat horizontal continuation. Leading periods before any data
  // stay null (nothing to hold yet).
  const rateData = useMemo(() => {
    const trend = failures.data?.failureRateTrend ?? [];
    let lastFirst: number | null = null;
    let lastFinal: number | null = null;
    const points: { group: string; key: string; value: number | null }[] = [];
    for (const p of trend) {
      if (p.firstAttemptTerminal > 0) {
        lastFirst = parseFloat((p.firstAttemptFailureRate * 100).toFixed(1));
      }
      if (p.terminal > 0) {
        lastFinal = parseFloat((p.failureRate * 100).toFixed(1));
      }
      points.push({ group: "First attempt", key: p.bucket, value: lastFirst });
      points.push({ group: "Final (after retries)", key: p.bucket, value: lastFinal });
    }
    return points;
  }, [failures.data]);
  const phaseFunnel = failures.data?.phaseFunnel ?? [];
  const funnelMax = Math.max(...phaseFunnel.map(p => p.reached), 1);
  const sttProviderStats = failures.data?.sttProviderStats ?? [];
  const summaryModelData = useMemo(
    () =>
      (failures.data?.summaryModelStats ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: o.key, value: o.count })),
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
              caption="First-attempt (health signal) vs final after retries/backfill — the gap is what backfill recovers"
              loading={failuresLoading}
              wide
              empty={!failures.data?.failureRateTrend?.length}
            >
              <LineChart
                data={rateData}
                options={lineOpts({
                  leftTitle: "Failure rate %",
                  bottomTitle: failuresBucketTitle,
                  colorScale: {
                    "First attempt": PALETTE.red,
                    "Final (after retries)": PALETTE.blue,
                  },
                  legend: true,
                })}
              />
            </ChartCard>
            <ChartCard
              title="Where sessions stop"
              caption="Pipeline drop-off funnel — sessions that reached each phase (post-rollout sessions)"
              loading={failuresLoading}
              wide
              empty={!phaseFunnel.some(p => p.reached > 0)}
            >
              <div className="flex flex-col gap-2">
                {phaseFunnel.map(p => (
                  <div key={p.phase} className="flex items-center gap-3">
                    <div
                      className="text-sm text-typography-900 truncate"
                      style={{ flex: "0 0 35%" }}
                      title={p.phase}
                    >
                      {PHASE_LABELS[p.phase] ?? p.phase}
                    </div>
                    <div className="flex-1 h-3 rounded" style={{ background: "#f0f0f0" }}>
                      <div
                        className="h-3 rounded"
                        style={{
                          width: `${Math.round((p.reached / funnelMax) * 100)}%`,
                          background: p.phase === "delivered" ? PALETTE.teal : PALETTE.blue,
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-typography-900 w-12 text-right">
                      {p.reached}
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
            <ChartCard
              title="STT provider reliability"
              caption="Per-provider tries vs failures across the fallback chain (populated once the AI service reports it)"
              loading={failuresLoading}
              wide
              empty={!sttProviderStats.length}
            >
              <div className="flex flex-col gap-2">
                {sttProviderStats.map(s => {
                  const failPct = s.tried > 0 ? Math.round((s.failed / s.tried) * 100) : 0;
                  return (
                    <div key={s.provider} className="flex items-center gap-3">
                      <div
                        className="text-sm text-typography-900 truncate capitalize"
                        style={{ flex: "0 0 25%" }}
                        title={s.provider}
                      >
                        {s.provider}
                      </div>
                      <div
                        className="flex-1 h-3 rounded overflow-hidden flex"
                        style={{ background: "#f0f0f0" }}
                        title={`${s.ok} ok / ${s.failed} failed of ${s.tried} tries`}
                      >
                        <div
                          className="h-3"
                          style={{
                            width: `${s.tried > 0 ? (s.ok / s.tried) * 100 : 0}%`,
                            background: PALETTE.teal,
                          }}
                        />
                        <div
                          className="h-3"
                          style={{
                            width: `${failPct}%`,
                            background: PALETTE.red,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium text-typography-900 w-20 text-right">
                        {failPct}% fail
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
            <ChartCard
              title="Summaries by model"
              caption="Which LLM produced successful summaries (populated once the AI service reports it)"
              loading={failuresLoading}
              empty={!summaryModelData.length}
            >
              <DonutChart
                data={summaryModelData}
                options={donutOpts({ centerLabel: "Summaries" })}
              />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
