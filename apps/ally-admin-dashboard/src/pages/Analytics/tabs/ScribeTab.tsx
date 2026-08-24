import { useMemo, useState } from "react";

import { DonutChart, LineChart, SimpleBarChart } from "@carbon/charts-react";

import { useGetScribeOverviewQuery, useGetScribeSummaryFailuresQuery } from "@api";

import { AnalyticsTabFilters, asOf, windowLabel } from "../analyticsFilters";
import { ChartDetailModal } from "../ChartDetailModal";
import {
  ChartCard,
  KpiTile,
  ScrollableChart,
  buildSource,
  donutOpts,
  hBarOpts,
  lineOpts,
  single,
} from "../chartKit";
import {
  CAPTURE_SCALE,
  CONTEXT,
  NOTE_MODE_SCALE,
  OUTCOME_SCALE,
  PALETTE,
  stableScale,
} from "../chartScales";
import { FunnelBars, FunnelStage } from "../FunnelBars";
import { delta, formatKpi } from "../highlightsChart";

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

const FAILURE_GROUPS = {
  firstAttempt: "First attempt",
  final: "Final (after retries)",
};

/**
 * First attempt is the health signal and leads; the post-retry residual is
 * context. Both are rates over the same denominator, so they share an axis
 * honestly.
 */
const FAILURE_SCALE = {
  [FAILURE_GROUPS.firstAttempt]: PALETTE.red,
  [FAILURE_GROUPS.final]: CONTEXT.strong,
};

const SubHeading = ({ children }: { children: string }) => (
  <h2 className="text-xs font-medium uppercase tracking-wide text-typography-500 mt-8 mb-3">
    {children}
  </h2>
);

/**
 * Scribe — session volume/outcome overview plus summary-generation failures, both
 * derived from the `chats` table (real counselor sessions) and not
 * language-scoped; only the shared time range applies.
 */
