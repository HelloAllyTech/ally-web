import { useMemo } from "react";

import { DonutChart, LineChart, SimpleBarChart } from "@carbon/charts-react";
import { Tile } from "@carbon/react";

import { useGetScribeSummaryFailuresQuery } from "@api";
import { AnalyticsRange } from "@types";

import { ChartCard, PALETTE, barOpts, donutOpts, lineOpts } from "../chartKit";

const BUCKET_TITLE: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** Friendlier labels for the pipeline-stage values written to chat metadata. */
const STAGE_LABELS: Record<string, string> = {
  transcribe: "Transcription",
  diarize: "Diarization",
  summarize: "Summarization",
  "summary-timeout": "Timed out",
  "transcribe-result": "Delivery",
  deliver: "Delivery",
  "dead-letter": "Dead-letter (retries exhausted)",
  "transcription-request-dlq": "Dead-letter (request)",
  "transcription-response-dlq": "Dead-letter (delivery)",
  "other-error": "Other error",
  unknown: "Unknown",
};

/**
 * Scribe summary-generation failures — the failure rate (FAILED / terminal),
 * its trend, and where failures happen (stage), whether they're recoverable
 * (retryable) and whether the summary timeout caused them. Derived from the
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
  const stageData = useMemo(
    () =>
      (data?.failuresByStage ?? []).map(o => ({
        group: STAGE_LABELS[o.key] ?? o.key,
        value: o.count,
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
  const timeoutData = useMemo(
    () =>
      (data?.timeoutBreakdown ?? [])
        .filter(o => o.count > 0)
        .map(o => ({
          group: o.key === "timeout" ? "Summary timeout" : "Other error",
          value: o.count,
        })),
    [data],
  );

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
          title="Top failure reasons"
          caption="Actual error text on failed sessions (first 80 chars), most frequent first"
          loading={loading}
          wide
          empty={!data?.topFailureReasons?.length}
        >
          <div className="flex flex-col gap-2">
            {(data?.topFailureReasons ?? []).map(r => {
              const max = Math.max(...(data?.topFailureReasons ?? []).map(x => x.count), 1);
              return (
                <div key={r.key} className="flex items-center gap-3">
                  <div
                    className="text-sm text-typography-900 truncate"
                    style={{ flex: "0 0 60%" }}
                    title={r.key}
                  >
                    {r.key}
                  </div>
                  <div className="flex-1 h-3 rounded" style={{ background: "#f0f0f0" }}>
                    <div
                      className="h-3 rounded"
                      style={{
                        width: `${Math.round((r.count / max) * 100)}%`,
                        background: PALETTE.red,
                      }}
                    />
                  </div>
                  <div className="text-sm font-medium text-typography-900 w-10 text-right">
                    {r.count}
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
        <ChartCard
          title="Failures by stage"
          caption="Where in the pipeline failures occur"
          loading={loading}
          empty={!stageData.length}
        >
          <SimpleBarChart
            data={stageData}
            options={barOpts({
              leftTitle: "Failures",
              bottomTitle: "Stage",
              colorScale: { Failures: PALETTE.orange },
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
        <ChartCard
          title="Timeout vs other error"
          caption="Failures caused by the summary timeout vs other reasons"
          loading={loading}
          empty={!timeoutData.length}
        >
          <DonutChart
            data={timeoutData}
            options={donutOpts({
              centerLabel: "Failures",
              extra: {
                color: {
                  scale: {
                    "Summary timeout": PALETTE.magenta,
                    "Other error": PALETTE.gray,
                  },
                },
              },
            })}
          />
        </ChartCard>
      </div>
    </div>
  );
};
