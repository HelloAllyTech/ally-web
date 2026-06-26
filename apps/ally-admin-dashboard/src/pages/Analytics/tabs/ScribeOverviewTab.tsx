import { useMemo } from "react";

import { DonutChart, LineChart } from "@carbon/charts-react";
import { Tile } from "@carbon/react";

import { useGetScribeOverviewQuery } from "@api";
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
const MODE_LABELS: Record<string, string> = {
  SCRIBE: "Upload (Scribe)",
  DICTATION: "Live (Dictation)",
};

/**
 * Scribe-session overview — volume, summary success rate, outcome mix and
 * mode split. Derived from the `chats` table (real counselor sessions), so it
 * is not language-scoped; only the shared time range applies.
 */
export const ScribeOverviewTab = ({ range }: { range: AnalyticsRange }) => {
  const { data, isLoading, isError, refetch } = useGetScribeOverviewQuery({ range });
  const loading = isLoading && !data;
  const bucketTitle = BUCKET_TITLE[data?.bucket ?? ""] ?? "Period";

  const sessionsData = useMemo(
    () =>
      (data?.sessionsTrend ?? []).map(p => ({
        group: "Sessions",
        key: p.bucket,
        value: p.count,
      })),
    [data],
  );
  const outcomeData = useMemo(
    () =>
      (data?.outcomeBreakdown ?? [])
        .filter(o => o.count > 0)
        .map(o => ({ group: OUTCOME_LABELS[o.key] ?? o.key, value: o.count })),
    [data],
  );
  const modeData = useMemo(
    () =>
      (data?.modeBreakdown ?? [])
        .filter(m => m.count > 0)
        .map(m => ({ group: MODE_LABELS[m.key] ?? m.key, value: m.count })),
    [data],
  );

  const s = data?.summary;
  const kpis = [
    { label: "Total sessions", value: s ? s.totalSessions.toLocaleString() : "—" },
    { label: "Summary success rate", value: s ? `${s.successRatePct}%` : "—" },
    { label: "Processing", value: s ? s.processing.toLocaleString() : "—" },
    { label: "Failed", value: s ? s.failed.toLocaleString() : "—" },
    { label: "No audio", value: s ? s.noAudio.toLocaleString() : "—" },
  ];

  if (isError) {
    return (
      <ChartCard
        error
        onRetry={refetch}
        errorTitle="Couldn't load scribe analytics"
        errorSubtitle="There was a problem fetching scribe session metrics."
      >
        <div />
      </ChartCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map(kpi => (
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
          loading={loading}
          wide
          empty={!data?.sessionsTrend?.length}
        >
          <LineChart
            data={sessionsData}
            options={lineOpts({
              leftTitle: "Sessions",
              bottomTitle: bucketTitle,
              colorScale: { Sessions: PALETTE.blue },
              legend: false,
              extra: { points: { enabled: false } },
            })}
          />
        </ChartCard>
        <ChartCard
          title="Outcome breakdown"
          caption="Sessions by summary status"
          loading={loading}
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
          title="Session mode"
          caption="Uploaded recordings vs live dictation"
          loading={loading}
          empty={!modeData.length}
        >
          <DonutChart
            data={modeData}
            options={donutOpts({
              centerLabel: "Sessions",
              extra: {
                color: {
                  scale: {
                    "Upload (Scribe)": PALETTE.purple,
                    "Live (Dictation)": PALETTE.teal,
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
