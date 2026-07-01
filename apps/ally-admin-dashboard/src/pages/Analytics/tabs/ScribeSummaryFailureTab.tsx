import { useMemo } from "react";

import { DonutChart, LineChart } from "@carbon/charts-react";
import { Tile } from "@carbon/react";

import { useGetScribeSummaryFailuresQuery } from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, PALETTE, donutOpts, lineOpts } from "../chartKit";

const BUCKET_TITLE: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** Session-mode labels (DICTATION = live, SCRIBE = uploaded recording). */
const MODE_LABELS: Record<string, string> = {
  DICTATION: "Live (Dictation)",
  SCRIBE: "Upload (Scribe)",
  UNKNOWN: "Unknown",
};

/**
 * Scribe summary-generation failures — the failure rate (FAILED / terminal) and
 * its trend, a single unified per-failure breakdown (audio lifecycle + pipeline
 * reason), and whether failures are recoverable (retryable). Derived from the
 * `chats` table; not language-scoped.
 */
export const ScribeSummaryFailureTab = ({ range }: { range: AnalyticsRange }) => {
  const { data, isLoading, isError, refetch } = useGetScribeSummaryFailuresQuery({
    range,
  });
  const loading = isLoading && !data;
  const bucketTitle = BUCKET_TITLE[data?.bucket ?? ""] ?? "Period";

  const rateData = useMemo(
    () =>
      (data?.failureRateTrend ?? []).map(p => ({
        group: "Failure rate",
        key: p.bucket,
        value: parseFloat((p.failureRate * 100).toFixed(1)),
      })),
    [data],
  );
  const retryableData = useMemo(
    () =>
      (data?.retryableBreakdown ?? [])
        .filter(o => o.count > 0)
        .map(o => ({
          group: o.key === "retryable" ? "Retryable" : "Terminal",
          value: o.count,
        })),
    [data],
  );
  const modeData = useMemo(
    () =>
      (data?.failuresByMode ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: MODE_LABELS[o.key] ?? o.key, value: o.count })),
    [data],
  );
  const breakdown = data?.failureBreakdown ?? [];
  const breakdownMax = Math.max(...breakdown.map(b => b.count), 1);

  const s = data?.summary;
  const kpis = [
    { label: "Summary failure rate", value: s ? `${s.failureRatePct}%` : "—" },
    { label: "Total failed", value: s ? s.totalFailed.toLocaleString() : "—" },
    { label: "Retryable share", value: s ? `${s.retryableSharePct}%` : "—" },
    { label: "Timeout share", value: s ? `${s.timeoutSharePct}%` : "—" },
  ];

  if (isError) {
    return (
      <ChartCard
        error
        onRetry={refetch}
        errorTitle="Couldn't load summary-failure analytics"
        errorSubtitle="There was a problem fetching scribe failure metrics."
      >
        <div />
      </ChartCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
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
          loading={loading}
          wide
          empty={!data?.failureRateTrend?.length}
        >
          <LineChart
            data={rateData}
            options={lineOpts({
              leftTitle: "Failure rate %",
              bottomTitle: bucketTitle,
              colorScale: { "Failure rate": PALETTE.red },
              legend: false,
            })}
          />
        </ChartCard>
        <ChartCard
          title="Failure breakdown"
          caption="One bucket per failure — audio lifecycle state first, then pipeline reason"
          loading={loading}
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
          title="Failures by session mode"
          caption="DICTATION = live recording; SCRIBE = uploaded file"
          loading={loading}
          empty={!modeData.length}
        >
          <DonutChart
            data={modeData}
            options={donutOpts({
              centerLabel: "Failures",
              extra: {
                color: {
                  scale: {
                    "Live (Dictation)": PALETTE.magenta,
                    "Upload (Scribe)": PALETTE.blue,
                    Unknown: PALETTE.gray,
                  },
                },
              },
            })}
          />
        </ChartCard>
        <ChartCard
          title="Retryable vs terminal"
          caption="Failures with a saved transcript can be retried"
          loading={loading}
          empty={!retryableData.length}
        >
          <DonutChart
            data={retryableData}
            options={donutOpts({
              centerLabel: "Failures",
              extra: {
                color: {
                  scale: { Retryable: PALETTE.gold, Terminal: PALETTE.darkRed },
                },
              },
            })}
          />
        </ChartCard>
      </div>
    </div>
  );
};