export const ScribeTab = ({ query }: AnalyticsTabFilters) => {
  const overview = useGetScribeOverviewQuery({ ...query, compare: "prev" });
  const failures = useGetScribeSummaryFailuresQuery(query);
  const [expanded, setExpanded] = useState<string | null>(null);

  const overviewLoading = overview.isLoading && !overview.data;
  const overviewBucketTitle = BUCKET_TITLE[overview.data?.bucket ?? ""] ?? "Period";
  const oWindow = windowLabel(overview.data?.window);
  const fWindow = windowLabel(failures.data?.window);
  const basis = overview.data?.previousLabel ? `vs ${overview.data.previousLabel}` : undefined;

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

  const captureMethodData = useMemo(
    () =>
      (overview.data?.captureBreakdown ?? [])
        .filter(m => m.count > 0)
        .map(m => ({ group: CAPTURE_LABELS[m.key] ?? m.key, value: m.count })),
    [overview.data],
  );

  // The overview also returns a note-mode split for ALL sessions, which was
  // fetched and never rendered. It is the denominator the failures-by-note-mode
  // donut needs to be readable, so it earns a panel.
  const noteModeAllData = useMemo(
    () =>
      (overview.data?.modeBreakdown ?? [])
        .filter(m => m.count > 0)
        .map(m => ({ group: NOTE_MODE_LABELS[m.key] ?? m.key, value: m.count })),
    [overview.data],
  );

  const overviewSummary = overview.data?.summary;
  const overviewPrev = overview.data?.previous;
  const overviewKpis = [
    {
      label: "Total sessions",
      value: formatKpi(overviewSummary?.totalSessions),
      delta: delta(overviewSummary?.totalSessions, overviewPrev?.totalSessions),
      comparisonLabel: basis,
      deltaDecimals: 0,
      loading: overviewLoading,
      error: overview.isError,
      onRetry: overview.refetch,
    },
    {
      label: "Summary success rate",
      value: formatKpi(overviewSummary?.successRatePct, { suffix: "%" }),
      n: overviewSummary?.totalSessions,
      nUnit: "sessions",
      delta: delta(overviewSummary?.successRatePct, overviewPrev?.successRatePct),
      comparisonLabel: basis,
      deltaSuffix: "pp",
      loading: overviewLoading,
      error: overview.isError,
      onRetry: overview.refetch,
    },
    {
      label: "Processing",
      value: formatKpi(overviewSummary?.processing),
      loading: overviewLoading,
      error: overview.isError,
      onRetry: overview.refetch,
    },
    {
      label: "Failed",
      value: formatKpi(overviewSummary?.failed),
      delta: delta(overviewSummary?.failed, overviewPrev?.failed),
      comparisonLabel: basis,
      deltaDecimals: 0,
      // More failures is worse, so the arrow and colour must invert.
      higherIsBetter: false,
      loading: overviewLoading,
      error: overview.isError,
      onRetry: overview.refetch,
    },
    {
      label: "No audio",
      value: formatKpi(overviewSummary?.noAudio),
      loading: overviewLoading,
      error: overview.isError,
      onRetry: overview.refetch,
    },
  ];

  const failuresLoading = failures.isLoading && !failures.data;
  const failuresBucketTitle = BUCKET_TITLE[failures.data?.bucket ?? ""] ?? "Period";

  /**
   * Two failure-rate series: "First attempt" (the true health signal, from the
   * write-once first-attempt columns) and "Final" (post-backfill residual). The
   * gap between them is what the backfill recovers.
   *
   * A period with no terminal sessions has an undefined rate (0/0). This used to
   * CARRY THE LAST KNOWN RATE FORWARD, which drew a flat horizontal line
   * indistinguishable from a genuinely measured plateau — a fabricated
   * measurement, and the most misleading thing on the tab. Unmeasured periods now
   * emit null and render as a visible gap.
   */
  const rateData = useMemo(() => {
    const trend = failures.data?.failureRateTrend ?? [];
    return trend.flatMap(p => [
      {
        group: FAILURE_GROUPS.firstAttempt,
        key: p.bucket,
        value:
          p.firstAttemptTerminal > 0
            ? parseFloat((p.firstAttemptFailureRate * 100).toFixed(1))
            : null,
      },
      {
        group: FAILURE_GROUPS.final,
        key: p.bucket,
        value: p.terminal > 0 ? parseFloat((p.failureRate * 100).toFixed(1)) : null,
      },
    ]);
  }, [failures.data]);

  const terminalSessions = useMemo(
    () => (failures.data?.failureRateTrend ?? []).reduce((sum, p) => sum + p.terminal, 0),
    [failures.data],
  );

  const funnelStages: FunnelStage[] = useMemo(
    () =>
      (failures.data?.phaseFunnel ?? []).map(p => ({
        label: PHASE_LABELS[p.phase] ?? p.phase,
        reached: p.reached,
        terminal: p.phase === "delivered",
      })),
    [failures.data],
  );

  const sttProviderStats = failures.data?.sttProviderStats ?? [];

  const summaryModelData = useMemo(
    () =>
      (failures.data?.summaryModelStats ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: o.key, value: o.count })),
    [failures.data],
  );
  const summaryModelScale = useMemo(
    () => stableScale(summaryModelData.map(d => d.group)),
    [summaryModelData],
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
      value: formatKpi(failuresSummary?.failureRatePct, { suffix: "%" }),
      n: failuresSummary?.totalTerminal,
      nUnit: "resolved sessions",
      higherIsBetter: false,
      loading: failuresLoading,
      error: failures.isError,
      onRetry: failures.refetch,
    },
    {
      label: "Total failed",
      value: formatKpi(failuresSummary?.totalFailed),
      loading: failuresLoading,
      error: failures.isError,
      onRetry: failures.refetch,
    },
    {
      label: "Retryable share",
      value: formatKpi(failuresSummary?.retryableSharePct, { suffix: "%" }),
      n: failuresSummary?.totalFailed,
      nUnit: "failures",
      loading: failuresLoading,
      error: failures.isError,
      onRetry: failures.refetch,
    },
    {
      label: "Timeout share",
      value: formatKpi(failuresSummary?.timeoutSharePct, { suffix: "%" }),
      n: failuresSummary?.totalFailed,
      nUnit: "failures",
      loading: failuresLoading,
      error: failures.isError,
      onRetry: failures.refetch,
    },
  ];

  const sessionsOpts = lineOpts({
    leftTitle: "Sessions",
    bottomTitle: overviewBucketTitle,
    colorScale: single("Sessions"),
    legend: false,
    extra: { points: { enabled: false } },
  });

  const rateOpts = lineOpts({
    leftTitle: "Failure rate %",
    bottomTitle: failuresBucketTitle,
    colorScale: FAILURE_SCALE,
  });

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
              <KpiTile key={kpi.label} {...kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Scribe sessions over time"
              caption="Counselor sessions created per period."
              source={buildSource({
                derivation: "chats.createdAt, bucketed",
                window: oWindow,
                n: overviewSummary?.totalSessions,
                nUnit: "sessions",
                asOf: asOf(overview.data?.window),
              })}
              loading={overviewLoading}
              wide
              empty={!overview.data?.sessionsTrend?.length}
              onExpand={() => setExpanded("sessions")}
            >
              <ScrollableChart data={sessionsData}>
                <LineChart data={sessionsData} options={sessionsOpts} />
              </ScrollableChart>
            </ChartCard>

            <ChartCard
              title="Outcome breakdown"
              caption="Sessions by summary status. Same four categories, same colours, as the tiles above."
              source={buildSource({
                derivation: "chats.summaryStatus",
                window: oWindow,
                n: overviewSummary?.totalSessions,
                nUnit: "sessions",
              })}
              loading={overviewLoading}
              empty={!outcomeData.length}
            >
              <DonutChart
                data={outcomeData}
                options={donutOpts({ centerLabel: "Sessions", colorScale: OUTCOME_SCALE })}
              />
            </ChartCard>

            <ChartCard
              title="Capture method — all sessions"
              caption="How the audio was recorded. This is the denominator for the failures-by-capture chart below."
              source={buildSource({
                derivation: "call_details.callInfo->>'provider'",
                window: oWindow,
                n: overviewSummary?.totalSessions,
                nUnit: "sessions",
              })}
              loading={overviewLoading}
              empty={!captureMethodData.length}
            >
              <DonutChart
                data={captureMethodData}
                options={donutOpts({ centerLabel: "Sessions", colorScale: CAPTURE_SCALE })}
              />
            </ChartCard>

            <ChartCard
              title="Note mode — all sessions"
              caption="Summary style, independent of how audio was captured. Denominator for the failures-by-mode chart below."
              source={buildSource({
                derivation: "call_details.callInfo->>'mode'",
                window: oWindow,
                n: overviewSummary?.totalSessions,
                nUnit: "sessions",
              })}
              loading={overviewLoading}
              empty={!noteModeAllData.length}
            >
              <DonutChart
                data={noteModeAllData}
                options={donutOpts({ centerLabel: "Sessions", colorScale: NOTE_MODE_SCALE })}
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
              <KpiTile key={kpi.label} {...kpi} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard
              title="Summary failure rate over time"
              caption="First attempt is the health signal; final is what remains after retries and backfill — the gap is what backfill recovers. Gaps in the lines are periods with no resolved sessions, not periods without failures."
              source={buildSource({
                derivation: "Failed ÷ resolved (SUCCESS + FAILED) sessions per period",
                window: fWindow,
                n: terminalSessions,
                nUnit: "resolved sessions",
                asOf: asOf(failures.data?.window),
              })}
              loading={failuresLoading}
              wide
              empty={!failures.data?.failureRateTrend?.length}
              onExpand={() => setExpanded("failureRate")}
            >
              <ScrollableChart data={rateData}>
                <LineChart data={rateData} options={rateOpts} />
              </ScrollableChart>
            </ChartCard>

            <ChartCard
              title="Where sessions stop"
              caption="Pipeline drop-off. The right-hand figure is conversion from the previous phase — that is where the loss actually happens."
              source={buildSource({
                derivation: "Furthest phase reached per session (post-rollout sessions only)",
                window: fWindow,
                n: funnelStages[0]?.reached,
                nUnit: "sessions",
                asOf: asOf(failures.data?.window),
              })}
              loading={failuresLoading}
              wide
              empty={!funnelStages.some(p => p.reached > 0)}
            >
              <FunnelBars stages={funnelStages} unit="sessions" />
            </ChartCard>

            <ChartCard
              title="Failures by capture method"
              caption="Compare against the all-sessions capture split above — a method with more failures may simply have more sessions."
              source={buildSource({
                derivation: "Failed sessions grouped by capture provider",
                window: fWindow,
                n: failuresSummary?.totalFailed,
                nUnit: "failures",
              })}
              loading={failuresLoading}
              empty={!captureData.length}
            >
              <DonutChart
                data={captureData}
                options={donutOpts({ centerLabel: "Failures", colorScale: CAPTURE_SCALE })}
              />
            </ChartCard>

            <ChartCard
              title="Failures by note mode"
              caption="Compare against the all-sessions note-mode split above."
              source={buildSource({
                derivation: "Failed sessions grouped by note mode",
                window: fWindow,
                n: failuresSummary?.totalFailed,
                nUnit: "failures",
              })}
              loading={failuresLoading}
              empty={!noteModeData.length}
            >
              <DonutChart
                data={noteModeData}
                options={donutOpts({ centerLabel: "Failures", colorScale: NOTE_MODE_SCALE })}
              />
            </ChartCard>

            <ChartCard
              title="STT provider reliability"
              caption="Failure share across the fallback chain, with the attempt count that makes it meaningful. Populated once the AI service reports the provider trail."
              source={buildSource({
                derivation: "chat_summary_attempts.sttAttempts, expanded per attempt",
                window: fWindow,
                asOf: asOf(failures.data?.window),
              })}
              loading={failuresLoading}
              wide
              empty={!sttProviderStats.length}
            >
              <div className="flex flex-col gap-2">
                {sttProviderStats.map(s => {
                  // Both widths come from the same rounded percentage, so the two
                  // segments always sum to exactly 100% of the track. Rounding
                  // one and not the other let the stack overflow or under-fill.
                  const failPct = s.tried > 0 ? Math.round((s.failed / s.tried) * 1000) / 10 : 0;
                  const okPct = s.tried > 0 ? 100 - failPct : 0;
                  return (
                    <div key={s.provider} className="flex items-center gap-3 text-xs">
                      <div
                        className="w-28 shrink-0 truncate capitalize text-typography-700"
                        title={s.provider}
                      >
                        {s.provider}
                      </div>
                      <div
                        className="flex-1 h-5 rounded overflow-hidden flex"
                        style={{ background: "#f0f0f0" }}
                      >
                        <div style={{ width: `${okPct}%`, background: PALETTE.teal }} />
                        <div style={{ width: `${failPct}%`, background: PALETTE.red }} />
                      </div>
                      <div className="w-20 shrink-0 text-right font-medium text-typography-900">
                        {failPct}% fail
                      </div>
                      {/* The denominator is on the surface, not in a hover title:
                          1 failure of 1 try and 1,000 of 1,000 both read as
                          "100% fail" and mean entirely different things. */}
                      <div className="w-32 shrink-0 text-right" style={{ color: CONTEXT.strong }}>
                        {s.failed.toLocaleString()} of {s.tried.toLocaleString()} tries
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            <ChartCard
              title="Summaries by model"
              caption="Which LLM produced successful summaries. Populated once the AI service reports the model."
              source={buildSource({
                derivation: "chat_summary_attempts.summaryModel on successful attempts",
                window: fWindow,
              })}
              loading={failuresLoading}
              empty={!summaryModelData.length}
            >
              {/* Horizontal bars, not a donut: model ids are long free-text
                  labels and the count is unbounded, which is the case a donut
                  handles worst. */}
              <SimpleBarChart
                data={summaryModelData}
                options={hBarOpts({ bottomTitle: "Summaries", colorScale: summaryModelScale })}
              />
            </ChartCard>
          </div>
        </>
      )}

      {expanded === "sessions" && (
        <ChartDetailModal
          open={expanded === "sessions"}
          onClose={() => setExpanded(null)}
          title="Scribe sessions over time"
          source={buildSource({ derivation: "chats.createdAt, bucketed", window: oWindow })}
          table={{
            columns: [overviewBucketTitle, "Sessions"],
            rows: (overview.data?.sessionsTrend ?? []).map(p => [p.bucket, p.count]),
          }}
          exportContext={[`Window: ${oWindow}`]}
          render={({ height }) => (
            <ScrollableChart data={sessionsData}>
              <LineChart data={sessionsData} options={{ ...sessionsOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}

      {expanded === "failureRate" && (
        <ChartDetailModal
          open={expanded === "failureRate"}
          onClose={() => setExpanded(null)}
          title="Summary failure rate over time"
          caption="Blank rate cells are periods with no resolved sessions — nothing was measured, rather than nothing failed."
          source={buildSource({
            derivation: "Failed ÷ resolved (SUCCESS + FAILED) sessions per period",
            window: fWindow,
            n: terminalSessions,
            nUnit: "resolved sessions",
          })}
          table={{
            columns: [
              failuresBucketTitle,
              "First attempt %",
              "Final %",
              "Failed",
              "Resolved",
              "First-attempt resolved",
            ],
            rows: (failures.data?.failureRateTrend ?? []).map(p => [
              p.bucket,
              p.firstAttemptTerminal > 0
                ? parseFloat((p.firstAttemptFailureRate * 100).toFixed(1))
                : null,
              p.terminal > 0 ? parseFloat((p.failureRate * 100).toFixed(1)) : null,
              p.failed,
              p.terminal,
              p.firstAttemptTerminal,
            ]),
          }}
          exportContext={[`Window: ${fWindow}`]}
          render={({ height }) => (
            <ScrollableChart data={rateData}>
              <LineChart data={rateData} options={{ ...rateOpts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </div>
  );
};
