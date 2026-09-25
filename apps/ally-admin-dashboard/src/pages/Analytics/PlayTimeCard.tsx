import { useMemo, useState } from "react";

import { LineChart } from "@carbon/charts-react";

import { useGetAnalyticsHighlightsQuery } from "@api";

import { asOf, windowLabel } from "./analyticsFilters";
import {
  GROUPINGS,
  bucketTitle,
  grainAsBucket,
  groupingNote,
  inProgressCaption,
  isInProgress,
  withoutInProgress,
} from "./analyticsGrouping";
import { defaultControlsFor, useChartControls } from "./chartControls";
import { ChartDetailModal } from "./ChartDetailModal";
import { ChartCard, GroupingPicker, ScrollableChart, buildSource, lineOpts } from "./chartKit";
import {
  PLAY_TIME_SCALE,
  buildPlayTimeSeries,
  formatKpi,
  totalPlayTimeSessions,
} from "./highlightsChart";

type ChartId = "playTime";

const TITLE = "Average simulation play time";

/**
 * Mean / median / p95 length of one completed simulation (AAQ-026) —
 * relocated to Highlights → Priority from Platform's "Engagement" section,
 * reading the same `highlights` endpoint and `playTime` series.
 *
 * Platform-wide and all-time by construction, like the rest of Priority; on
 * Platform it followed the page's tenant filter. All-time swaps the lines for
 * a KPI tile backed by `summary.avgPlayTimeMinutes` — a server-side
 * whole-window mean, not a mean of the per-bucket means (which would weight a
 * quiet period like a busy one).
 */
export const PlayTimeCard = () => {
  const { controlsFor, setGrain, hydrating } = useChartControls<ChartId>(
    "goals.playTime",
    defaultControlsFor(["playTime"]),
  );
  const grain = controlsFor("playTime").grain;
  const isAllTime = grain === "allTime";

  const { data, isLoading, isError, refetch } = useGetAnalyticsHighlightsQuery(
    { range: "all", bucket: grainAsBucket(grain) },
    { skip: hydrating },
  );
  const [expanded, setExpanded] = useState(false);

  const points = useMemo(() => data?.playTime ?? [], [data]);
  const inProgress = data?.window.inProgressBucket;
  const series = useMemo(
    () => buildPlayTimeSeries(withoutInProgress(points, p => p.bucket, inProgress)),
    [points, inProgress],
  );
  const sessions = useMemo(() => totalPlayTimeSessions(points), [points]);
  const avgMinutes = data?.summary.avgPlayTimeMinutes;

  const opts = useMemo(
    () =>
      lineOpts({
        leftTitle: "Minutes per session",
        bottomTitle: bucketTitle(grain),
        colorScale: PLAY_TIME_SCALE,
      }),
    [grain],
  );

  const loading = hydrating || (isLoading && !data);

  const source = buildSource({
    derivation: "scenario_session_details.callDuration over COMPLETED sessions, net of paused time",
    window: windowLabel(data?.window),
    n: sessions,
    nUnit: "timed sessions",
    extra: isAllTime ? "Platform-wide" : `Platform-wide · ${groupingNote(grain)}`,
    asOf: asOf(data?.window),
  });

  const rowKey = (bucket: string) =>
    isInProgress(bucket, inProgress) ? `${bucket} (in progress)` : bucket;

  return (
    <>
      <ChartCard
        title={TITLE}
        caption={`How long one simulation lasts, platform-wide. The mean is the headline; the median and p95 are there because session length is skewed — a few very long sittings pull an average away from the typical session. Breaks in the lines are periods with no completed session, not zero-length ones.${inProgressCaption(
          grain,
          inProgress,
        )}`}
        collapseMeta
        source={source}
        takeaway={
          avgMinutes !== null && avgMinutes !== undefined
            ? `${avgMinutes} min per simulation on average, all time`
            : undefined
        }
        loading={loading}
        error={isError}
        onRetry={refetch}
        empty={!loading && !isAllTime && series.every(d => d.value === null)}
        controls={
          <GroupingPicker
            id="goals-play-time-grain"
            value={grain}
            onChange={g => setGrain("playTime", g)}
            options={GROUPINGS}
          />
        }
        onExpand={() => setExpanded(true)}
        kpi={
          isAllTime
            ? {
                label: TITLE,
                description: "Mean length of one completed simulation, all time, platform-wide.",
                value: formatKpi(avgMinutes, { suffix: " min" }),
                n: sessions,
                nUnit: "timed sessions",
                loading,
                error: isError,
                onRetry: refetch,
              }
            : undefined
        }
        chartId="AAQ-026"
      >
        <ScrollableChart data={series}>
          <LineChart data={series} options={opts} />
        </ScrollableChart>
      </ChartCard>

      {expanded && (
        <ChartDetailModal
          open={expanded}
          onClose={() => setExpanded(false)}
          title={TITLE}
          caption="Mean, median and p95 length of one completed simulation. Where the mean sits well above the median, a minority of long sittings is carrying it."
          source={source}
          table={{
            columns: [bucketTitle(grain), "Mean (min)", "Median (min)", "p95 (min)", "Sessions"],
            rows: points.map(p => [
              rowKey(p.bucket),
              p.avgMinutes ?? "—",
              p.medianMinutes ?? "—",
              p.p95Minutes ?? "—",
              p.sessions,
            ]),
          }}
          exportContext={[
            "Window: all time · platform-wide",
            groupingNote(grain),
            `Timed sessions: ${sessions}`,
          ]}
          render={({ height }) => (
            <ScrollableChart data={series}>
              <LineChart data={series} options={{ ...opts, height }} />
            </ScrollableChart>
          )}
        />
      )}
    </>
  );
};
